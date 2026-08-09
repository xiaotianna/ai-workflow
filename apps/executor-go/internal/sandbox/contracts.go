package sandbox

import "errors"

type Request struct {
	Source         string           `json:"source"`
	Inputs         map[string]any   `json:"inputs"`
	Config         map[string]any   `json:"config,omitempty"`
	Context        ExecutionContext `json:"context,omitempty"`
	MaxOutputBytes int              `json:"maxOutputBytes"`
}

type ExecutionContext struct {
	WorkflowRunID string `json:"workflowRunId,omitempty"`
	NodeRunID     string `json:"nodeRunId,omitempty"`
	Attempt       int    `json:"attempt,omitempty"`
}

type Response struct {
	Status  string         `json:"status"`
	Outputs map[string]any `json:"outputs,omitempty"`
	Error   *Failure       `json:"error,omitempty"`
}

type Failure struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Retryable bool           `json:"retryable"`
	Details   map[string]any `json:"details,omitempty"`
}

func ValidateResponse(response Response) error {
	switch response.Status {
	case "SUCCEEDED":
		if response.Outputs == nil || response.Error != nil {
			return errors.New("plugin success response is invalid")
		}
	case "FAILED":
		if response.Error == nil || response.Error.Code == "" || response.Error.Message == "" {
			return errors.New("plugin failure response is invalid")
		}
	default:
		return errors.New("plugin response status is invalid")
	}
	return nil
}
