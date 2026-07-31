import { type ComponentType, type SVGProps } from 'react'

import {
  DeepSeekProviderIcon,
  OllamaProviderIcon,
  OpenAIProviderIcon,
} from './components/provider-icons'
import {
  type ModelConnection,
  type ModelGroup,
  type ModelGroupInput,
  type ModelProviderType,
} from './schema'

interface CreateModelGroupOptions {
  enabled?: boolean
  id: string
}

export type ModelProviderConfigurationFieldName = 'baseUrl' | 'apiKey'

export interface ModelProviderConfigurationField {
  name: ModelProviderConfigurationFieldName
  label: string
  type?: 'password' | 'text'
  autoComplete: string
  maxLength: number
  placeholder: string
}

export interface ModelProviderStrategy {
  type: ModelProviderType
  label: string
  description: string
  defaultBaseUrl: string
  apiDocsUrl: string
  configurationFields: readonly ModelProviderConfigurationField[]
  icon: ComponentType<SVGProps<SVGSVGElement>>
  createGroup: (input: ModelGroupInput, options: CreateModelGroupOptions) => ModelGroup
  createDefaultGroup: () => ModelGroup
  testConnection: (input: ModelConnection, signal: AbortSignal) => Promise<void>
}

function createBaseUrlField(placeholder: string): ModelProviderConfigurationField {
  return {
    name: 'baseUrl',
    label: 'Base URL',
    type: 'text',
    autoComplete: 'url',
    maxLength: 300,
    placeholder,
  }
}

function createApiKeyField(placeholder: string): ModelProviderConfigurationField {
  return {
    name: 'apiKey',
    label: 'Key',
    type: 'password',
    autoComplete: 'new-password',
    maxLength: 300,
    placeholder,
  }
}

function createConnectionTestUrl(baseUrl: string, pathname: string) {
  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, '')}/`
  return new URL(pathname, normalizedBaseUrl)
}

async function testConnectionRequest(url: URL, signal: AbortSignal): Promise<void> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (response.ok || response.status === 401 || response.status === 403) return

  throw new Error(`模型服务响应异常（HTTP ${response.status}）`)
}

class OpenAIProviderStrategy implements ModelProviderStrategy {
  readonly type = 'openai'
  readonly label = 'OpenAI'
  readonly description = 'OpenAI 兼容接口'
  readonly defaultBaseUrl = 'https://api.openai.com/v1'
  readonly apiDocsUrl = 'https://developers.openai.com/api/reference/overview'
  readonly configurationFields = [
    createBaseUrlField(this.defaultBaseUrl),
    createApiKeyField('sk-...'),
  ]
  readonly icon = OpenAIProviderIcon

  createGroup(input: ModelGroupInput, options: CreateModelGroupOptions): ModelGroup {
    return {
      ...input,
      id: options.id,
      enabled: options.enabled ?? true,
    }
  }

  createDefaultGroup(): ModelGroup {
    return this.createGroup(
      {
        name: 'OpenAI',
        providerType: this.type,
        baseUrl: undefined,
        apiKey: undefined,
        models: [
          {
            modelId: 'gpt-4.1',
            displayName: 'GPT-4.1',
            enabled: false,
          },
          {
            modelId: 'gpt-4o-mini',
            displayName: 'GPT-4o mini',
            enabled: false,
          },
        ],
      },
      {
        id: 'builtin-openai',
        enabled: false,
      },
    )
  }

  testConnection(input: ModelConnection, signal: AbortSignal): Promise<void> {
    const url = createConnectionTestUrl(input.baseUrl ?? this.defaultBaseUrl, 'models')
    return testConnectionRequest(url, signal)
  }
}

class DeepSeekProviderStrategy implements ModelProviderStrategy {
  readonly type = 'deepseek'
  readonly label = 'DeepSeek'
  readonly description = 'DeepSeek 官方接口'
  readonly defaultBaseUrl = 'https://api.deepseek.com'
  readonly apiDocsUrl = 'https://api-docs.deepseek.com/'
  readonly configurationFields = [
    createBaseUrlField(this.defaultBaseUrl),
    createApiKeyField('sk-...'),
  ]
  readonly icon = DeepSeekProviderIcon

  createGroup(input: ModelGroupInput, options: CreateModelGroupOptions): ModelGroup {
    return {
      ...input,
      id: options.id,
      enabled: options.enabled ?? true,
    }
  }

  createDefaultGroup(): ModelGroup {
    return this.createGroup(
      {
        name: 'DeepSeek',
        providerType: this.type,
        baseUrl: undefined,
        apiKey: undefined,
        models: [
          {
            modelId: 'deepseek-v4-pro',
            displayName: 'DeepSeek V4 Pro',
            enabled: false,
          },
          {
            modelId: 'deepseek-v4-flash',
            displayName: 'DeepSeek V4 Flash',
            enabled: false,
          },
        ],
      },
      {
        id: 'builtin-deepseek',
        enabled: false,
      },
    )
  }

  testConnection(input: ModelConnection, signal: AbortSignal): Promise<void> {
    const url = createConnectionTestUrl(input.baseUrl ?? this.defaultBaseUrl, 'models')
    return testConnectionRequest(url, signal)
  }
}

class OllamaProviderStrategy implements ModelProviderStrategy {
  readonly type = 'ollama'
  readonly label = 'Ollama'
  readonly description = '本地 Ollama 服务'
  readonly defaultBaseUrl = 'http://localhost:11434'
  readonly apiDocsUrl = 'https://docs.ollama.com/api/introduction'
  readonly configurationFields = [createBaseUrlField(this.defaultBaseUrl)]
  readonly icon = OllamaProviderIcon

  createGroup(input: ModelGroupInput, options: CreateModelGroupOptions): ModelGroup {
    return {
      ...input,
      id: options.id,
      enabled: options.enabled ?? true,
    }
  }

  createDefaultGroup(): ModelGroup {
    return this.createGroup(
      {
        name: 'Ollama',
        providerType: this.type,
        baseUrl: this.defaultBaseUrl,
        apiKey: undefined,
        models: [
          {
            modelId: 'qwen2.5',
            displayName: 'Qwen 2.5',
            enabled: false,
          },
          {
            modelId: 'llama3.2',
            displayName: 'Llama 3.2',
            enabled: false,
          },
        ],
      },
      {
        id: 'builtin-ollama',
        enabled: false,
      },
    )
  }

  testConnection(input: ModelConnection, signal: AbortSignal): Promise<void> {
    const url = createConnectionTestUrl(input.baseUrl ?? this.defaultBaseUrl, 'api/tags')
    return testConnectionRequest(url, signal)
  }
}

export const modelProviderStrategies = [
  new OpenAIProviderStrategy(),
  new DeepSeekProviderStrategy(),
  new OllamaProviderStrategy(),
] satisfies readonly ModelProviderStrategy[]

const modelProviderStrategyMap = new Map(
  modelProviderStrategies.map((strategy) => [strategy.type, strategy]),
)

export function getModelProviderStrategy(type: ModelProviderType): ModelProviderStrategy {
  const strategy = modelProviderStrategyMap.get(type)

  if (!strategy) {
    throw new Error(`未注册模型供应商策略：${type}`)
  }

  return strategy
}
