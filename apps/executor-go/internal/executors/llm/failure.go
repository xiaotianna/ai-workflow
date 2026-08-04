package llm

import (
	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

type ExecutionFailure = executor.ExecutionFailure

func applyFailure(
	command protocol.ExecuteNodeCommand,
	config NodeConfig,
	failure *ExecutionFailure,
) protocol.ExecuteNodeResult {
	return executor.ApplyFailure(command, config.ErrorHandling, "result", "result", failure)
}

func failedWithoutConfig(
	command protocol.ExecuteNodeCommand,
	failure *ExecutionFailure,
) protocol.ExecuteNodeResult {
	return executor.FailedResult(command, failure)
}
