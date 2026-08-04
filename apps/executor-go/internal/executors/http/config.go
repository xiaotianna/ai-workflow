package http

import (
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"strings"
	"time"

	"node-executor-go/internal/executor"
)

const (
	bodyTypeNone           = "none"
	bodyTypeFormData       = "form-data"
	bodyTypeFormURLEncoded = "x-www-form-urlencoded"
	bodyTypeJSON           = "json"
	bodyTypeRaw            = "raw"
	bodyTypeBinary         = "binary"

	formDataValueText = "text"
	formDataValueFile = "file"
)

type nodeConfig struct {
	URL               *url.URL
	Method            string
	ConnectionTimeout time.Duration
	Headers           []keyValueEntry
	Params            []keyValueEntry
	Body              requestBody
	ErrorHandling     executor.ErrorHandling
}

type keyValueEntry struct {
	Key   string
	Value any
}

type formDataEntry struct {
	keyValueEntry
	ValueType string
}

type requestBody struct {
	Type            string
	Entries         []keyValueEntry
	FormDataEntries []formDataEntry
	Value           any
}

type rawNodeConfig struct {
	URL               string          `json:"url"`
	Method            string          `json:"method"`
	ConnectionTimeout float64         `json:"connectionTimeout"`
	Headers           []rawEntry      `json:"headers"`
	Params            []rawEntry      `json:"params"`
	Body              rawRequestBody  `json:"body"`
	ErrorHandling     json.RawMessage `json:"errorHandling"`
}

type rawEntry struct {
	ID    string          `json:"id"`
	Key   json.RawMessage `json:"key"`
	Value json.RawMessage `json:"value"`
}

type rawFormDataEntry struct {
	ID        string          `json:"id"`
	Key       json.RawMessage `json:"key"`
	Value     json.RawMessage `json:"value"`
	ValueType string          `json:"valueType"`
}

type rawRequestBody struct {
	Type    string             `json:"type"`
	Entries []rawFormDataEntry `json:"entries"`
	Value   json.RawMessage    `json:"value"`
}

func parseNodeConfig(raw map[string]any) (nodeConfig, *executor.ExecutionFailure) {
	var decoded rawNodeConfig
	if err := executor.DecodeConfig(raw, &decoded); err != nil {
		return nodeConfig{}, configFailure("HTTP 节点配置格式无效")
	}

	parsedURL, err := url.Parse(strings.TrimSpace(decoded.URL))
	if err != nil || parsedURL.Host == "" ||
		(parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return nodeConfig{}, configFailure("HTTP 请求地址必须是完整的 HTTP 或 HTTPS URL")
	}
	if decoded.Method != "GET" && decoded.Method != "POST" && decoded.Method != "PUT" &&
		decoded.Method != "PATCH" && decoded.Method != "DELETE" {
		return nodeConfig{}, configFailure("HTTP 请求方法无效")
	}
	if decoded.ConnectionTimeout <= 0 || math.IsNaN(decoded.ConnectionTimeout) ||
		math.IsInf(decoded.ConnectionTimeout, 0) ||
		decoded.ConnectionTimeout > float64(math.MaxInt64)/float64(time.Second) {
		return nodeConfig{}, configFailure("HTTP 连接超时必须是有效的正数")
	}

	headers, err := parseEntries(decoded.Headers)
	if err != nil {
		return nodeConfig{}, configFailure(fmt.Sprintf("HTTP Headers 配置无效：%s", err))
	}
	for _, header := range headers {
		if !isValidHeaderName(header.Key) {
			return nodeConfig{}, configFailure(fmt.Sprintf("HTTP Header 名称无效：%s", header.Key))
		}
	}
	params, err := parseEntries(decoded.Params)
	if err != nil {
		return nodeConfig{}, configFailure(fmt.Sprintf("HTTP Params 配置无效：%s", err))
	}
	body, err := parseRequestBody(decoded.Body)
	if err != nil {
		return nodeConfig{}, configFailure(fmt.Sprintf("HTTP Body 配置无效：%s", err))
	}
	errorHandling, err := executor.ParseErrorHandling(decoded.ErrorHandling)
	if err != nil {
		return nodeConfig{}, configFailure(fmt.Sprintf("HTTP %s", err))
	}

	return nodeConfig{
		URL:               parsedURL,
		Method:            decoded.Method,
		ConnectionTimeout: time.Duration(decoded.ConnectionTimeout * float64(time.Second)),
		Headers:           headers,
		Params:            params,
		Body:              body,
		ErrorHandling:     errorHandling,
	}, nil
}

func parseEntries(rawEntries []rawEntry) ([]keyValueEntry, error) {
	entries := make([]keyValueEntry, 0, len(rawEntries))
	for _, rawEntry := range rawEntries {
		entry, include, err := parseEntry(rawEntry.Key, rawEntry.Value)
		if err != nil {
			return nil, err
		}
		if include {
			entries = append(entries, entry)
		}
	}
	return entries, nil
}

func parseEntry(rawKey json.RawMessage, rawValue json.RawMessage) (keyValueEntry, bool, error) {
	keyValue, err := decodeJSONValue(rawKey)
	if err != nil {
		return keyValueEntry{}, false, fmt.Errorf("键不是合法 JSON 值")
	}
	key, ok := keyValue.(string)
	if !ok {
		return keyValueEntry{}, false, fmt.Errorf("键必须是字符串")
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return keyValueEntry{}, false, nil
	}

	value, err := decodeJSONValue(rawValue)
	if err != nil {
		return keyValueEntry{}, false, fmt.Errorf("%s 的值不是合法 JSON 值", key)
	}
	return keyValueEntry{Key: key, Value: value}, true, nil
}

func parseRequestBody(raw rawRequestBody) (requestBody, error) {
	switch raw.Type {
	case bodyTypeNone:
		if len(raw.Entries) > 0 || len(raw.Value) > 0 {
			return requestBody{}, fmt.Errorf("none 类型不能包含内容")
		}
		return requestBody{Type: raw.Type}, nil
	case bodyTypeFormURLEncoded:
		if len(raw.Value) > 0 {
			return requestBody{}, fmt.Errorf("URL 编码 Body 不能包含 value")
		}
		entries := make([]keyValueEntry, 0, len(raw.Entries))
		for _, rawEntry := range raw.Entries {
			entry, include, err := parseEntry(rawEntry.Key, rawEntry.Value)
			if err != nil {
				return requestBody{}, err
			}
			if rawEntry.ValueType != "" {
				return requestBody{}, fmt.Errorf("URL 编码 Body 不能包含 valueType")
			}
			if include {
				entries = append(entries, entry)
			}
		}
		return requestBody{Type: raw.Type, Entries: entries}, nil
	case bodyTypeFormData:
		if len(raw.Value) > 0 {
			return requestBody{}, fmt.Errorf("form-data Body 不能包含 value")
		}
		entries := make([]formDataEntry, 0, len(raw.Entries))
		for _, rawEntry := range raw.Entries {
			entry, include, err := parseEntry(rawEntry.Key, rawEntry.Value)
			if err != nil {
				return requestBody{}, err
			}
			if rawEntry.ValueType != formDataValueText && rawEntry.ValueType != formDataValueFile {
				return requestBody{}, fmt.Errorf("form-data 值类型无效")
			}
			if include {
				entries = append(entries, formDataEntry{
					keyValueEntry: entry,
					ValueType:     rawEntry.ValueType,
				})
			}
		}
		return requestBody{Type: raw.Type, FormDataEntries: entries}, nil
	case bodyTypeJSON, bodyTypeRaw, bodyTypeBinary:
		if len(raw.Entries) > 0 {
			return requestBody{}, fmt.Errorf("%s Body 不能包含 entries", raw.Type)
		}
		value, err := decodeJSONValue(raw.Value)
		if err != nil {
			return requestBody{}, fmt.Errorf("%s Body 缺少合法内容", raw.Type)
		}
		return requestBody{Type: raw.Type, Value: value}, nil
	default:
		return requestBody{}, fmt.Errorf("Body 类型无效：%s", raw.Type)
	}
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

func isValidHeaderName(name string) bool {
	if name == "" {
		return false
	}
	for _, character := range name {
		if (character >= 'a' && character <= 'z') ||
			(character >= 'A' && character <= 'Z') ||
			(character >= '0' && character <= '9') ||
			strings.ContainsRune("!#$%&'*+-.^_`|~", character) {
			continue
		}
		return false
	}
	return true
}

func configFailure(message string) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{
		Code:      "HTTP_CONFIG_INVALID",
		Message:   message,
		Retryable: false,
	}
}
