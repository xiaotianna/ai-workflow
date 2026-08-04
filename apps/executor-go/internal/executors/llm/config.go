package llm

import (
	"encoding/json"
	"fmt"
	"strings"
)

const defaultContextMessage = "请根据输入生成回答"

const (
	errorHandlingNone         = "none"
	errorHandlingDefaultValue = "default_value"
	errorHandlingErrorBranch  = "error_branch"
)

type NodeConfig struct {
	Model         ModelConfig
	Messages      []ContextMessage
	ErrorHandling ErrorHandling
}

type ModelConfig struct {
	GroupID           string          `json:"groupId"`
	ConfiguredModelID string          `json:"configuredModelId"`
	GroupName         string          `json:"groupName,omitempty"`
	ModelID           string          `json:"modelId,omitempty"`
	ModelName         string          `json:"modelName,omitempty"`
	ProviderType      string          `json:"providerType,omitempty"`
	Parameters        ModelParameters `json:"parameters"`
}

type ModelParameters struct {
	Temperature     *float64 `json:"temperature,omitempty"`
	TopP            *float64 `json:"topP,omitempty"`
	MaxTokens       *int     `json:"maxTokens,omitempty"`
	StopSequences   []string `json:"stopSequences,omitempty"`
	ResponseFormat  string   `json:"responseFormat,omitempty"`
	ReasoningEffort string   `json:"reasoningEffort,omitempty"`
	ThinkingMode    string   `json:"thinkingMode,omitempty"`
	TopK            *int     `json:"topK,omitempty"`
	RepeatPenalty   *float64 `json:"repeatPenalty,omitempty"`
	Seed            *int     `json:"seed,omitempty"`
}

type ContextMessage struct {
	ID      string `json:"id"`
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ErrorHandling struct {
	Mode         string
	DefaultValue any
}

type rawNodeConfig struct {
	Model         ModelConfig       `json:"model"`
	Messages      *[]ContextMessage `json:"messages"`
	Prompt        string            `json:"prompt"`
	ErrorHandling json.RawMessage   `json:"errorHandling"`
}

type rawErrorHandling struct {
	Mode         string          `json:"mode"`
	DefaultValue json.RawMessage `json:"defaultValue"`
}

func ParseNodeConfig(raw map[string]any) (NodeConfig, *ExecutionFailure) {
	data, err := json.Marshal(raw)
	if err != nil {
		return NodeConfig{}, configFailure("LLM 节点配置无法序列化")
	}

	var decoded rawNodeConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		return NodeConfig{}, configFailure("LLM 节点配置格式无效")
	}

	messages, err := normalizeMessages(decoded.Messages, decoded.Prompt)
	if err != nil {
		return NodeConfig{}, configFailure(err.Error())
	}

	errorHandling, err := parseErrorHandling(decoded.ErrorHandling)
	if err != nil {
		return NodeConfig{}, configFailure(err.Error())
	}

	decoded.Model.GroupID = strings.TrimSpace(decoded.Model.GroupID)
	decoded.Model.ConfiguredModelID = strings.TrimSpace(decoded.Model.ConfiguredModelID)
	if decoded.Model.GroupID == "" || decoded.Model.ConfiguredModelID == "" {
		return NodeConfig{}, configFailure("LLM 节点尚未选择模型")
	}

	if err := validateParameters(&decoded.Model.Parameters); err != nil {
		return NodeConfig{}, configFailure(err.Error())
	}

	return NodeConfig{
		Model:         decoded.Model,
		Messages:      messages,
		ErrorHandling: errorHandling,
	}, nil
}

func normalizeMessages(messages *[]ContextMessage, legacyPrompt string) ([]ContextMessage, error) {
	if messages == nil {
		content := defaultContextMessage
		id := "default-system-message"
		if strings.TrimSpace(legacyPrompt) != "" {
			content = strings.TrimSpace(legacyPrompt)
			id = "legacy-system-message"
		}

		return []ContextMessage{{ID: id, Role: "system", Content: content}}, nil
	}

	if len(*messages) == 0 {
		return nil, fmt.Errorf("LLM 节点至少需要一条上下文消息")
	}

	seenIDs := make(map[string]struct{}, len(*messages))
	normalized := make([]ContextMessage, 0, len(*messages))
	for _, message := range *messages {
		message.ID = strings.TrimSpace(message.ID)
		message.Content = strings.TrimSpace(message.Content)
		if message.ID == "" {
			return nil, fmt.Errorf("LLM 上下文消息 ID 不能为空")
		}
		if _, exists := seenIDs[message.ID]; exists {
			return nil, fmt.Errorf("LLM 上下文消息 ID 不能重复")
		}
		seenIDs[message.ID] = struct{}{}

		switch message.Role {
		case "system", "assistant", "user":
		default:
			return nil, fmt.Errorf("LLM 上下文消息角色无效：%s", message.Role)
		}
		if message.Content == "" {
			return nil, fmt.Errorf("LLM 上下文内容不能为空")
		}
		normalized = append(normalized, message)
	}

	return normalized, nil
}

func parseErrorHandling(raw json.RawMessage) (ErrorHandling, error) {
	if len(raw) == 0 {
		return ErrorHandling{Mode: errorHandlingNone}, nil
	}

	var decoded rawErrorHandling
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return ErrorHandling{}, fmt.Errorf("LLM 异常处理配置无效")
	}
	if decoded.Mode == "" {
		decoded.Mode = errorHandlingNone
	}

	switch decoded.Mode {
	case errorHandlingNone, errorHandlingErrorBranch:
		return ErrorHandling{Mode: decoded.Mode}, nil
	case errorHandlingDefaultValue:
		defaultValue := any(map[string]any{})
		if len(decoded.DefaultValue) > 0 {
			if err := json.Unmarshal(decoded.DefaultValue, &defaultValue); err != nil {
				return ErrorHandling{}, fmt.Errorf("LLM 异常默认值不是合法 JSON")
			}
		}
		return ErrorHandling{Mode: decoded.Mode, DefaultValue: defaultValue}, nil
	default:
		return ErrorHandling{}, fmt.Errorf("LLM 异常处理模式无效：%s", decoded.Mode)
	}
}

func validateParameters(parameters *ModelParameters) error {
	if parameters.Temperature != nil && (*parameters.Temperature < 0 || *parameters.Temperature > 2) {
		return fmt.Errorf("LLM 温度必须在 0 到 2 之间")
	}
	if parameters.TopP != nil && (*parameters.TopP < 0 || *parameters.TopP > 1) {
		return fmt.Errorf("LLM Top P 必须在 0 到 1 之间")
	}
	if parameters.MaxTokens != nil && *parameters.MaxTokens <= 0 {
		return fmt.Errorf("LLM 最大输出 Token 必须大于 0")
	}
	if len(parameters.StopSequences) > 16 {
		return fmt.Errorf("LLM 停止序列最多添加 16 个")
	}
	for index, sequence := range parameters.StopSequences {
		parameters.StopSequences[index] = strings.TrimSpace(sequence)
		if parameters.StopSequences[index] == "" {
			return fmt.Errorf("LLM 停止序列不能为空")
		}
	}
	if !isOneOf(parameters.ResponseFormat, "", "text", "json") {
		return fmt.Errorf("LLM 响应格式无效")
	}
	if !isOneOf(parameters.ReasoningEffort, "", "none", "low", "medium", "high", "xhigh", "max") {
		return fmt.Errorf("LLM 推理强度无效")
	}
	if !isOneOf(parameters.ThinkingMode, "", "enabled", "disabled") {
		return fmt.Errorf("LLM 思考模式无效")
	}
	if parameters.TopK != nil && *parameters.TopK <= 0 {
		return fmt.Errorf("LLM Top K 必须大于 0")
	}
	if parameters.RepeatPenalty != nil && *parameters.RepeatPenalty <= 0 {
		return fmt.Errorf("LLM 重复惩罚必须大于 0")
	}
	if parameters.Seed != nil && *parameters.Seed < 0 {
		return fmt.Errorf("LLM Seed 不能小于 0")
	}

	return nil
}

func isOneOf(value string, allowed ...string) bool {
	for _, candidate := range allowed {
		if value == candidate {
			return true
		}
	}
	return false
}

func configFailure(message string) *ExecutionFailure {
	return &ExecutionFailure{
		Code:      "LLM_CONFIG_INVALID",
		Message:   message,
		Retryable: false,
	}
}
