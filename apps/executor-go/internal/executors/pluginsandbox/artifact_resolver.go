package pluginsandbox

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"
)

const maxArtifactSourceBytes = 1024 * 1024

type artifactResolver struct {
	endpoint string
	token    string
	client   *http.Client
}

type artifactResolution struct {
	Source string `json:"source"`
	SHA256 string `json:"sha256"`
}

type artifactResolutionResponse struct {
	Code    int                 `json:"code"`
	Message string              `json:"message"`
	Data    *artifactResolution `json:"data"`
}

func newArtifactResolver(endpoint string, token string) (*artifactResolver, error) {
	parsed, err := url.Parse(strings.TrimSpace(endpoint))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, fmt.Errorf("插件制品解析地址必须是完整的 HTTP 或 HTTPS URL")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, fmt.Errorf("插件制品解析地址不能包含凭证、Query 或 Fragment")
	}
	return &artifactResolver{endpoint: parsed.String(), token: strings.TrimSpace(token), client: &http.Client{}}, nil
}

func (resolver *artifactResolver) Resolve(ctx context.Context, command protocol.ExecuteNodeCommand) (artifactResolution, *executor.ExecutionFailure) {
	artifact := command.SandboxArtifact
	if artifact == nil {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件执行命令缺少制品引用", false)
	}
	payload, err := json.Marshal(map[string]any{
		"commandId": command.CommandID, "runId": command.RunID, "nodeRunId": command.NodeRunID,
		"nodeId": command.NodeID, "executionKey": command.ExecutionKey, "leaseToken": command.LeaseToken,
		"pluginVersionId": artifact.PluginVersionID, "artifactDigest": artifact.ArtifactDigest,
		"artifactPath": artifact.ArtifactPath,
	})
	if err != nil {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件制品请求无法序列化", false)
	}
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, resolver.endpoint, bytes.NewReader(payload))
	if err != nil {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_UNAVAILABLE", "无法创建插件制品请求", true)
	}
	httpRequest.Header.Set("Accept", "application/json")
	httpRequest.Header.Set("Content-Type", "application/json")
	if resolver.token != "" {
		httpRequest.Header.Set("Authorization", "Bearer "+resolver.token)
	}
	response, err := resolver.client.Do(httpRequest)
	if err != nil {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_UNAVAILABLE", "无法读取插件制品", true)
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		retryable := response.StatusCode >= http.StatusInternalServerError
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_UNAVAILABLE", fmt.Sprintf("插件制品服务返回 HTTP %d", response.StatusCode), retryable)
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, maxArtifactSourceBytes+64*1024+1))
	if err != nil || len(data) > maxArtifactSourceBytes+64*1024 {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件制品响应超过大小限制", false)
	}
	var decoded artifactResolutionResponse
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&decoded); err != nil {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件制品响应格式无效", false)
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件制品响应包含多余内容", false)
	}
	if decoded.Data == nil {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件制品响应缺少 data", false)
	}
	resolved := *decoded.Data
	if strings.TrimSpace(resolved.Source) == "" || len(resolved.Source) > maxArtifactSourceBytes || len(resolved.SHA256) != sha256.Size*2 {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_INVALID", "插件制品内容无效", false)
	}
	digest := sha256.Sum256([]byte(resolved.Source))
	if !strings.EqualFold(hex.EncodeToString(digest[:]), resolved.SHA256) {
		return artifactResolution{}, pluginFailure("PLUGIN_ARTIFACT_DIGEST_MISMATCH", "插件 Executor 文件摘要不匹配", false)
	}
	return resolved, nil
}
