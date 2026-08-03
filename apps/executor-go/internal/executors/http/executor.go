package http

import (
	"context"
	"log"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const NodeType = "http"

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
		"http mock execute commandId=%s runId=%s nodeRunId=%s nodeId=%s attempt=%d",
		command.CommandID,
		command.RunID,
		command.NodeRunID,
		command.NodeID,
		command.Attempt,
	)

	return protocol.NewSucceededResult(
		executor.ResultIdentity(command),
		map[string]any{
			"__mockExecutor": true,
			"response":       map[string]any{"status": 200, "mock": true},
		},
		[]string{"response"},
	), nil
}
