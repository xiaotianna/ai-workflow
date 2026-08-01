import { z } from 'zod'

export const ragKnowledgeBaseIdsSchema = z
  .array(z.string().trim().min(1, '知识库 ID 不能为空'))
  .default([])
  .superRefine((knowledgeBaseIds, context) => {
    const uniqueKnowledgeBaseIds = new Set<string>()

    knowledgeBaseIds.forEach((knowledgeBaseId, index) => {
      if (uniqueKnowledgeBaseIds.has(knowledgeBaseId)) {
        context.addIssue({
          code: 'custom',
          path: [index],
          message: '不能重复引用同一个知识库',
        })
      }
      uniqueKnowledgeBaseIds.add(knowledgeBaseId)
    })
  })

export const ragTopKSchema = z
  .number()
  .int('Top K 必须是整数')
  .positive('Top K 必须大于 0')
  .max(20, 'Top K 不能超过 20')
  .default(5)

function migrateLegacyKnowledgeBaseId(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const config = value as Record<string, unknown>
  if (Object.hasOwn(config, 'knowledgeBaseIds')) return value
  if (!Object.hasOwn(config, 'knowledgeBaseId')) return value

  const { knowledgeBaseId, ...nextConfig } = config

  if (typeof knowledgeBaseId !== 'string') {
    return {
      ...nextConfig,
      knowledgeBaseIds: knowledgeBaseId,
    }
  }

  const normalizedKnowledgeBaseId = knowledgeBaseId.trim()

  return {
    ...nextConfig,
    knowledgeBaseIds: normalizedKnowledgeBaseId ? [normalizedKnowledgeBaseId] : [],
  }
}

export const ragNodeSchema = z.preprocess(
  migrateLegacyKnowledgeBaseId,
  z.object({
    // 创建节点时允许为空，后续由用户选择一个或多个知识库
    knowledgeBaseIds: ragKnowledgeBaseIdsSchema,
    topK: ragTopKSchema,
  }),
)

export type RagNodeConfig = z.output<typeof ragNodeSchema>
