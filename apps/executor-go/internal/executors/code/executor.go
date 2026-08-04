package code

import (
	"context"
	"log"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const (
	NodeType          = "code"
	resultOutputKey   = "result"
	maxSourceBytes    = 256 * 1024
	maxOutputJSONSize = 4 * 1024 * 1024
)

type Executor struct {
	logger  *log.Logger
	sandbox javaScriptSandbox
}

func New(logger *log.Logger) *Executor {
	return &Executor{
		logger:  logger,
		sandbox: newJavaScriptSandbox(),
	}
}

func (nodeExecutor *Executor) Execute(
	ctx context.Context,
	command protocol.ExecuteNodeCommand,
) (protocol.ExecuteNodeResult, error) {
	nodeExecutor.logger.Printf(
		"code execute commandId=%s runId=%s nodeRunId=%s nodeId=%s attempt=%d",
		command.CommandID,
		command.RunID,
		command.NodeRunID,
		command.NodeID,
		command.Attempt,
	)

	config, failure := parseNodeConfig(command.Config)
	if failure != nil {
		return executor.FailedResult(command, failure), nil
	}

	outputs, failure := nodeExecutor.sandbox.Execute(ctx, config.Code, command.Inputs)
	if failure != nil {
		return executor.ApplyFailure(
			command,
			config.ErrorHandling,
			resultOutputKey,
			resultOutputKey,
			failure,
		), nil
	}

	return protocol.NewSucceededResult(
		executor.ResultIdentity(command),
		outputs,
		[]string{resultOutputKey},
	), nil
}
