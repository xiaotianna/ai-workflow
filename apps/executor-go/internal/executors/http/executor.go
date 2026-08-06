package http

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	stdhttp "net/http"
	"time"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const (
	NodeType             = "http"
	responseOutputKey    = "response"
	maxResponseBodyBytes = 10 * 1024 * 1024
)

type HTTPClient interface {
	Do(*stdhttp.Request) (*stdhttp.Response, error)
}

type Executor struct {
	logger *log.Logger
	client HTTPClient
}

func New(logger *log.Logger) (*Executor, error) {
	client, err := newHTTPClientFromEnvironment()
	if err != nil {
		return nil, err
	}
	return &Executor{logger: logger, client: client}, nil
}

func (nodeExecutor *Executor) Execute(
	ctx context.Context,
	command protocol.ExecuteNodeCommand,
) (protocol.ExecuteNodeResult, error) {
	nodeExecutor.logger.Printf(
		"http execute commandId=%s runId=%s nodeRunId=%s nodeId=%s attempt=%d",
		command.CommandID,
		command.RunID,
		command.NodeRunID,
		command.NodeID,
		command.Attempt,
	)

	config, failure := parseNodeConfig(command.Config)
	if failure != nil {
		return executor.FailedResult(command, failure), nil
	}

	response, failure := nodeExecutor.executeRequest(ctx, config, command.IdempotencyKey)
	if failure != nil {
		return executor.ApplyFailure(
			command,
			config.ErrorHandling,
			responseOutputKey,
			responseOutputKey,
			failure,
		), nil
	}

	return protocol.NewSucceededResult(
		executor.ResultIdentity(command),
		map[string]any{responseOutputKey: response},
		[]string{responseOutputKey},
	), nil
}

func (nodeExecutor *Executor) executeRequest(
	ctx context.Context,
	config nodeConfig,
	idempotencyKey string,
) (map[string]any, *executor.ExecutionFailure) {
	requestContext, cancel := context.WithTimeout(ctx, config.ConnectionTimeout)
	defer cancel()

	request, failure := createRequest(requestContext, config, idempotencyKey)
	if failure != nil {
		return nil, failure
	}

	startedAt := time.Now()
	response, err := nodeExecutor.client.Do(request)
	if err != nil {
		return nil, requestFailure(requestContext, err)
	}
	defer func() { _ = response.Body.Close() }()

	responseBody, err := readLimitedBody(response.Body, maxResponseBodyBytes)
	if err != nil {
		return nil, &executor.ExecutionFailure{
			Code:      "HTTP_RESPONSE_READ_FAILED",
			Message:   err.Error(),
			Retryable: !errors.Is(err, errResponseTooLarge),
		}
	}

	if response.StatusCode < stdhttp.StatusOK || response.StatusCode >= stdhttp.StatusMultipleChoices {
		return nil, &executor.ExecutionFailure{
			Code:      "HTTP_UPSTREAM_ERROR",
			Message:   fmt.Sprintf("HTTP 服务返回状态码 %d", response.StatusCode),
			Retryable: isRetryableStatus(response.StatusCode),
			Details:   map[string]any{"status": response.StatusCode},
		}
	}

	data, failure := decodeResponseData(response.Header.Get("Content-Type"), responseBody)
	if failure != nil {
		return nil, failure
	}

	durationMilliseconds := time.Since(startedAt).Milliseconds()
	if durationMilliseconds < 1 {
		durationMilliseconds = 1
	}

	return map[string]any{
		"status":     response.StatusCode,
		"headers":    responseHeaders(response.Header),
		"data":       data,
		"durationMs": durationMilliseconds,
	}, nil
}

func requestFailure(ctx context.Context, err error) *executor.ExecutionFailure {
	switch {
	case errors.Is(ctx.Err(), context.DeadlineExceeded) || errors.Is(err, context.DeadlineExceeded):
		return &executor.ExecutionFailure{
			Code:      "HTTP_REQUEST_TIMEOUT",
			Message:   "HTTP 请求超时",
			Retryable: true,
		}
	case errors.Is(ctx.Err(), context.Canceled) || errors.Is(err, context.Canceled):
		return &executor.ExecutionFailure{
			Code:      "HTTP_REQUEST_CANCELLED",
			Message:   "HTTP 请求已取消",
			Retryable: false,
		}
	case errors.Is(err, errHTTPTargetForbidden):
		return &executor.ExecutionFailure{
			Code:      "HTTP_TARGET_FORBIDDEN",
			Message:   "HTTP 请求目标属于受保护网络",
			Retryable: false,
		}
	default:
		return &executor.ExecutionFailure{
			Code:      "HTTP_REQUEST_FAILED",
			Message:   "无法连接 HTTP 服务",
			Retryable: true,
		}
	}
}

func isRetryableStatus(status int) bool {
	return status == stdhttp.StatusRequestTimeout ||
		status == stdhttp.StatusConflict ||
		status == stdhttp.StatusTooEarly ||
		status == stdhttp.StatusTooManyRequests ||
		status >= stdhttp.StatusInternalServerError
}

var errResponseTooLarge = errors.New("HTTP 响应超过 10 MiB 大小限制")

func readLimitedBody(reader io.Reader, limit int64) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(reader, limit+1))
	if err != nil {
		return nil, fmt.Errorf("读取 HTTP 响应失败")
	}
	if int64(len(data)) > limit {
		return nil, errResponseTooLarge
	}
	return data, nil
}
