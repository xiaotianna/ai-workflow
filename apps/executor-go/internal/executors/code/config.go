package code

import (
	"encoding/json"
	"fmt"
	"strings"

	"node-executor-go/internal/executor"
)

type nodeConfig struct {
	Code          string
	ErrorHandling executor.ErrorHandling
}

type rawNodeConfig struct {
	Code          string          `json:"code"`
	ErrorHandling json.RawMessage `json:"errorHandling"`
}

func parseNodeConfig(raw map[string]any) (nodeConfig, *executor.ExecutionFailure) {
	var decoded rawNodeConfig
	if err := executor.DecodeConfig(raw, &decoded); err != nil {
		return nodeConfig{}, configFailure("Code 节点配置格式无效")
	}
	if strings.TrimSpace(decoded.Code) == "" {
		return nodeConfig{}, configFailure("Code 节点代码不能为空")
	}
	if len(decoded.Code) > maxSourceBytes {
		return nodeConfig{}, configFailure("Code 节点代码超过 256 KiB 大小限制")
	}

	errorHandling, err := executor.ParseErrorHandling(decoded.ErrorHandling)
	if err != nil {
		return nodeConfig{}, configFailure(fmt.Sprintf("Code %s", err))
	}

	return nodeConfig{
		Code:          decoded.Code,
		ErrorHandling: errorHandling,
	}, nil
}

func configFailure(message string) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{
		Code:      "CODE_CONFIG_INVALID",
		Message:   message,
		Retryable: false,
	}
}
