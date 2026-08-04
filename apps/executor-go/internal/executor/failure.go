package executor

import (
	"bytes"
	"encoding/json"
	"fmt"

	protocol "workflow-protocol"
)

const (
	ErrorHandlingNone         = "none"
	ErrorHandlingDefaultValue = "default_value"
	ErrorHandlingErrorBranch  = "error_branch"
	ErrorHandle               = "error"
)

type ExecutionFailure struct {
	Code      string
	Message   string
	Retryable bool
	Details   map[string]any
}

type ErrorHandling struct {
	Mode         string
	DefaultValue any
}

type rawErrorHandling struct {
	Mode         string          `json:"mode"`
	DefaultValue json.RawMessage `json:"defaultValue"`
}

func ParseErrorHandling(raw json.RawMessage) (ErrorHandling, error) {
	if len(raw) == 0 {
		return ErrorHandling{Mode: ErrorHandlingNone}, nil
	}
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return ErrorHandling{}, fmt.Errorf("异常处理配置格式无效")
	}

	var decoded rawErrorHandling
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&decoded); err != nil {
		return ErrorHandling{}, fmt.Errorf("异常处理配置格式无效")
	}
	if decoded.Mode == "" {
		decoded.Mode = ErrorHandlingNone
	}

	switch decoded.Mode {
	case ErrorHandlingNone, ErrorHandlingErrorBranch:
		if len(decoded.DefaultValue) > 0 {
			return ErrorHandling{}, fmt.Errorf("当前异常处理模式不能配置默认值")
		}
		return ErrorHandling{Mode: decoded.Mode}, nil
	case ErrorHandlingDefaultValue:
		defaultValue := any(map[string]any{})
		if len(decoded.DefaultValue) > 0 {
			if err := json.Unmarshal(decoded.DefaultValue, &defaultValue); err != nil {
				return ErrorHandling{}, fmt.Errorf("异常默认值不是合法 JSON")
			}
		}
		return ErrorHandling{Mode: decoded.Mode, DefaultValue: defaultValue}, nil
	default:
		return ErrorHandling{}, fmt.Errorf("异常处理模式无效：%s", decoded.Mode)
	}
}

func ApplyFailure(
	command protocol.ExecuteNodeCommand,
	config ErrorHandling,
	outputKey string,
	successHandle string,
	failure *ExecutionFailure,
) protocol.ExecuteNodeResult {
	identity := ResultIdentity(command)

	switch config.Mode {
	case ErrorHandlingDefaultValue:
		return protocol.NewSucceededResult(
			identity,
			map[string]any{outputKey: config.DefaultValue},
			[]string{successHandle},
		)
	case ErrorHandlingErrorBranch:
		return protocol.NewSucceededResult(identity, map[string]any{}, []string{ErrorHandle})
	default:
		return FailedResult(command, failure)
	}
}

func FailedResult(
	command protocol.ExecuteNodeCommand,
	failure *ExecutionFailure,
) protocol.ExecuteNodeResult {
	return protocol.NewFailedResult(
		ResultIdentity(command),
		protocol.NodeExecutionError{
			Code:      failure.Code,
			Message:   failure.Message,
			Retryable: failure.Retryable,
			Details:   failure.Details,
		},
	)
}
