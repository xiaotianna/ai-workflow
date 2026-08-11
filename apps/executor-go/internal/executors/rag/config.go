package rag

import (
	"strings"
	"unicode/utf8"

	"node-executor-go/internal/executor"
)

const maxQueryLength = 10_000

type nodeConfig struct {
	Query string
}

type knowledgeBaseReference struct {
	ID    string `json:"id"`
	Title string `json:"title,omitempty"`
	Icon  string `json:"icon,omitempty"`
}

type rawNodeConfig struct {
	Query          string                   `json:"query"`
	KnowledgeBases []knowledgeBaseReference `json:"knowledgeBases"`
	TopK           int                      `json:"topK"`
}

func parseNodeConfig(raw map[string]any) (nodeConfig, *executor.ExecutionFailure) {
	var decoded rawNodeConfig
	if err := executor.DecodeConfig(raw, &decoded); err != nil {
		return nodeConfig{}, configFailure("知识库节点配置格式无效")
	}

	query := strings.TrimSpace(decoded.Query)
	if query == "" {
		return nodeConfig{}, &executor.ExecutionFailure{
			Code:      "RAG_QUERY_INVALID",
			Message:   "知识库检索内容不能为空",
			Retryable: false,
		}
	}
	if utf8.RuneCountInString(query) > maxQueryLength {
		return nodeConfig{}, &executor.ExecutionFailure{
			Code:      "RAG_QUERY_INVALID",
			Message:   "知识库检索内容不能超过 10000 个字符",
			Retryable: false,
		}
	}
	if len(decoded.KnowledgeBases) == 0 {
		return nodeConfig{}, configFailure("知识库节点尚未选择知识库")
	}

	knowledgeBaseIDs := make(map[string]struct{}, len(decoded.KnowledgeBases))
	for _, knowledgeBase := range decoded.KnowledgeBases {
		knowledgeBaseID := strings.TrimSpace(knowledgeBase.ID)
		if knowledgeBaseID == "" {
			return nodeConfig{}, configFailure("知识库 ID 不能为空")
		}
		if _, exists := knowledgeBaseIDs[knowledgeBaseID]; exists {
			return nodeConfig{}, configFailure("不能重复引用同一个知识库")
		}
		knowledgeBaseIDs[knowledgeBaseID] = struct{}{}
	}
	if decoded.TopK < 1 || decoded.TopK > 20 {
		return nodeConfig{}, configFailure("知识库 Top K 必须在 1 到 20 之间")
	}

	return nodeConfig{Query: query}, nil
}

func configFailure(message string) *executor.ExecutionFailure {
	return &executor.ExecutionFailure{
		Code:      "RAG_CONFIG_INVALID",
		Message:   message,
		Retryable: false,
	}
}
