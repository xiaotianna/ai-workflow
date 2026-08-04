package condition

import (
	"context"
	"log"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const NodeType = "condition"

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
	config, failure := parseNodeConfig(command.Config)
	if failure != nil {
		return executor.FailedResult(command, failure), nil
	}

	activatedHandle := resolveBranch(config)
	nodeExecutor.logger.Printf(
		"condition execute commandId=%s runId=%s nodeRunId=%s nodeId=%s attempt=%d activatedHandle=%s",
		command.CommandID,
		command.RunID,
		command.NodeRunID,
		command.NodeID,
		command.Attempt,
		activatedHandle,
	)

	activatedHandles := []string{}
	if activatedHandle != "" {
		activatedHandles = append(activatedHandles, activatedHandle)
	}

	return protocol.NewSucceededResult(
		executor.ResultIdentity(command),
		map[string]any{},
		activatedHandles,
	), nil
}
