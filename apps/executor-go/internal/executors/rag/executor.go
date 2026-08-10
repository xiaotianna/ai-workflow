package rag

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const (
	NodeType             = "rag"
	maxResponseBodyBytes = 4 * 1024 * 1024
)

type Executor struct {
	logger   *log.Logger
	client   *http.Client
	endpoint string
	token    string
}

type retrievalRequest struct {
	CommandID    string `json:"commandId"`
	RunID        string `json:"runId"`
	NodeRunID    string `json:"nodeRunId"`
	NodeID       string `json:"nodeId"`
	ExecutionKey string `json:"executionKey"`
	LeaseToken   string `json:"leaseToken"`
	Query        string `json:"query"`
}

type retrievalResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    *struct {
		Documents []any `json:"documents"`
	} `json:"data"`
}

func New(logger *log.Logger, endpoint string, internalAuthToken string) *Executor {
	return &Executor{
		logger:   logger,
		client:   &http.Client{},
		endpoint: endpoint,
		token:    internalAuthToken,
	}
}

func (nodeExecutor *Executor) Execute(
	ctx context.Context,
	command protocol.ExecuteNodeCommand,
) (protocol.ExecuteNodeResult, error) {
	nodeExecutor.logger.Printf(
		"rag execute commandId=%s runId=%s nodeRunId=%s nodeId=%s attempt=%d",
		command.CommandID,
		command.RunID,
		command.NodeRunID,
		command.NodeID,
		command.Attempt,
	)

	query, ok := command.Inputs["query"].(string)
	query = strings.TrimSpace(query)
	if !ok || query == "" {
		return executor.FailedResult(command, &executor.ExecutionFailure{
			Code:    "RAG_QUERY_INVALID",
			Message: "知识库检索内容不能为空",
		}), nil
	}

	documents, failure := nodeExecutor.retrieve(ctx, command, query)
	if failure != nil {
		return executor.FailedResult(command, failure), nil
	}
	return protocol.NewSucceededResult(
		executor.ResultIdentity(command),
		map[string]any{"documents": documents},
		[]string{"documents"},
	), nil
}

func (nodeExecutor *Executor) retrieve(
	ctx context.Context,
	command protocol.ExecuteNodeCommand,
	query string,
) ([]any, *executor.ExecutionFailure) {
	payload, err := json.Marshal(retrievalRequest{
		CommandID:    command.CommandID,
		RunID:        command.RunID,
		NodeRunID:    command.NodeRunID,
		NodeID:       command.NodeID,
		ExecutionKey: command.ExecutionKey,
		LeaseToken:   command.LeaseToken,
		Query:        query,
	})
	if err != nil {
		return nil, retrievalFailure("RAG_REQUEST_INVALID", "无法生成知识库检索请求", false)
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		nodeExecutor.endpoint,
		strings.NewReader(string(payload)),
	)
	if err != nil {
		return nil, retrievalFailure("RAG_REQUEST_INVALID", "无法创建知识库检索请求", false)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if nodeExecutor.token != "" {
		request.Header.Set("Authorization", "Bearer "+nodeExecutor.token)
	}

	response, err := nodeExecutor.client.Do(request)
	if err != nil {
		return nil, retrievalFailure(
			"RAG_RETRIEVAL_UNAVAILABLE",
			"无法连接知识库检索服务",
			!errors.Is(err, context.Canceled),
		)
	}
	defer func() { _ = response.Body.Close() }()
	responseBody, err := readLimitedBody(response.Body)
	if err != nil {
		return nil, retrievalFailure("RAG_RESPONSE_READ_FAILED", "读取知识库检索响应失败", true)
	}

	var decoded retrievalResponse
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		return nil, retrievalFailure("RAG_RESPONSE_INVALID", "知识库检索响应无效", true)
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		message := strings.TrimSpace(decoded.Message)
		if message == "" {
			message = fmt.Sprintf("知识库检索服务返回 HTTP %d", response.StatusCode)
		}
		return nil, &executor.ExecutionFailure{
			Code:      "RAG_RETRIEVAL_FAILED",
			Message:   message,
			Retryable: response.StatusCode == http.StatusTooManyRequests || response.StatusCode >= 500,
			Details:   map[string]any{"statusCode": response.StatusCode},
		}
	}
	if decoded.Data == nil || decoded.Data.Documents == nil {
		return nil, retrievalFailure("RAG_RESPONSE_INVALID", "知识库检索响应缺少 documents", true)
	}
	return decoded.Data.Documents, nil
}

func readLimitedBody(reader io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(reader, maxResponseBodyBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxResponseBodyBytes {
		return nil, fmt.Errorf("知识库检索响应超过大小限制")
	}
	return data, nil
}

func retrievalFailure(code string, message string, retryable bool) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{Code: code, Message: message, Retryable: retryable}
}
