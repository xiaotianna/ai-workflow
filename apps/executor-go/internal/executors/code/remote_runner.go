package code

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"node-executor-go/internal/executor"
)

const sandboxControllerContractVersion = "1"

type remoteSandboxRunner struct {
	endpoint string
	token    string
	client   *http.Client
}

type sandboxControllerRequest struct {
	ContractVersion string         `json:"contractVersion"`
	CommandID       string         `json:"commandId"`
	DeadlineAt      string         `json:"deadlineAt"`
	Source          string         `json:"source"`
	Inputs          map[string]any `json:"inputs"`
	MaxOutputBytes  int            `json:"maxOutputBytes"`
}

type sandboxControllerResponse struct {
	Status  string                    `json:"status"`
	Outputs map[string]any            `json:"outputs,omitempty"`
	Error   *sandboxControllerFailure `json:"error,omitempty"`
}

type sandboxControllerFailure struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Retryable bool           `json:"retryable"`
	Details   map[string]any `json:"details,omitempty"`
}

func newRemoteSandboxRunnerFromEnvironment() (codeRunner, error) {
	endpoint := strings.TrimSpace(os.Getenv("CODE_SANDBOX_CONTROLLER_URL"))
	if endpoint == "" {
		return nil, fmt.Errorf("remote Code 沙箱缺少 CODE_SANDBOX_CONTROLLER_URL")
	}
	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, fmt.Errorf("CODE_SANDBOX_CONTROLLER_URL 必须是完整的 HTTP 或 HTTPS URL")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, fmt.Errorf("CODE_SANDBOX_CONTROLLER_URL 不能包含凭证、Query 或 Fragment")
	}
	requireTLS, err := optionalBoolEnvironment("CODE_SANDBOX_REQUIRE_TLS")
	if err != nil {
		return nil, err
	}
	if requireTLS && parsed.Scheme != "https" {
		return nil, fmt.Errorf("CODE_SANDBOX_REQUIRE_TLS 已启用，Controller 必须使用 HTTPS")
	}
	token := strings.TrimSpace(os.Getenv("CODE_SANDBOX_CONTROLLER_TOKEN"))
	requireAuth, err := optionalBoolEnvironment("CODE_SANDBOX_REQUIRE_AUTH")
	if err != nil {
		return nil, err
	}
	if requireAuth && token == "" {
		return nil, fmt.Errorf("CODE_SANDBOX_REQUIRE_AUTH 已启用，缺少 Controller 认证信息")
	}

	return &remoteSandboxRunner{
		endpoint: parsed.String(),
		token:    token,
		client:   &http.Client{},
	}, nil
}

func (runner *remoteSandboxRunner) Execute(
	ctx context.Context,
	request codeExecutionRequest,
) (map[string]any, *executor.ExecutionFailure) {
	payload, err := json.Marshal(sandboxControllerRequest{
		ContractVersion: sandboxControllerContractVersion,
		CommandID:       request.CommandID,
		DeadlineAt:      request.DeadlineAt,
		Source:          request.Source,
		Inputs:          request.Inputs,
		MaxOutputBytes:  maxOutputJSONSize,
	})
	if err != nil {
		return nil, sandboxFailure("SANDBOX_CREATE_FAILED", "无法生成沙箱任务请求", false)
	}

	httpRequest, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		runner.endpoint,
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, sandboxFailure("SANDBOX_CREATE_FAILED", "无法创建沙箱任务请求", false)
	}
	httpRequest.Header.Set("Accept", "application/json")
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Idempotency-Key", request.CommandID)
	if runner.token != "" {
		httpRequest.Header.Set("Authorization", "Bearer "+runner.token)
	}

	response, err := runner.client.Do(httpRequest)
	if err != nil {
		return nil, sandboxTransportFailure(ctx)
	}
	defer func() { _ = response.Body.Close() }()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		retryable := response.StatusCode == http.StatusRequestTimeout ||
			response.StatusCode == http.StatusTooManyRequests ||
			response.StatusCode >= http.StatusInternalServerError
		return nil, sandboxFailure(
			"SANDBOX_CREATE_FAILED",
			fmt.Sprintf("沙箱服务返回 HTTP %d", response.StatusCode),
			retryable,
		)
	}

	data, err := io.ReadAll(io.LimitReader(
		response.Body,
		int64(maxOutputJSONSize+nodeMaxEnvelopeBytes+1),
	))
	if err != nil {
		return nil, sandboxFailure("SANDBOX_SERVICE_UNAVAILABLE", "无法读取沙箱执行结果", true)
	}
	if len(data) > maxOutputJSONSize+nodeMaxEnvelopeBytes {
		return nil, sandboxFailure("SANDBOX_RESULT_INVALID", "沙箱执行结果超过大小限制", false)
	}

	var decoded sandboxControllerResponse
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&decoded); err != nil {
		return nil, sandboxFailure("SANDBOX_RESULT_INVALID", "沙箱执行结果格式无效", false)
	}
	if err := ensureJSONEOF(decoder); err != nil {
		return nil, sandboxFailure("SANDBOX_RESULT_INVALID", "沙箱执行结果包含多余内容", false)
	}

	switch decoded.Status {
	case "SUCCEEDED":
		if decoded.Outputs == nil || decoded.Error != nil {
			return nil, sandboxFailure("SANDBOX_RESULT_INVALID", "沙箱成功结果缺少输出", false)
		}
		return decoded.Outputs, nil
	case "FAILED":
		if decoded.Error == nil || strings.TrimSpace(decoded.Error.Code) == "" ||
			strings.TrimSpace(decoded.Error.Message) == "" {
			return nil, sandboxFailure("SANDBOX_RESULT_INVALID", "沙箱失败结果缺少错误信息", false)
		}
		return nil, &executor.ExecutionFailure{
			Code:      truncateText(strings.TrimSpace(decoded.Error.Code), 100),
			Message:   truncateText(strings.TrimSpace(decoded.Error.Message), 1_000),
			Retryable: decoded.Error.Retryable,
			Details:   decoded.Error.Details,
		}
	default:
		return nil, sandboxFailure("SANDBOX_RESULT_INVALID", "沙箱执行结果状态无效", false)
	}
}

func sandboxTransportFailure(ctx context.Context) *executor.ExecutionFailure {
	switch {
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return sandboxFailure("SANDBOX_EXECUTION_TIMEOUT", "Code 沙箱执行超时", false)
	case errors.Is(ctx.Err(), context.Canceled):
		return sandboxFailure("CODE_EXECUTION_CANCELLED", "Code 节点执行已取消", false)
	default:
		return sandboxFailure("SANDBOX_SERVICE_UNAVAILABLE", "无法连接沙箱服务", true)
	}
}

func sandboxFailure(code string, message string, retryable bool) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{Code: code, Message: message, Retryable: retryable}
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var trailing any
	err := decoder.Decode(&trailing)
	if errors.Is(err, io.EOF) {
		return nil
	}
	if err == nil {
		return fmt.Errorf("unexpected trailing JSON value")
	}
	return err
}
