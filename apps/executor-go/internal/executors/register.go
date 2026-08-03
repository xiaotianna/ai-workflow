package executors

import (
	"log"

	"node-executor-go/internal/executor"
	codeexecutor "node-executor-go/internal/executors/code"
	conditionexecutor "node-executor-go/internal/executors/condition"
	httpexecutor "node-executor-go/internal/executors/http"
	llmexecutor "node-executor-go/internal/executors/llm"
	ragexecutor "node-executor-go/internal/executors/rag"
)

func RegisterBuiltins(registry *executor.Registry, logger *log.Logger) {
	registry.Register(llmexecutor.NodeType, llmexecutor.New(logger))
	registry.Register(ragexecutor.NodeType, ragexecutor.New(logger))
	registry.Register(codeexecutor.NodeType, codeexecutor.New(logger))
	registry.Register(httpexecutor.NodeType, httpexecutor.New(logger))
	registry.Register(conditionexecutor.NodeType, conditionexecutor.New(logger))
}
