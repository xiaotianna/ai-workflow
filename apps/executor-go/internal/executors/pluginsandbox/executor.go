package pluginsandbox

import (
	"context"
	"encoding/json"
	"log"
	"sort"

	"node-executor-go/internal/executor"
	"node-executor-go/internal/sandbox"
	protocol "workflow-protocol"
)

const NodeType = "plugin-sandbox-js"

type Executor struct {
	logger   *log.Logger
	resolver *artifactResolver
	sandbox  sandbox.Runner
}

func New(logger *log.Logger, artifactResolverURL string, internalAuthToken string) (*Executor, error) {
	sandboxClient, err := sandbox.NewProcessRunner()
	if err != nil {
		return nil, err
	}
	resolver, err := newArtifactResolver(artifactResolverURL, internalAuthToken)
	if err != nil {
		return nil, err
	}
	return &Executor{
		logger: logger, resolver: resolver, sandbox: sandboxClient,
	}, nil
}

func (nodeExecutor *Executor) Execute(ctx context.Context, command protocol.ExecuteNodeCommand) (protocol.ExecuteNodeResult, error) {
	nodeExecutor.logger.Printf(
		"plugin sandbox execute commandId=%s runId=%s nodeRunId=%s nodeType=%s attempt=%d",
		command.CommandID, command.RunID, command.NodeRunID, command.NodeType, command.Attempt,
	)
	artifact := command.SandboxArtifact
	if artifact == nil {
		return executor.FailedResult(command, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件执行命令缺少制品引用", false)), nil
	}
	resolved, failure := nodeExecutor.resolver.Resolve(ctx, command)
	if failure != nil {
		return executor.FailedResult(command, failure), nil
	}
	response, err := nodeExecutor.sandbox.Execute(ctx, sandbox.Request{
		Source: resolved.Source,
		Inputs: command.Inputs, Config: command.Config,
		Context:        sandbox.ExecutionContext{WorkflowRunID: command.RunID, NodeRunID: command.NodeRunID, Attempt: command.Attempt},
		MaxOutputBytes: 4 * 1024 * 1024,
	})
	if err != nil {
		return executor.FailedResult(command, pluginFailure("PLUGIN_EXECUTOR_PROCESS_ERROR", "插件本地执行进程异常", true)), nil
	}
	if response.Status == "FAILED" {
		return applyPluginFailure(command, &executor.ExecutionFailure{
			Code: response.Error.Code, Message: response.Error.Message,
			Retryable: response.Error.Retryable, Details: response.Error.Details,
		}), nil
	}
	handles := make([]string, 0, len(response.Outputs))
	for handle := range response.Outputs {
		handles = append(handles, handle)
	}
	sort.Strings(handles)
	return protocol.NewSucceededResult(executor.ResultIdentity(command), response.Outputs, handles), nil
}

func applyPluginFailure(command protocol.ExecuteNodeCommand, failure *executor.ExecutionFailure) protocol.ExecuteNodeResult {
	artifact := command.SandboxArtifact
	if artifact == nil || artifact.ErrorHandlingField == "" {
		return executor.FailedResult(command, failure)
	}
	raw, ok := command.Config[artifact.ErrorHandlingField]
	if !ok {
		return executor.FailedResult(command, failure)
	}
	data, err := json.Marshal(raw)
	if err != nil {
		return executor.FailedResult(command, failure)
	}
	handling, err := executor.ParseErrorHandling(data)
	if err != nil {
		return executor.FailedResult(command, failure)
	}
	switch handling.Mode {
	case executor.ErrorHandlingErrorBranch:
		return protocol.NewSucceededResult(executor.ResultIdentity(command), map[string]any{}, []string{executor.ErrorHandle})
	case executor.ErrorHandlingDefaultValue:
		outputs, ok := handling.DefaultValue.(map[string]any)
		if !ok {
			return executor.FailedResult(command, failure)
		}
		handles := make([]string, 0, len(outputs))
		for handle := range outputs {
			handles = append(handles, handle)
		}
		sort.Strings(handles)
		return protocol.NewSucceededResult(executor.ResultIdentity(command), outputs, handles)
	default:
		return executor.FailedResult(command, failure)
	}
}

func pluginFailure(code string, message string, retryable bool) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{Code: code, Message: message, Retryable: retryable}
}
