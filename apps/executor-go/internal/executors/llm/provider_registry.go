package llm

import "fmt"

type ProviderRegistry struct {
	providers map[string]Provider
}

func NewBuiltinProviderRegistry(client HTTPClient) *ProviderRegistry {
	registry := &ProviderRegistry{providers: make(map[string]Provider)}
	registry.Register(NewOpenAICompatibleProvider("openai", client))
	registry.Register(NewOpenAICompatibleProvider("deepseek", client))
	registry.Register(NewOllamaProvider(client))
	return registry
}

func (registry *ProviderRegistry) Register(provider Provider) {
	providerType := provider.Type()
	if providerType == "" {
		panic("LLM provider type cannot be empty")
	}
	if _, exists := registry.providers[providerType]; exists {
		panic(fmt.Sprintf("LLM provider already registered: %s", providerType))
	}
	registry.providers[providerType] = provider
}

func (registry *ProviderRegistry) Resolve(providerType string) (Provider, bool) {
	provider, exists := registry.providers[providerType]
	return provider, exists
}
