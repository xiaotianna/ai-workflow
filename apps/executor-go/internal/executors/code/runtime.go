package code

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"node-executor-go/internal/executor"
)

const (
	// Node 子进程资源限制和进程间协议参数
	nodeDefaultBinary          = "node"
	nodeMainExportName         = "__aiWorkflowMain_6f7dd58d"
	nodeSandboxDirectoryPrefix = "ai-workflow-code-node-"
	nodeMaxHeapMegabytes       = 64
	nodeMaxStackKilobytes      = 1024
	nodeMaxStderrBytes         = 64 * 1024
	nodeMaxEnvelopeBytes       = 64 * 1024
)

//go:embed runner.mjs
var nodeRunnerSource []byte

// javaScriptSandbox 统一约束代码执行器的输入输出和错误模型
type javaScriptSandbox interface {
	Execute(
		ctx context.Context,
		source string,
		inputs map[string]any,
	) (map[string]any, *executor.ExecutionFailure)
}

type nodeJSSandbox struct {
	binary           string
	nodeModulesPath  string
	configurationErr error
}

type nodeExecutionEnvelope struct {
	Status  string              `json:"status"`
	Outputs json.RawMessage     `json:"outputs,omitempty"`
	Error   *nodeExecutionError `json:"error,omitempty"`
}

type nodeExecutionError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Stack   string `json:"stack,omitempty"`
}

type cappedBuffer struct {
	buffer bytes.Buffer
	limit  int
}

// Write 只保留限制范围内的标准错误内容并向进程报告完整写入长度
func (buffer *cappedBuffer) Write(data []byte) (int, error) {
	writtenLength := len(data)
	remaining := buffer.limit - buffer.buffer.Len()
	if remaining > 0 {
		if len(data) > remaining {
			data = data[:remaining]
		}
		_, _ = buffer.buffer.Write(data)
	}
	return writtenLength, nil
}

func (buffer *cappedBuffer) String() string {
	return buffer.buffer.String()
}

func newJavaScriptSandbox() javaScriptSandbox {
	// 第三方包目录和 Node 命令只在执行器初始化时解析一次
	nodeModulesPath, err := resolveNodeModulesPath()
	binary := strings.TrimSpace(os.Getenv("CODE_NODE_BINARY"))
	if binary == "" {
		binary = nodeDefaultBinary
	}

	return &nodeJSSandbox{
		binary:           binary,
		nodeModulesPath:  nodeModulesPath,
		configurationErr: err,
	}
}

func (sandbox *nodeJSSandbox) Execute(
	ctx context.Context,
	source string,
	inputs map[string]any,
) (outputs map[string]any, failure *executor.ExecutionFailure) {
	// 防止执行器自身异常越过协议边界导致 Worker 崩溃
	defer func() {
		if recovered := recover(); recovered != nil {
			outputs = nil
			failure = internalFailure(formatJavaScriptMessage(
				"Node.js ESM 执行器异常",
				fmt.Sprint(recovered),
			))
		}
	}()

	if sandbox.configurationErr != nil {
		return nil, internalFailure(formatJavaScriptMessage(
			"Node.js ESM 执行器配置无效",
			sandbox.configurationErr.Error(),
		))
	}

	// 每次运行使用独立临时目录隔离源码 输入和结果文件
	sandboxDirectory, err := os.MkdirTemp("", nodeSandboxDirectoryPrefix)
	if err != nil {
		return nil, internalFailure("Node.js ESM 临时目录创建失败")
	}
	defer func() {
		_ = os.RemoveAll(sandboxDirectory)
	}()

	paths, failure := prepareNodeExecutionFiles(
		sandboxDirectory,
		source,
		inputs,
		sandbox.nodeModulesPath,
	)
	if failure != nil {
		return nil, failure
	}

	// 使用真实 Node ESM 进程执行 runner 并通过 context 控制生命周期
	command := exec.CommandContext(
		ctx,
		sandbox.binary,
		"--no-warnings",
		fmt.Sprintf("--max-old-space-size=%d", nodeMaxHeapMegabytes),
		fmt.Sprintf("--stack_size=%d", nodeMaxStackKilobytes),
		paths.runner,
		paths.userModule,
		paths.inputs,
		paths.result,
		strconv.Itoa(maxOutputJSONSize),
	)
	command.Dir = sandboxDirectory
	command.Env = nodeRuntimeEnvironment(sandboxDirectory)
	command.Stdout = io.Discard
	stderr := &cappedBuffer{limit: nodeMaxStderrBytes}
	command.Stderr = stderr
	configureNodeProcess(command)

	runErr := command.Run()
	if interruptedFailure := interruptedNodeFailure(ctx); interruptedFailure != nil {
		return nil, interruptedFailure
	}

	// runner 始终通过结果文件返回成功输出或结构化错误
	resultData, resultErr := readNodeExecutionResult(paths.result)
	if resultErr != nil {
		if runErr != nil {
			return nil, nodeProcessFailure(runErr, stderr.String())
		}
		return nil, internalFailure(formatJavaScriptMessage(
			"Node.js ESM 执行结果读取失败",
			resultErr.Error(),
		))
	}

	return decodeNodeExecutionResult(resultData)
}

type nodeExecutionPaths struct {
	runner     string
	userModule string
	inputs     string
	result     string
}

func prepareNodeExecutionFiles(
	directory string,
	source string,
	inputs map[string]any,
	nodeModulesPath string,
) (nodeExecutionPaths, *executor.ExecutionFailure) {
	paths := nodeExecutionPaths{
		runner:     filepath.Join(directory, "runner.mjs"),
		userModule: filepath.Join(directory, "user-code.mjs"),
		inputs:     filepath.Join(directory, "inputs.json"),
		result:     filepath.Join(directory, "result.json"),
	}

	serializedInputs, err := json.Marshal(inputs)
	if err != nil {
		return nodeExecutionPaths{}, internalFailure("Code 节点输入无法序列化")
	}

	// 追加内部别名让 runner 能稳定获取 main 且不占用用户导出名称
	userModule := source + "\nexport { main as " + nodeMainExportName + " };\n"
	files := []struct {
		path    string
		content []byte
	}{
		{path: paths.runner, content: nodeRunnerSource},
		{path: paths.userModule, content: []byte(userModule)},
		{path: paths.inputs, content: serializedInputs},
	}

	for _, file := range files {
		if err := os.WriteFile(file.path, file.content, 0o400); err != nil {
			return nodeExecutionPaths{}, internalFailure("Node.js ESM 执行文件创建失败")
		}
	}

	// 把执行器依赖目录挂载到临时目录以支持第三方 ESM 包解析
	if nodeModulesPath != "" {
		if err := os.Symlink(nodeModulesPath, filepath.Join(directory, "node_modules")); err != nil {
			return nodeExecutionPaths{}, internalFailure(formatJavaScriptMessage(
				"Node.js 依赖目录挂载失败",
				err.Error(),
			))
		}
	}

	return paths, nil
}

func readNodeExecutionResult(path string) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = file.Close()
	}()

	// 在读取阶段限制结果体避免异常 runner 绕过输出大小约束
	data, err := io.ReadAll(io.LimitReader(file, maxOutputJSONSize+nodeMaxEnvelopeBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxOutputJSONSize+nodeMaxEnvelopeBytes {
		return nil, fmt.Errorf("执行结果超过协议大小限制")
	}
	return data, nil
}

func decodeNodeExecutionResult(data []byte) (map[string]any, *executor.ExecutionFailure) {
	var envelope nodeExecutionEnvelope
	// 拒绝协议之外的字段防止 Go 和 runner 的结果契约静默漂移
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&envelope); err != nil {
		return nil, internalFailure(formatJavaScriptMessage(
			"Node.js ESM 执行结果格式无效",
			err.Error(),
		))
	}

	switch envelope.Status {
	case "SUCCEEDED":
		if envelope.Error != nil || len(envelope.Outputs) == 0 {
			return nil, internalFailure("Node.js ESM 成功结果缺少输出")
		}

		var outputs map[string]any
		if err := json.Unmarshal(envelope.Outputs, &outputs); err != nil || outputs == nil {
			return nil, &executor.ExecutionFailure{
				Code:      "CODE_OUTPUT_INVALID",
				Message:   "JavaScript main 函数返回值不是有效 JSON 对象",
				Retryable: false,
			}
		}
		return outputs, nil
	case "FAILED":
		if envelope.Error == nil || strings.TrimSpace(envelope.Error.Code) == "" {
			return nil, internalFailure("Node.js ESM 失败结果缺少错误信息")
		}

		details := map[string]any(nil)
		if stack := strings.TrimSpace(envelope.Error.Stack); stack != "" {
			details = map[string]any{"stack": truncateText(stack, 8_000)}
		}
		return nil, &executor.ExecutionFailure{
			Code:      envelope.Error.Code,
			Message:   truncateText(strings.TrimSpace(envelope.Error.Message), 1_000),
			Retryable: false,
			Details:   details,
		}
	default:
		return nil, internalFailure("Node.js ESM 执行结果状态无效")
	}
}

func resolveNodeModulesPath() (string, error) {
	// 显式配置优先以适配容器和独立部署目录
	configuredPath := strings.TrimSpace(os.Getenv("CODE_NODE_MODULES_PATH"))
	if configuredPath != "" {
		return validateNodeModulesPath(configuredPath)
	}

	// 本地开发时从启动目录逐级查找最近的 node_modules
	currentDirectory, err := os.Getwd()
	if err != nil {
		return "", nil
	}
	for {
		candidate := filepath.Join(currentDirectory, "node_modules")
		if info, statErr := os.Stat(candidate); statErr == nil && info.IsDir() {
			return filepath.Abs(candidate)
		}

		parent := filepath.Dir(currentDirectory)
		if parent == currentDirectory {
			return "", nil
		}
		currentDirectory = parent
	}
}

func validateNodeModulesPath(path string) (string, error) {
	absolutePath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(absolutePath)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return "", fmt.Errorf("%s 不是目录", absolutePath)
	}
	return absolutePath, nil
}

func nodeRuntimeEnvironment(sandboxDirectory string) []string {
	// 仅透传 Node 运行必需项避免用户代码读取 Worker 私密环境变量
	allowedKeys := [...]string{
		"PATH",
		"LANG",
		"LC_ALL",
		"TZ",
		"NODE_EXTRA_CA_CERTS",
		"SSL_CERT_FILE",
		"SSL_CERT_DIR",
		"HTTP_PROXY",
		"HTTPS_PROXY",
		"NO_PROXY",
	}
	environment := make([]string, 0, len(allowedKeys)+5)
	for _, key := range allowedKeys {
		if value, exists := os.LookupEnv(key); exists {
			environment = append(environment, key+"="+value)
		}
	}

	return append(
		environment,
		"NODE_ENV=production",
		"HOME="+sandboxDirectory,
		"TMPDIR="+sandboxDirectory,
		"TMP="+sandboxDirectory,
		"TEMP="+sandboxDirectory,
	)
}

func configureNodeProcess(command *exec.Cmd) {
	// 独立进程组确保超时或取消时一并终止用户创建的子进程
	command.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	command.Cancel = func() error {
		if command.Process == nil {
			return os.ErrProcessDone
		}
		err := syscall.Kill(-command.Process.Pid, syscall.SIGKILL)
		if errors.Is(err, syscall.ESRCH) {
			return os.ErrProcessDone
		}
		return err
	}
	command.WaitDelay = 2 * time.Second
}

func interruptedNodeFailure(ctx context.Context) *executor.ExecutionFailure {
	// context 状态优先于进程退出错误以保留准确的超时和取消语义
	switch {
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return &executor.ExecutionFailure{
			Code:      "CODE_EXECUTION_TIMEOUT",
			Message:   "Code 节点执行超时",
			Retryable: false,
		}
	case errors.Is(ctx.Err(), context.Canceled):
		return &executor.ExecutionFailure{
			Code:      "CODE_EXECUTION_CANCELLED",
			Message:   "Code 节点执行已取消",
			Retryable: false,
		}
	default:
		return nil
	}
}

func nodeProcessFailure(runErr error, stderr string) *executor.ExecutionFailure {
	// 将 Node 启动阶段错误映射为稳定的工作流错误码
	message := strings.TrimSpace(stderr)
	if message == "" {
		message = runErr.Error()
	}
	lowerMessage := strings.ToLower(message)

	switch {
	case errors.Is(runErr, exec.ErrNotFound) || strings.Contains(lowerMessage, "executable file not found"):
		return &executor.ExecutionFailure{
			Code:      "CODE_NODE_RUNTIME_UNAVAILABLE",
			Message:   "Code 节点需要 Node.js 22 或更高版本",
			Retryable: false,
		}
	case isNodeResourceError(runErr, lowerMessage):
		return &executor.ExecutionFailure{
			Code:      "CODE_RESOURCE_LIMIT_EXCEEDED",
			Message:   "Code 节点超过 Node.js 内存或调用栈限制",
			Retryable: false,
		}
	case strings.Contains(message, "ERR_MODULE_NOT_FOUND"):
		return &executor.ExecutionFailure{
			Code:      "CODE_MODULE_NOT_FOUND",
			Message:   formatJavaScriptMessage("加载 JavaScript ESM 模块失败", message),
			Retryable: false,
		}
	case strings.Contains(message, "SyntaxError"):
		return &executor.ExecutionFailure{
			Code:      "CODE_SYNTAX_ERROR",
			Message:   formatJavaScriptMessage("JavaScript ESM 语法错误", message),
			Retryable: false,
		}
	default:
		return &executor.ExecutionFailure{
			Code:      "CODE_RUNTIME_ERROR",
			Message:   formatJavaScriptMessage("Node.js ESM 进程执行失败", message),
			Retryable: false,
		}
	}
}

func isNodeResourceError(runErr error, lowerMessage string) bool {
	resourceErrors := [...]string{
		"heap out of memory",
		"allocation failed",
		"javascript heap",
		"maximum call stack size exceeded",
		"signal: killed",
	}
	for _, resourceError := range resourceErrors {
		if strings.Contains(lowerMessage, resourceError) || strings.Contains(strings.ToLower(runErr.Error()), resourceError) {
			return true
		}
	}
	return false
}

func formatJavaScriptMessage(prefix string, message string) string {
	message = truncateText(strings.TrimSpace(message), 1_000)
	if message == "" {
		return prefix
	}
	return fmt.Sprintf("%s：%s", prefix, message)
}

func truncateText(value string, maxLength int) string {
	runes := []rune(value)
	if len(runes) <= maxLength {
		return value
	}
	return string(append(runes[:maxLength], '…'))
}

func internalFailure(message string) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{
		Code:      "CODE_EXECUTOR_INTERNAL_ERROR",
		Message:   message,
		Retryable: false,
	}
}
