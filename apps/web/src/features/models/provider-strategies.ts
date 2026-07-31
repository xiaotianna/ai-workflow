import { type ComponentType, type SVGProps } from 'react'

import {
  DeepSeekProviderIcon,
  OllamaProviderIcon,
  OpenAIProviderIcon,
} from './components/provider-icons'
import { type ModelProviderType } from './schema'

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
  requiresApiKey: boolean
  configurationFields: readonly ModelProviderConfigurationField[]
  icon: ComponentType<SVGProps<SVGSVGElement>>
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

const openAiStrategy: ModelProviderStrategy = {
  type: 'openai',
  label: 'OpenAI',
  description: 'OpenAI 兼容接口',
  defaultBaseUrl: 'https://api.openai.com/v1',
  apiDocsUrl: 'https://developers.openai.com/api/reference/overview',
  requiresApiKey: true,
  configurationFields: [
    createBaseUrlField('https://api.openai.com/v1'),
    createApiKeyField('sk-...'),
  ],
  icon: OpenAIProviderIcon,
}

const deepSeekStrategy: ModelProviderStrategy = {
  type: 'deepseek',
  label: 'DeepSeek',
  description: 'DeepSeek 官方接口',
  defaultBaseUrl: 'https://api.deepseek.com',
  apiDocsUrl: 'https://api-docs.deepseek.com/',
  requiresApiKey: true,
  configurationFields: [
    createBaseUrlField('https://api.deepseek.com'),
    createApiKeyField('sk-...'),
  ],
  icon: DeepSeekProviderIcon,
}

const ollamaStrategy: ModelProviderStrategy = {
  type: 'ollama',
  label: 'Ollama',
  description: '本地 Ollama 服务',
  defaultBaseUrl: 'http://localhost:11434',
  apiDocsUrl: 'https://docs.ollama.com/api/introduction',
  requiresApiKey: false,
  configurationFields: [createBaseUrlField('http://localhost:11434')],
  icon: OllamaProviderIcon,
}

export const modelProviderStrategies = [
  openAiStrategy,
  deepSeekStrategy,
  ollamaStrategy,
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
