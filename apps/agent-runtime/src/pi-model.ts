import type { AgentResolvedModel } from '@ai-workflow/agent-protocol'
import { createModels, createProvider, type Model } from '@earendil-works/pi-ai'
import * as completions from '@earendil-works/pi-ai/api/openai-completions'

export function createPiModel(config: AgentResolvedModel) {
  const baseUrl =
      config.providerType === 'ollama'
        ? `${config.baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
        : config.baseUrl.replace(/\/+$/, ''),
    model: Model<'openai-completions'> = {
      id: config.modelId,
      name: config.modelId,
      api: 'openai-completions',
      provider: config.providerType,
      baseUrl,
      reasoning: false,
      input: ['text', 'image'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 32_768,
      // Pi 必填元数据；使用原始 stream 将输出长度交由供应商决定。
      maxTokens: 0,
      compat: {
        supportsStore: false,
        supportsDeveloperRole: false,
        supportsUsageInStreaming: config.providerType !== 'ollama',
        maxTokensField: 'max_tokens',
      },
    },
    models = createModels({
      authContext: { env: async () => undefined, fileExists: async () => false },
    })
  models.setProvider(
    createProvider({
      id: config.providerType,
      models: [model],
      api: completions,
      auth: {
        apiKey: {
          name: 'Server supplied credential',
          resolve: async () => ({ auth: { apiKey: config.apiKey ?? 'ollama' } }),
        },
      },
    }),
  )
  return { model, streamFn: models.stream.bind(models) }
}
