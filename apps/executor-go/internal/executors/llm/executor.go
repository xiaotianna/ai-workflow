package llm

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const NodeType = "llm"

type Executor struct {
	logger    *log.Logger
	resolver  ModelResolver
	providers *ProviderRegistry
}

func New(logger *log.Logger, modelResolverURL string) *Executor {
	httpClient := &http.Client{}
	return &Executor{
		logger:    logger,
		resolver:  NewServerModelResolver(httpClient, modelResolverURL),
		providers: NewBuiltinProviderRegistry(httpClient),
	}
}

func (nodeExecutor *Executor) Execute(
	ctx context.Context,
	command protocol.ExecuteNodeCommand,
) (protocol.ExecuteNodeResult, error) {
	nodeExecutor.logger.Printf(
		"llm execute commandId=%s runId=%s nodeRunId=%s nodeId=%s attempt=%d",
		command.CommandID,
		command.RunID,
		command.NodeRunID,
		command.NodeID,
		command.Attempt,
	)

	config, failure := ParseNodeConfig(command.Config)
	if failure != nil {
		return failedWithoutConfig(command, failure), nil
	}

	model, failure := nodeExecutor.resolver.Resolve(ctx, command)
	if failure != nil {
		return applyFailure(command, config, failure), nil
	}
	provider, exists := nodeExecutor.providers.Resolve(model.ProviderType)
	if !exists {
		return applyFailure(command, config, &ExecutionFailure{
			Code:    "LLM_PROVIDER_NOT_REGISTERED",
			Message: "模型供应商没有注册执行适配器",
			Details: map[string]any{"providerType": model.ProviderType},
		}), nil
	}

	messages := make([]ProviderMessage, 0, len(config.Messages))
	for _, message := range config.Messages {
		messages = append(messages, ProviderMessage{Role: message.Role, Content: message.Content})
	}

	result, failure := provider.Execute(ctx, model, ProviderRequest{
		Messages:   messages,
		Parameters: config.Model.Parameters,
	})
	if failure != nil {
		return applyFailure(command, config, failure), nil
	}
	if config.Model.Parameters.ResponseFormat == "json" && !json.Valid([]byte(result)) {
		return applyFailure(command, config, &ExecutionFailure{
			Code:    "LLM_JSON_OUTPUT_INVALID",
			Message: "模型没有返回合法 JSON",
		}), nil
	}

	return protocol.NewSucceededResult(
		executor.ResultIdentity(command),
		map[string]any{"result": result},
		[]string{"result"},
	), nil
}
