package code

import (
	"context"
	"log"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const NodeType = "code"

type Executor struct {
	logger *log.Logger
}

func New(logger *log.Logger) *Executor {
	return &Executor{logger: logger}
}

func (nodeExecutor *Executor) Execute(
	_ context.Context,
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

	return protocol.NewSucceededResult(
		executor.ResultIdentity(command),
		map[string]any{"result": map[string]any{}},
		[]string{"result"},
	), nil
}
