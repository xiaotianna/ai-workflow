package llm

import (
	"context"
	"net/http"
	"strings"
)

type OllamaProvider struct {
	client HTTPClient
}

type ollamaResponse struct {
	Message struct {
		Content  string `json:"content"`
		Thinking string `json:"thinking"`
	} `json:"message"`
	Error string `json:"error"`
}

func NewOllamaProvider(client HTTPClient) *OllamaProvider {
	return &OllamaProvider{client: client}
}

func (provider *OllamaProvider) Type() string {
	return "ollama"
}

func (provider *OllamaProvider) Execute(
	ctx context.Context,
	model ResolvedModel,
	request ProviderRequest,
) (ProviderResult, *ExecutionFailure) {
	body := map[string]any{
		"model":    model.ModelID,
		"messages": request.Messages,
		"stream":   false,
	}
	parameters := request.Parameters
	options := make(map[string]any)
	if parameters.Temperature != nil {
		options["temperature"] = *parameters.Temperature
	}
	if parameters.TopP != nil {
		options["top_p"] = *parameters.TopP
	}
	if parameters.TopK != nil {
		options["top_k"] = *parameters.TopK
	}
	if parameters.MaxTokens != nil {
		options["num_predict"] = *parameters.MaxTokens
	}
	if parameters.RepeatPenalty != nil {
		options["repeat_penalty"] = *parameters.RepeatPenalty
	}
	if parameters.Seed != nil {
		options["seed"] = *parameters.Seed
	}
	if len(parameters.StopSequences) > 0 {
		options["stop"] = parameters.StopSequences
	}
	if len(options) > 0 {
		body["options"] = options
	}
	if parameters.ResponseFormat == "json" {
		body["format"] = "json"
	}
	if parameters.ThinkingMode != "" {
		body["think"] = parameters.ThinkingMode == "enabled"
	}

	var response ollamaResponse
	failure := executeJSONRequest(
		ctx,
		provider.client,
		http.MethodPost,
		appendURLPath(model.BaseURL, "api/chat"),
		model.APIKey,
		body,
		&response,
	)
	if failure != nil {
		return ProviderResult{}, failure
	}
	if strings.TrimSpace(response.Error) != "" {
		return ProviderResult{}, &ExecutionFailure{Code: "LLM_PROVIDER_ERROR", Message: strings.TrimSpace(response.Error)}
	}
	if strings.TrimSpace(response.Message.Content) == "" && strings.TrimSpace(response.Message.Thinking) == "" {
		return ProviderResult{}, &ExecutionFailure{Code: "LLM_RESPONSE_EMPTY", Message: "模型没有返回有效内容", Retryable: true}
	}

	return ProviderResult{
		Content:  response.Message.Content,
		Thinking: response.Message.Thinking,
	}, nil
}
