package llm

import "context"

type ProviderMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ProviderRequest struct {
	Messages   []ProviderMessage
	Parameters ModelParameters
}

type Provider interface {
	Type() string
	Execute(context.Context, ResolvedModel, ProviderRequest) (string, *ExecutionFailure)
}
