package code

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"

	"node-executor-go/internal/executor"
)

const (
	sandboxBackendProcess = "process"
	sandboxBackendRemote  = "remote"
)

type codeExecutionRequest struct {
	CommandID  string
	DeadlineAt string
	Source     string
	Inputs     map[string]any
}

type codeRunner interface {
	Execute(
		ctx context.Context,
		request codeExecutionRequest,
	) (map[string]any, *executor.ExecutionFailure)
}

func newCodeRunnerFromEnvironment() (codeRunner, error) {
	backend := strings.ToLower(strings.TrimSpace(os.Getenv("CODE_SANDBOX_BACKEND")))
	if backend == "" {
		// 默认保留已有本地 Node 子进程行为，分类部署可以再显式切换 remote。
		backend = sandboxBackendProcess
	}

	requireRemote, err := optionalBoolEnvironment("CODE_SANDBOX_REQUIRE_REMOTE")
	if err != nil {
		return nil, err
	}
	if requireRemote && backend != sandboxBackendRemote {
		return nil, fmt.Errorf("CODE_SANDBOX_REQUIRE_REMOTE 已启用，不能使用 %s 后端", backend)
	}

	switch backend {
	case sandboxBackendProcess:
		return newNodeJSProcessRunner()
	case sandboxBackendRemote:
		return newRemoteSandboxRunnerFromEnvironment()
	default:
		return nil, fmt.Errorf("未知 CODE_SANDBOX_BACKEND：%s", backend)
	}
}

func optionalBoolEnvironment(key string) (bool, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return false, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("%s 必须是布尔值", key)
	}
	return parsed, nil
}
