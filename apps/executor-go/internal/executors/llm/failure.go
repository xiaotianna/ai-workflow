package llm

import (
	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

type ExecutionFailure struct {
	Code      string
	Message   string
	Retryable bool
	Details   map[string]any
}

func applyFailure(
	command protocol.ExecuteNodeCommand,
	config NodeConfig,
	failure *ExecutionFailure,
) protocol.ExecuteNodeResult {
	identity := executor.ResultIdentity(command)

	switch config.ErrorHandling.Mode {
	case errorHandlingDefaultValue:
		return protocol.NewSucceededResult(
			identity,
			map[string]any{"result": config.ErrorHandling.DefaultValue},
			[]string{"result"},
		)
	case errorHandlingErrorBranch:
		return protocol.NewSucceededResult(identity, map[string]any{}, []string{"error"})
	default:
		return protocol.NewFailedResult(
			identity,
			protocol.NodeExecutionError{
				Code:      failure.Code,
				Message:   failure.Message,
				Retryable: failure.Retryable,
				Details:   failure.Details,
			},
		)
	}
}

func failedWithoutConfig(
	command protocol.ExecuteNodeCommand,
	failure *ExecutionFailure,
) protocol.ExecuteNodeResult {
	return protocol.NewFailedResult(
		executor.ResultIdentity(command),
		protocol.NodeExecutionError{
			Code:      failure.Code,
			Message:   failure.Message,
			Retryable: failure.Retryable,
			Details:   failure.Details,
		},
	)
}
