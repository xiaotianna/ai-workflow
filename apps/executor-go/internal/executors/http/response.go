package http

import (
	"encoding/json"
	"mime"
	stdhttp "net/http"
	"strings"

	"node-executor-go/internal/executor"
)

func decodeResponseData(contentType string, data []byte) (any, *executor.ExecutionFailure) {
	if len(data) == 0 {
		return nil, nil
	}

	mediaType, _, err := mime.ParseMediaType(contentType)
	isJSON := err == nil && (mediaType == "application/json" || strings.HasSuffix(mediaType, "+json"))
	if !isJSON {
		return string(data), nil
	}

	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		return nil, &executor.ExecutionFailure{
			Code:      "HTTP_RESPONSE_INVALID_JSON",
			Message:   "HTTP 服务返回了无效 JSON",
			Retryable: false,
		}
	}
	return value, nil
}

func responseHeaders(headers stdhttp.Header) map[string]any {
	result := make(map[string]any, len(headers))
	for name, values := range headers {
		copiedValues := append([]string(nil), values...)
		result[name] = copiedValues
	}
	return result
}
