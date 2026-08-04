package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const maxHTTPResponseBytes = 4 * 1024 * 1024

type HTTPClient interface {
	Do(*http.Request) (*http.Response, error)
}

func executeJSONRequest(
	ctx context.Context,
	client HTTPClient,
	method string,
	url string,
	apiKey string,
	requestBody any,
	responseTarget any,
) *ExecutionFailure {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return &ExecutionFailure{Code: "LLM_REQUEST_INVALID", Message: "无法生成模型请求"}
	}

	request, err := http.NewRequestWithContext(ctx, method, url, strings.NewReader(string(body)))
	if err != nil {
		return &ExecutionFailure{Code: "LLM_REQUEST_INVALID", Message: "无法创建模型请求"}
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		request.Header.Set("Authorization", "Bearer "+apiKey)
	}

	response, err := client.Do(request)
	if err != nil {
		switch {
		case errors.Is(err, context.DeadlineExceeded):
			return &ExecutionFailure{Code: "LLM_REQUEST_TIMEOUT", Message: "模型请求超时", Retryable: true}
		case errors.Is(err, context.Canceled):
			return &ExecutionFailure{Code: "LLM_REQUEST_CANCELLED", Message: "模型请求已取消"}
		default:
			return &ExecutionFailure{Code: "LLM_REQUEST_FAILED", Message: "无法连接模型服务", Retryable: true}
		}
	}
	defer func() { _ = response.Body.Close() }()

	responseBody, err := readLimitedBody(response.Body)
	if err != nil {
		return &ExecutionFailure{Code: "LLM_RESPONSE_READ_FAILED", Message: "读取模型响应失败", Retryable: true}
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		message := extractUpstreamError(responseBody)
		if message == "" {
			message = fmt.Sprintf("模型服务返回 HTTP %d", response.StatusCode)
		}
		return &ExecutionFailure{
			Code:      upstreamStatusCode(response.StatusCode),
			Message:   message,
			Retryable: isRetryableHTTPStatus(response.StatusCode),
			Details:   map[string]any{"statusCode": response.StatusCode},
		}
	}

	if err := json.Unmarshal(responseBody, responseTarget); err != nil {
		return &ExecutionFailure{Code: "LLM_RESPONSE_INVALID", Message: "模型服务返回了无法解析的数据", Retryable: true}
	}
	return nil
}

func readLimitedBody(reader io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(reader, maxHTTPResponseBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxHTTPResponseBytes {
		return nil, fmt.Errorf("HTTP 响应超过大小限制")
	}
	return data, nil
}

func extractUpstreamError(data []byte) string {
	var body struct {
		Error   any    `json:"error"`
		Message string `json:"message"`
		Detail  string `json:"detail"`
	}
	if err := json.Unmarshal(data, &body); err != nil {
		return ""
	}

	switch value := body.Error.(type) {
	case string:
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	case map[string]any:
		if message, ok := value["message"].(string); ok && strings.TrimSpace(message) != "" {
			return strings.TrimSpace(message)
		}
	}
	if strings.TrimSpace(body.Message) != "" {
		return strings.TrimSpace(body.Message)
	}
	return strings.TrimSpace(body.Detail)
}

func isRetryableHTTPStatus(statusCode int) bool {
	return statusCode == http.StatusRequestTimeout ||
		statusCode == http.StatusConflict ||
		statusCode == http.StatusTooManyRequests ||
		statusCode >= http.StatusInternalServerError
}

func upstreamStatusCode(statusCode int) string {
	switch statusCode {
	case http.StatusUnauthorized, http.StatusForbidden:
		return "LLM_AUTHENTICATION_FAILED"
	case http.StatusTooManyRequests:
		return "LLM_RATE_LIMITED"
	default:
		return "LLM_PROVIDER_ERROR"
	}
}

func appendURLPath(baseURL string, path string) string {
	return strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(path, "/")
}
