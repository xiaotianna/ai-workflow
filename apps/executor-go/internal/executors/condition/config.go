package condition

import (
	"encoding/json"
	"fmt"
	"strings"

	"node-executor-go/internal/executor"
)

const (
	logicalOperatorAnd = "and"
	logicalOperatorOr  = "or"
)

const (
	operatorContains    = "contains"
	operatorNotContains = "not_contains"
	operatorStartsWith  = "starts_with"
	operatorEndsWith    = "ends_with"
	operatorEquals      = "equals"
	operatorNotEquals   = "not_equals"
	operatorIsEmpty     = "is_empty"
	operatorIsNotEmpty  = "is_not_empty"
)

type nodeConfig struct {
	Conditions []conditionItem `json:"conditions"`
}

type conditionItem struct {
	PortID          string          `json:"portId"`
	ConditionLabel  string          `json:"conditionLabel"`
	IsFallback      bool            `json:"isFallback"`
	LogicalOperator string          `json:"logicalOperator"`
	Rules           []conditionRule `json:"rules"`
}

type conditionRule struct {
	ID       string
	Left     any
	Operator string
	Right    any
	HasRight bool
}

type rawConditionRule struct {
	ID       string          `json:"id"`
	Left     json.RawMessage `json:"left"`
	Operator string          `json:"operator"`
	Right    json.RawMessage `json:"right"`
}

type rawConditionItem struct {
	PortID          string             `json:"portId"`
	ConditionLabel  string             `json:"conditionLabel"`
	IsFallback      bool               `json:"isFallback"`
	LogicalOperator string             `json:"logicalOperator"`
	Rules           []rawConditionRule `json:"rules"`
}

type rawNodeConfig struct {
	Conditions []rawConditionItem `json:"conditions"`
}

func parseNodeConfig(raw map[string]any) (nodeConfig, *executor.ExecutionFailure) {
	var decoded rawNodeConfig
	if err := executor.DecodeConfig(raw, &decoded); err != nil {
		return nodeConfig{}, configFailure("Condition 节点配置格式无效")
	}
	if len(decoded.Conditions) < 2 {
		return nodeConfig{}, configFailure("Condition 节点至少需要一个条件分支和一个 ELSE 分支")
	}

	portIDs := make(map[string]struct{}, len(decoded.Conditions))
	ruleIDs := make(map[string]struct{})
	fallbackIndex := -1
	conditions := make([]conditionItem, 0, len(decoded.Conditions))

	for conditionIndex, rawCondition := range decoded.Conditions {
		rawCondition.PortID = strings.TrimSpace(rawCondition.PortID)
		if rawCondition.PortID == "" {
			return nodeConfig{}, configFailure("Condition 分支端口 ID 不能为空")
		}
		if _, exists := portIDs[rawCondition.PortID]; exists {
			return nodeConfig{}, configFailure("Condition 分支端口 ID 不能重复")
		}
		portIDs[rawCondition.PortID] = struct{}{}
		if strings.TrimSpace(rawCondition.ConditionLabel) == "" {
			return nodeConfig{}, configFailure("Condition 分支名称不能为空")
		}

		if rawCondition.IsFallback {
			if fallbackIndex >= 0 {
				return nodeConfig{}, configFailure("Condition 节点只能存在一个 ELSE 分支")
			}
			fallbackIndex = conditionIndex
			if len(rawCondition.Rules) > 0 {
				return nodeConfig{}, configFailure("Condition 的 ELSE 分支不能配置条件")
			}
		}

		if rawCondition.LogicalOperator != logicalOperatorAnd &&
			rawCondition.LogicalOperator != logicalOperatorOr {
			return nodeConfig{}, configFailure("Condition 分支逻辑运算符无效")
		}

		rules := make([]conditionRule, 0, len(rawCondition.Rules))
		for _, rawRule := range rawCondition.Rules {
			rawRule.ID = strings.TrimSpace(rawRule.ID)
			if rawRule.ID == "" {
				return nodeConfig{}, configFailure("Condition 条件 ID 不能为空")
			}
			if _, exists := ruleIDs[rawRule.ID]; exists {
				return nodeConfig{}, configFailure("Condition 条件 ID 不能重复")
			}
			ruleIDs[rawRule.ID] = struct{}{}

			left, err := decodeJSONValue(rawRule.Left)
			if err != nil {
				return nodeConfig{}, configFailure("Condition 条件左值无效")
			}
			if !isConditionOperator(rawRule.Operator) {
				return nodeConfig{}, configFailure(fmt.Sprintf("Condition 条件运算符无效：%s", rawRule.Operator))
			}

			requiresRight := conditionOperatorRequiresRight(rawRule.Operator)
			if requiresRight && len(rawRule.Right) == 0 {
				return nodeConfig{}, configFailure("Condition 条件缺少右值")
			}
			if !requiresRight && len(rawRule.Right) > 0 {
				return nodeConfig{}, configFailure("Condition 当前运算符不能配置右值")
			}

			rule := conditionRule{
				ID:       rawRule.ID,
				Left:     left,
				Operator: rawRule.Operator,
				HasRight: requiresRight,
			}
			if requiresRight {
				right, err := decodeJSONValue(rawRule.Right)
				if err != nil {
					return nodeConfig{}, configFailure("Condition 条件右值无效")
				}
				rule.Right = right
			}
			rules = append(rules, rule)
		}

		conditions = append(conditions, conditionItem{
			PortID:          rawCondition.PortID,
			ConditionLabel:  strings.TrimSpace(rawCondition.ConditionLabel),
			IsFallback:      rawCondition.IsFallback,
			LogicalOperator: rawCondition.LogicalOperator,
			Rules:           rules,
		})
	}

	if fallbackIndex < 0 {
		return nodeConfig{}, configFailure("Condition 节点缺少 ELSE 分支")
	}
	if fallbackIndex != len(decoded.Conditions)-1 {
		return nodeConfig{}, configFailure("Condition 的 ELSE 分支必须位于最后")
	}

	return nodeConfig{Conditions: conditions}, nil
}

func decodeJSONValue(raw json.RawMessage) (any, error) {
	if len(raw) == 0 {
		return nil, fmt.Errorf("JSON value is missing")
	}

	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	return value, nil
}

func isConditionOperator(operator string) bool {
	switch operator {
	case operatorContains,
		operatorNotContains,
		operatorStartsWith,
		operatorEndsWith,
		operatorEquals,
		operatorNotEquals,
		operatorIsEmpty,
		operatorIsNotEmpty:
		return true
	default:
		return false
	}
}

func conditionOperatorRequiresRight(operator string) bool {
	return operator != operatorIsEmpty && operator != operatorIsNotEmpty
}

func configFailure(message string) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{
		Code:      "CONDITION_CONFIG_INVALID",
		Message:   message,
		Retryable: false,
	}
}
