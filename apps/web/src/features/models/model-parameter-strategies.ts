import { llmModelParametersSchema, type LlmModelParametersInput } from '@ai-workflow/core'

import type { ModelProviderType } from './schema'

export type ModelParameterControl = 'number' | 'select' | 'slider' | 'string-list'
export type ModelParameterKey = keyof LlmModelParametersInput
export type ModelParameterValue = NonNullable<LlmModelParametersInput[ModelParameterKey]>
type ModelParameterStringValue = Extract<ModelParameterValue, string>

export interface ModelParameterOption {
  label: string
  value: ModelParameterStringValue
}

export interface ModelParameterContext {
  modelId: string
  parameters: LlmModelParametersInput
}

export interface ModelParameterDefinition {
  control: ModelParameterControl
  initialValue: ModelParameterValue
  key: ModelParameterKey
  label: string
  max?: number
  maxItems?: number
  min?: number
  options?: readonly ModelParameterOption[]
  placeholder?: string
  step?: number
  visible?: (context: ModelParameterContext) => boolean
}

interface ModelParameterStrategy {
  definitions: readonly ModelParameterDefinition[]
  providerType: ModelProviderType
}

const temperatureParameter = {
  key: 'temperature',
  label: '温度',
  control: 'slider',
  initialValue: 0.7,
  min: 0,
  max: 2,
  step: 0.1,
} satisfies ModelParameterDefinition

const topPParameter = {
  key: 'topP',
  label: 'Top P',
  control: 'slider',
  initialValue: 1,
  min: 0,
  max: 1,
  step: 0.05,
} satisfies ModelParameterDefinition

const maxTokensParameter = {
  key: 'maxTokens',
  label: '最大输出 Token',
  control: 'number',
  initialValue: 1024,
  min: 1,
  step: 1,
  placeholder: '1024',
} satisfies ModelParameterDefinition

const stopSequencesParameter = {
  key: 'stopSequences',
  label: '停止序列',
  control: 'string-list',
  initialValue: [],
  maxItems: 16,
  placeholder: '输入停止序列',
} satisfies ModelParameterDefinition

const responseFormatParameter = {
  key: 'responseFormat',
  label: '响应格式',
  control: 'select',
  initialValue: 'text',
  options: [
    { label: '文本', value: 'text' },
    { label: 'JSON', value: 'json' },
  ],
} satisfies ModelParameterDefinition

const openAiReasoningEffortParameter = {
  key: 'reasoningEffort',
  label: '推理强度',
  control: 'select',
  initialValue: 'medium',
  options: [
    { label: '无', value: 'none' },
    { label: '低', value: 'low' },
    { label: '中', value: 'medium' },
    { label: '高', value: 'high' },
    { label: '更高', value: 'xhigh' },
    { label: '最高', value: 'max' },
  ],
  visible: ({ modelId }: ModelParameterContext) =>
    /^(?:gpt-?5(?:[.-]|$)|o[1-9](?:[.-]|$))/i.test(modelId),
} satisfies ModelParameterDefinition

const deepSeekThinkingModeParameter = {
  key: 'thinkingMode',
  label: '思考模式',
  control: 'select',
  initialValue: 'enabled',
  options: [
    { label: '开启', value: 'enabled' },
    { label: '关闭', value: 'disabled' },
  ],
} satisfies ModelParameterDefinition

const deepSeekReasoningEffortParameter = {
  key: 'reasoningEffort',
  label: '推理强度',
  control: 'select',
  initialValue: 'high',
  options: [
    { label: '高', value: 'high' },
    { label: '最高', value: 'max' },
  ],
  visible: ({ parameters }: ModelParameterContext) => parameters.thinkingMode !== 'disabled',
} satisfies ModelParameterDefinition

const deepSeekTemperatureParameter = {
  ...temperatureParameter,
  visible: ({ parameters }: ModelParameterContext) => parameters.thinkingMode === 'disabled',
} satisfies ModelParameterDefinition

const deepSeekTopPParameter = {
  ...topPParameter,
  visible: ({ parameters }: ModelParameterContext) => parameters.thinkingMode === 'disabled',
} satisfies ModelParameterDefinition

const topKParameter = {
  key: 'topK',
  label: 'Top K',
  control: 'number',
  initialValue: 40,
  min: 1,
  step: 1,
  placeholder: '40',
} satisfies ModelParameterDefinition

const repeatPenaltyParameter = {
  key: 'repeatPenalty',
  label: '重复惩罚',
  control: 'slider',
  initialValue: 1.1,
  min: 0.1,
  max: 2,
  step: 0.1,
} satisfies ModelParameterDefinition

const seedParameter = {
  key: 'seed',
  label: 'Seed',
  control: 'number',
  initialValue: 0,
  min: 0,
  step: 1,
  placeholder: '0',
} satisfies ModelParameterDefinition

const modelParameterStrategies: Record<ModelProviderType, ModelParameterStrategy> = {
  openai: {
    providerType: 'openai',
    definitions: [
      temperatureParameter,
      topPParameter,
      maxTokensParameter,
      stopSequencesParameter,
      responseFormatParameter,
      openAiReasoningEffortParameter,
    ],
  },
  deepseek: {
    providerType: 'deepseek',
    definitions: [
      deepSeekThinkingModeParameter,
      deepSeekReasoningEffortParameter,
      deepSeekTemperatureParameter,
      deepSeekTopPParameter,
      maxTokensParameter,
      stopSequencesParameter,
      responseFormatParameter,
    ],
  },
  ollama: {
    providerType: 'ollama',
    definitions: [
      temperatureParameter,
      topPParameter,
      topKParameter,
      maxTokensParameter,
      repeatPenaltyParameter,
      seedParameter,
      stopSequencesParameter,
      responseFormatParameter,
    ],
  },
}

export function getModelParameterDefinitions(
  providerType: ModelProviderType,
  context: ModelParameterContext,
): readonly ModelParameterDefinition[] {
  return modelParameterStrategies[providerType].definitions.filter(
    (definition) => definition.visible?.(context) ?? true,
  )
}

export function normalizeModelParameters(
  providerType: ModelProviderType,
  modelId: string,
  parameters: LlmModelParametersInput,
): LlmModelParametersInput {
  const definitions = getModelParameterDefinitions(providerType, { modelId, parameters })
  const normalized: Record<string, unknown> = {}

  for (const definition of definitions) {
    const { key } = definition
    const value = parameters[key] ?? definition.initialValue

    if (Array.isArray(value) && value.length === 0) continue
    normalized[key] = value
  }

  return llmModelParametersSchema.parse(normalized)
}
