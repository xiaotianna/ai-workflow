package executorlease

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	protocol "workflow-protocol"
)

const maxResponseBytes = 64 * 1024

type HTTPClient interface {
	Do(*http.Request) (*http.Response, error)
}

type Checker interface {
	IsActive(context.Context, protocol.ExecuteNodeCommand) (bool, error)
}

type ServerChecker struct {
	client   HTTPClient
	endpoint string
	token    string
}

type leaseRequest struct {
	CommandID    string `json:"commandId"`
	RunID        string `json:"runId"`
	NodeRunID    string `json:"nodeRunId"`
	NodeID       string `json:"nodeId"`
	ExecutionKey string `json:"executionKey"`
	LeaseToken   string `json:"leaseToken"`
}

type leaseResponse struct {
	Message string `json:"message"`
	Data    *struct {
		Active bool `json:"active"`
	} `json:"data"`
}

func NewServerChecker(client HTTPClient, endpoint string, token string) *ServerChecker {
	return &ServerChecker{client: client, endpoint: endpoint, token: token}
}

func (checker *ServerChecker) IsActive(
	ctx context.Context,
	command protocol.ExecuteNodeCommand,
) (bool, error) {
	payload, err := json.Marshal(leaseRequest{
		CommandID:    command.CommandID,
		RunID:        command.RunID,
		NodeRunID:    command.NodeRunID,
		NodeID:       command.NodeID,
		ExecutionKey: command.ExecutionKey,
		LeaseToken:   command.LeaseToken,
	})
	if err != nil {
		return false, fmt.Errorf("encode command lease request: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, checker.endpoint, bytes.NewReader(payload))
	if err != nil {
		return false, fmt.Errorf("create command lease request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if checker.token != "" {
		request.Header.Set("Authorization", "Bearer "+checker.token)
	}

	response, err := checker.client.Do(request)
	if err != nil {
		return false, fmt.Errorf("request command lease: %w", err)
	}
	defer func() { _ = response.Body.Close() }()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes+1))
	if err != nil {
		return false, fmt.Errorf("read command lease response: %w", err)
	}
	if len(responseBody) > maxResponseBytes {
		return false, fmt.Errorf("command lease response exceeds %d bytes", maxResponseBytes)
	}

	var decoded leaseResponse
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		return false, fmt.Errorf("decode command lease response: %w", err)
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		message := strings.TrimSpace(decoded.Message)
		if message == "" {
			message = fmt.Sprintf("HTTP %d", response.StatusCode)
		}
		return false, fmt.Errorf("command lease service rejected request: %s", message)
	}
	if decoded.Data == nil {
		return false, fmt.Errorf("command lease response is missing data")
	}

	return decoded.Data.Active, nil
}
