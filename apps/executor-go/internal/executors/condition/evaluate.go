package condition

import (
	"reflect"
	"strings"
)

func resolveBranch(config nodeConfig) string {
	for _, condition := range config.Conditions {
		if condition.IsFallback || matchesCondition(condition) {
			return condition.PortID
		}
	}

	return ""
}

func matchesCondition(condition conditionItem) bool {
	if len(condition.Rules) == 0 {
		return false
	}

	if condition.LogicalOperator == logicalOperatorOr {
		for _, rule := range condition.Rules {
			if evaluateRule(rule) {
				return true
			}
		}
		return false
	}

	for _, rule := range condition.Rules {
		if !evaluateRule(rule) {
			return false
		}
	}
	return true
}

func evaluateRule(rule conditionRule) bool {
	switch rule.Operator {
	case operatorContains:
		return contains(rule.Left, rule.Right)
	case operatorNotContains:
		return !contains(rule.Left, rule.Right)
	case operatorStartsWith:
		left, leftOK := rule.Left.(string)
		right, rightOK := rule.Right.(string)
		return leftOK && rightOK && strings.HasPrefix(left, right)
	case operatorEndsWith:
		left, leftOK := rule.Left.(string)
		right, rightOK := rule.Right.(string)
		return leftOK && rightOK && strings.HasSuffix(left, right)
	case operatorEquals:
		return jsonValuesEqual(rule.Left, rule.Right)
	case operatorNotEquals:
		return !jsonValuesEqual(rule.Left, rule.Right)
	case operatorIsEmpty:
		return isEmpty(rule.Left)
	case operatorIsNotEmpty:
		return !isEmpty(rule.Left)
	default:
		return false
	}
}

func contains(left any, right any) bool {
	switch value := left.(type) {
	case string:
		candidate, ok := right.(string)
		return ok && strings.Contains(value, candidate)
	case []any:
		for _, item := range value {
			if jsonValuesEqual(item, right) {
				return true
			}
		}
		return false
	case map[string]any:
		key, ok := right.(string)
		if !ok {
			return false
		}
		_, exists := value[key]
		return exists
	default:
		return false
	}
}

func jsonValuesEqual(left any, right any) bool {
	leftNumber, leftIsNumber := toFloat64(left)
	rightNumber, rightIsNumber := toFloat64(right)
	if leftIsNumber && rightIsNumber {
		return leftNumber == rightNumber
	}

	return reflect.DeepEqual(left, right)
}

func toFloat64(value any) (float64, bool) {
	switch number := value.(type) {
	case float64:
		return number, true
	case float32:
		return float64(number), true
	case int:
		return float64(number), true
	case int8:
		return float64(number), true
	case int16:
		return float64(number), true
	case int32:
		return float64(number), true
	case int64:
		return float64(number), true
	case uint:
		return float64(number), true
	case uint8:
		return float64(number), true
	case uint16:
		return float64(number), true
	case uint32:
		return float64(number), true
	case uint64:
		return float64(number), true
	default:
		return 0, false
	}
}

func isEmpty(value any) bool {
	switch typed := value.(type) {
	case nil:
		return true
	case string:
		return len(typed) == 0
	case []any:
		return len(typed) == 0
	case map[string]any:
		return len(typed) == 0
	default:
		return false
	}
}
