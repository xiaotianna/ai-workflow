import { z } from 'zod'

export const LLM_RESPONSE_FORMAT_VALUES = ['text', 'json'] as const
export const LLM_REASONING_EFFORT_VALUES = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const
export const LLM_THINKING_MODE_VALUES = ['enabled', 'disabled'] as const
export const LLM_CONTEXT_MESSAGE_ROLE_VALUES = ['system', 'assistant', 'user'] as const

const DEFAULT_LLM_CONTEXT = '请根据输入生成回答'

export const llmModelParametersSchema = z.object({
  temperature: z.number().min(0, '温度不能小于 0').max(2, '温度不能大于 2').optional(),
  topP: z.number().min(0, 'Top P 不能小于 0').max(1, 'Top P 不能大于 1').optional(),
  maxTokens: z
    .number()
    .int('最大输出 Token 必须是整数')
    .positive('最大输出 Token 必须大于 0')
    .optional(),
  stopSequences: z
    .array(z.string().trim().min(1, '停止序列不能为空'))
    .max(16, '停止序列最多添加 16 个')
    .optional(),
  responseFormat: z.enum(LLM_RESPONSE_FORMAT_VALUES).optional(),
  reasoningEffort: z.enum(LLM_REASONING_EFFORT_VALUES).optional(),
  thinkingMode: z.enum(LLM_THINKING_MODE_VALUES).optional(),
  topK: z.number().int('Top K 必须是整数').positive('Top K 必须大于 0').optional(),
  repeatPenalty: z.number().positive('重复惩罚必须大于 0').optional(),
  seed: z.number().int('Seed 必须是整数').min(0, 'Seed 不能小于 0').optional(),
})

export const llmModelSchema = z.object({
  groupId: z.string().trim().default(''),
  configuredModelId: z.string().trim().default(''),
  parameters: llmModelParametersSchema.default({}),
})

export const llmContextMessageSchema = z.object({
  id: z.string().trim().min(1, '上下文消息 ID 不能为空'),
  role: z.enum(LLM_CONTEXT_MESSAGE_ROLE_VALUES),
  content: z.string().trim().min(1, '上下文内容不能为空'),
})

export const llmContextMessagesSchema = z
  .array(llmContextMessageSchema)
  .min(1, '至少需要一条上下文消息')
  .superRefine((messages, context) => {
    const ids = new Set<string>()

    messages.forEach((message, index) => {
      if (ids.has(message.id)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: '上下文消息 ID 不能重复',
        })
      }
      ids.add(message.id)
    })
  })

function migrateLegacyPrompt(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const config = value as Record<string, unknown>
  if (Array.isArray(config.messages) || typeof config.prompt !== 'string') return value

  return {
    ...config,
    messages: [
      {
        id: 'legacy-system-message',
        role: 'system',
        content: config.prompt,
      },
    ],
  }
}

/**
 * 运行时可以直接复用：
 * const config = startNodeSchema.parse(rawConfig)
 * config 已获得可靠类型：console.log(config.messages)
 */
export const llmNodeSchema = z.preprocess(
  migrateLegacyPrompt,
  z.object({
    model: llmModelSchema.default({
      groupId: '',
      configuredModelId: '',
      parameters: {},
    }),
    messages: llmContextMessagesSchema.default(() => [
      {
        id: 'default-system-message',
        role: 'system' as const,
        content: DEFAULT_LLM_CONTEXT,
      },
    ]),
  }),
)

export type LlmModelParametersInput = z.input<typeof llmModelParametersSchema>
export type LlmModelParameters = z.output<typeof llmModelParametersSchema>
export type LlmModelConfig = z.output<typeof llmModelSchema>
export type LlmContextMessageRole = (typeof LLM_CONTEXT_MESSAGE_ROLE_VALUES)[number]
export type LlmContextMessageInput = z.input<typeof llmContextMessageSchema>
export type LlmContextMessage = z.output<typeof llmContextMessageSchema>
export type LlmNodeConfig = z.output<typeof llmNodeSchema>
