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
	activatedHandle := resolveMockBranch(command.Config)
	nodeExecutor.logger.Printf(
		"condition mock execute commandId=%s runId=%s nodeRunId=%s nodeId=%s attempt=%d activatedHandle=%s",
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

func resolveMockBranch(config map[string]any) string {
	conditions, ok := config["conditions"].([]any)
	if !ok {
		return ""
	}

	firstPortID := ""
	for _, value := range conditions {
		condition, ok := value.(map[string]any)
		if !ok {
			continue
		}
		portID, _ := condition["portId"].(string)
		if firstPortID == "" {
			firstPortID = portID
		}
		if isFallback, _ := condition["isFallback"].(bool); isFallback {
			return portID
		}
	}

	return firstPortID
}
