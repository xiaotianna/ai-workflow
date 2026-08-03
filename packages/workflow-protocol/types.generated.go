// Code generated from schemas/*.schema.json. DO NOT EDIT.

package protocol

type JSONValue = any

type ExecuteNodeCommand struct {
	ProtocolVersion string               `json:"protocolVersion"`
	CommandID       string               `json:"commandId"`
	IdempotencyKey  string               `json:"idempotencyKey"`
	RunID           string               `json:"runId"`
	NodeRunID       string               `json:"nodeRunId"`
	NodeID          string               `json:"nodeId"`
	NodeType        string               `json:"nodeType"`
	ExecutionKey    string               `json:"executionKey"`
	Attempt         int                  `json:"attempt"`
	LeaseToken      string               `json:"leaseToken"`
	DeadlineAt      string               `json:"deadlineAt"`
	Inputs          map[string]JSONValue `json:"inputs"`
	Config          map[string]JSONValue `json:"config"`
}

type NodeResultStatus string

const (
	NodeResultStatusSucceeded NodeResultStatus = "SUCCEEDED"
	NodeResultStatusFailed    NodeResultStatus = "FAILED"
)

type NodeExecutionError struct {
	Code      string               `json:"code"`
	Message   string               `json:"message"`
	Retryable bool                 `json:"retryable"`
	Details   map[string]JSONValue `json:"details,omitempty"`
}

type ExecuteNodeResult struct {
	ProtocolVersion  string                `json:"protocolVersion"`
	CommandID        string                `json:"commandId"`
	NodeRunID        string                `json:"nodeRunId"`
	ExecutionKey     string                `json:"executionKey"`
	LeaseToken       string                `json:"leaseToken"`
	Status           NodeResultStatus      `json:"status"`
	Outputs          *map[string]JSONValue `json:"outputs,omitempty"`
	ActivatedHandles *[]string             `json:"activatedHandles,omitempty"`
	Error            *NodeExecutionError   `json:"error,omitempty"`
}
