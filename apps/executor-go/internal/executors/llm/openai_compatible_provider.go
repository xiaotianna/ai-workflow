package llm

import (
	"context"
	"net/http"
	"strings"
)

type OpenAICompatibleProvider struct {
	client       HTTPClient
	providerType string
}

type openAICompatibleResponse struct {
	Choices []struct {
		Message struct {
			Content          string `json:"content"`
			ReasoningContent string `json:"reasoning_content"`
			Reasoning        string `json:"reasoning"`
			Thinking         string `json:"thinking"`
		} `json:"message"`
	} `json:"choices"`
}

func NewOpenAICompatibleProvider(providerType string, client HTTPClient) *OpenAICompatibleProvider {
	return &OpenAICompatibleProvider{client: client, providerType: providerType}
}

func (provider *OpenAICompatibleProvider) Type() string {
	return provider.providerType
}

func (provider *OpenAICompatibleProvider) Execute(
	ctx context.Context,
	model ResolvedModel,
	request ProviderRequest,
) (ProviderResult, *ExecutionFailure) {
	body := map[string]any{
		"model":    model.ModelID,
		"messages": request.Messages,
	}
	parameters := request.Parameters

	if provider.providerType == "deepseek" {
		applyDeepSeekParameters(body, parameters)
	} else {
		applyOpenAIParameters(body, parameters)
	}
	applyCommonOpenAICompatibleParameters(body, parameters)

	var response openAICompatibleResponse
	failure := executeJSONRequest(
		ctx,
		provider.client,
		http.MethodPost,
		appendURLPath(model.BaseURL, "chat/completions"),
		model.APIKey,
		body,
		&response,
	)
	if failure != nil {
		return ProviderResult{}, failure
	}
	if len(response.Choices) == 0 {
		return ProviderResult{}, &ExecutionFailure{Code: "LLM_RESPONSE_EMPTY", Message: "模型没有返回有效内容", Retryable: true}
	}
	message := response.Choices[0].Message
	thinking := firstNonEmpty(message.ReasoningContent, message.Reasoning, message.Thinking)
	if strings.TrimSpace(message.Content) == "" && strings.TrimSpace(thinking) == "" {
		return ProviderResult{}, &ExecutionFailure{Code: "LLM_RESPONSE_EMPTY", Message: "模型没有返回有效内容", Retryable: true}
	}

	return ProviderResult{Content: message.Content, Thinking: thinking}, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func applyOpenAIParameters(body map[string]any, parameters ModelParameters) {
	if parameters.Temperature != nil {
		body["temperature"] = *parameters.Temperature
	}
	if parameters.TopP != nil {
		body["top_p"] = *parameters.TopP
	}
	if parameters.MaxTokens != nil {
		body["max_completion_tokens"] = *parameters.MaxTokens
	}
	if parameters.ReasoningEffort != "" {
		body["reasoning_effort"] = parameters.ReasoningEffort
	}
}

func applyDeepSeekParameters(body map[string]any, parameters ModelParameters) {
	if parameters.ThinkingMode != "" {
		body["thinking"] = map[string]any{"type": parameters.ThinkingMode}
	}
	if parameters.ThinkingMode != "enabled" {
		if parameters.Temperature != nil {
			body["temperature"] = *parameters.Temperature
		}
		if parameters.TopP != nil {
			body["top_p"] = *parameters.TopP
		}
	}
	if parameters.MaxTokens != nil {
		body["max_tokens"] = *parameters.MaxTokens
	}
	if parameters.ReasoningEffort != "" {
		body["reasoning_effort"] = parameters.ReasoningEffort
	}
}

func applyCommonOpenAICompatibleParameters(body map[string]any, parameters ModelParameters) {
	if len(parameters.StopSequences) > 0 {
		body["stop"] = parameters.StopSequences
	}
	if parameters.ResponseFormat == "json" {
		body["response_format"] = map[string]any{"type": "json_object"}
	}
}
