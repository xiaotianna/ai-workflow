package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	protocol "workflow-protocol"
)

type ResolvedModel struct {
	ProviderType string `json:"providerType"`
	ModelID      string `json:"modelId"`
	BaseURL      string `json:"baseUrl"`
	APIKey       string `json:"apiKey,omitempty"`
}

type ModelResolver interface {
	Resolve(context.Context, protocol.ExecuteNodeCommand) (ResolvedModel, *ExecutionFailure)
}

type ServerModelResolver struct {
	client   HTTPClient
	endpoint string
}

type modelResolutionRequest struct {
	CommandID    string `json:"commandId"`
	RunID        string `json:"runId"`
	NodeRunID    string `json:"nodeRunId"`
	NodeID       string `json:"nodeId"`
	ExecutionKey string `json:"executionKey"`
	LeaseToken   string `json:"leaseToken"`
}

type modelResolutionResponse struct {
	Code    int            `json:"code"`
	Message string         `json:"message"`
	Data    *ResolvedModel `json:"data"`
}

func NewServerModelResolver(client HTTPClient, endpoint string) *ServerModelResolver {
	return &ServerModelResolver{client: client, endpoint: endpoint}
}

func (resolver *ServerModelResolver) Resolve(
	ctx context.Context,
	command protocol.ExecuteNodeCommand,
) (ResolvedModel, *ExecutionFailure) {
	payload := modelResolutionRequest{
		CommandID:    command.CommandID,
		RunID:        command.RunID,
		NodeRunID:    command.NodeRunID,
		NodeID:       command.NodeID,
		ExecutionKey: command.ExecutionKey,
		LeaseToken:   command.LeaseToken,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return ResolvedModel{}, modelResolutionFailure("无法生成模型解析请求", false)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, resolver.endpoint, strings.NewReader(string(body)))
	if err != nil {
		return ResolvedModel{}, modelResolutionFailure("无法创建模型解析请求", false)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")

	response, err := resolver.client.Do(request)
	if err != nil {
		return ResolvedModel{}, modelResolutionFailure("无法连接模型运行配置服务", true)
	}
	defer func() { _ = response.Body.Close() }()

	responseBody, err := readLimitedBody(response.Body)
	if err != nil {
		return ResolvedModel{}, modelResolutionFailure("读取模型运行配置失败", true)
	}

	var decoded modelResolutionResponse
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		return ResolvedModel{}, modelResolutionFailure("模型运行配置响应无效", true)
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		message := strings.TrimSpace(decoded.Message)
		if message == "" {
			message = fmt.Sprintf("模型运行配置服务返回 HTTP %d", response.StatusCode)
		}
		return ResolvedModel{}, &ExecutionFailure{
			Code:      "LLM_MODEL_RESOLUTION_FAILED",
			Message:   message,
			Retryable: isRetryableHTTPStatus(response.StatusCode),
			Details:   map[string]any{"statusCode": response.StatusCode},
		}
	}
	if decoded.Data == nil || strings.TrimSpace(decoded.Data.ProviderType) == "" ||
		strings.TrimSpace(decoded.Data.ModelID) == "" || strings.TrimSpace(decoded.Data.BaseURL) == "" {
		return ResolvedModel{}, modelResolutionFailure("模型运行配置响应缺少必填字段", false)
	}

	return *decoded.Data, nil
}

func modelResolutionFailure(message string, retryable bool) *ExecutionFailure {
	return &ExecutionFailure{
		Code:      "LLM_MODEL_RESOLUTION_FAILED",
		Message:   message,
		Retryable: retryable,
	}
}
