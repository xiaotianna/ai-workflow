package code

import (
	"context"

	"node-executor-go/internal/executor"
)

type codeExecutionRequest struct {
	Source string
	Inputs map[string]any
}

type codeRunner interface {
	Execute(
		ctx context.Context,
		request codeExecutionRequest,
	) (map[string]any, *executor.ExecutionFailure)
}
