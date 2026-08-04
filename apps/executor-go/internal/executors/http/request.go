package http

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"mime"
	"mime/multipart"
	stdhttp "net/http"
	"net/textproto"
	"net/url"
	"strconv"
	"strings"

	"node-executor-go/internal/executor"
)

func createRequest(
	ctx context.Context,
	config nodeConfig,
	idempotencyKey string,
) (*stdhttp.Request, *executor.ExecutionFailure) {
	requestURL := *config.URL
	query := requestURL.Query()
	for _, entry := range config.Params {
		value, err := stringifyValue(entry.Value)
		if err != nil {
			return nil, &executor.ExecutionFailure{
				Code:      "HTTP_REQUEST_INVALID",
				Message:   fmt.Sprintf("HTTP 参数 %s 无法转换为文本", entry.Key),
				Retryable: false,
			}
		}
		query.Add(entry.Key, value)
	}
	requestURL.RawQuery = query.Encode()

	body, contentType, err := encodeBody(config.Body)
	if err != nil {
		return nil, &executor.ExecutionFailure{
			Code:      "HTTP_BODY_INVALID",
			Message:   err.Error(),
			Retryable: false,
		}
	}

	request, err := stdhttp.NewRequestWithContext(
		ctx,
		config.Method,
		requestURL.String(),
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, &executor.ExecutionFailure{
			Code:      "HTTP_REQUEST_INVALID",
			Message:   "无法创建 HTTP 请求",
			Retryable: false,
		}
	}
	for _, entry := range config.Headers {
		value, err := stringifyValue(entry.Value)
		if err != nil || strings.ContainsAny(value, "\r\n") {
			return nil, &executor.ExecutionFailure{
				Code:      "HTTP_REQUEST_INVALID",
				Message:   fmt.Sprintf("HTTP Header %s 的值无效", entry.Key),
				Retryable: false,
			}
		}
		request.Header.Add(entry.Key, value)
	}
	if contentType != "" && request.Header.Get("Content-Type") == "" {
		request.Header.Set("Content-Type", contentType)
	}
	if request.Header.Get("Idempotency-Key") == "" {
		request.Header.Set("Idempotency-Key", idempotencyKey)
	}

	return request, nil
}

func encodeBody(body requestBody) ([]byte, string, error) {
	switch body.Type {
	case bodyTypeNone:
		return nil, "", nil
	case bodyTypeFormURLEncoded:
		values := url.Values{}
		for _, entry := range body.Entries {
			value, err := stringifyValue(entry.Value)
			if err != nil {
				return nil, "", fmt.Errorf("参数 %s 无法转换为文本", entry.Key)
			}
			values.Add(entry.Key, value)
		}
		return []byte(values.Encode()), "application/x-www-form-urlencoded", nil
	case bodyTypeFormData:
		return encodeMultipartBody(body.FormDataEntries)
	case bodyTypeJSON:
		value := body.Value
		if text, ok := value.(string); ok {
			if err := json.Unmarshal([]byte(text), &value); err != nil {
				return nil, "", fmt.Errorf("JSON Body 不是合法 JSON")
			}
		}
		data, err := json.Marshal(value)
		if err != nil {
			return nil, "", fmt.Errorf("JSON Body 无法序列化")
		}
		return data, "application/json", nil
	case bodyTypeRaw:
		if text, ok := body.Value.(string); ok {
			return []byte(text), "text/plain; charset=utf-8", nil
		}
		data, err := json.Marshal(body.Value)
		if err != nil {
			return nil, "", fmt.Errorf("Raw Body 无法序列化")
		}
		return data, "text/plain; charset=utf-8", nil
	case bodyTypeBinary:
		data, err := binaryValue(body.Value)
		if err != nil {
			return nil, "", err
		}
		return data, "application/octet-stream", nil
	default:
		return nil, "", fmt.Errorf("Body 类型无效")
	}
}

func encodeMultipartBody(entries []formDataEntry) ([]byte, string, error) {
	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)

	for _, entry := range entries {
		if entry.ValueType == formDataValueText {
			value, err := stringifyValue(entry.Value)
			if err != nil {
				return nil, "", fmt.Errorf("form-data 字段 %s 无法转换为文本", entry.Key)
			}
			if err := writer.WriteField(entry.Key, value); err != nil {
				return nil, "", fmt.Errorf("写入 form-data 字段失败")
			}
			continue
		}

		file, err := parseMultipartFile(entry.Key, entry.Value)
		if err != nil {
			return nil, "", err
		}
		headers := make(textproto.MIMEHeader)
		headers.Set(
			"Content-Disposition",
			fmt.Sprintf(
				`form-data; name=%s; filename=%s`,
				strconv.Quote(entry.Key),
				strconv.Quote(file.Name),
			),
		)
		headers.Set("Content-Type", file.ContentType)
		part, err := writer.CreatePart(headers)
		if err != nil {
			return nil, "", fmt.Errorf("创建 form-data 文件字段失败")
		}
		if _, err := part.Write(file.Data); err != nil {
			return nil, "", fmt.Errorf("写入 form-data 文件字段失败")
		}
	}

	if err := writer.Close(); err != nil {
		return nil, "", fmt.Errorf("结束 form-data 编码失败")
	}
	return buffer.Bytes(), writer.FormDataContentType(), nil
}

type multipartFile struct {
	Name        string
	ContentType string
	Data        []byte
}

func parseMultipartFile(fieldName string, value any) (multipartFile, error) {
	if content, ok := value.(string); ok {
		return multipartFile{
			Name:        fieldName,
			ContentType: "application/octet-stream",
			Data:        []byte(content),
		}, nil
	}

	object, ok := value.(map[string]any)
	if !ok {
		return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 的值格式无效", fieldName)
	}
	name, ok := object["name"].(string)
	if !ok || strings.TrimSpace(name) == "" {
		return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 缺少文件名", fieldName)
	}
	content, ok := object["content"].(string)
	if !ok {
		return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 缺少文件内容", fieldName)
	}
	contentType := "application/octet-stream"
	if configuredContentType, exists := object["contentType"]; exists {
		var valid bool
		contentType, valid = configuredContentType.(string)
		if !valid || strings.TrimSpace(contentType) == "" {
			return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 的 Content-Type 无效", fieldName)
		}
		if _, _, err := mime.ParseMediaType(contentType); err != nil {
			return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 的 Content-Type 无效", fieldName)
		}
	}

	data := []byte(content)
	if configuredEncoding, exists := object["encoding"]; exists {
		encoding, valid := configuredEncoding.(string)
		if !valid {
			return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 的编码无效", fieldName)
		}
		if encoding == "" {
			return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 的编码无效", fieldName)
		}
		if encoding != "base64" {
			return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 的编码无效", fieldName)
		}
		decoded, err := base64.StdEncoding.DecodeString(content)
		if err != nil {
			return multipartFile{}, fmt.Errorf("form-data 文件字段 %s 的 Base64 内容无效", fieldName)
		}
		data = decoded
	}

	return multipartFile{Name: name, ContentType: contentType, Data: data}, nil
}

func binaryValue(value any) ([]byte, error) {
	if text, ok := value.(string); ok {
		return []byte(text), nil
	}

	items, ok := value.([]any)
	if !ok {
		return nil, fmt.Errorf("Binary Body 必须是字符串或 0 到 255 的数字数组")
	}
	data := make([]byte, len(items))
	for index, item := range items {
		number, ok := item.(float64)
		if !ok || number < 0 || number > 255 || number != float64(byte(number)) {
			return nil, fmt.Errorf("Binary Body 第 %d 项不是有效字节", index+1)
		}
		data[index] = byte(number)
	}
	return data, nil
}

func stringifyValue(value any) (string, error) {
	switch typed := value.(type) {
	case nil:
		return "", nil
	case string:
		return typed, nil
	case bool:
		return strconv.FormatBool(typed), nil
	case float64:
		return strconv.FormatFloat(typed, 'f', -1, 64), nil
	default:
		data, err := json.Marshal(typed)
		if err != nil {
			return "", err
		}
		return string(data), nil
	}
}
