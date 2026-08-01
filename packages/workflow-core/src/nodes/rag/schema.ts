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

export const ragKnowledgeBaseReferenceSchema = z.object({
  id: z.string().trim().min(1, '知识库 ID 不能为空'),
  title: z.string().trim().min(1, '知识库名称不能为空').optional(),
  icon: z.string().trim().min(1, '知识库图标不能为空').optional(),
})

export const ragKnowledgeBaseReferencesSchema = z
  .array(ragKnowledgeBaseReferenceSchema)
  .default([])
  .superRefine((knowledgeBases, context) => {
    const uniqueKnowledgeBaseIds = new Set<string>()

    knowledgeBases.forEach((knowledgeBase, index) => {
      if (uniqueKnowledgeBaseIds.has(knowledgeBase.id)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: '不能重复引用同一个知识库',
        })
      }
      uniqueKnowledgeBaseIds.add(knowledgeBase.id)
    })
  })

export const ragTopKSchema = z
  .number()
  .int('Top K 必须是整数')
  .positive('Top K 必须大于 0')
  .max(20, 'Top K 不能超过 20')
  .default(5)

function migrateLegacyKnowledgeBaseReferences(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const config = value as Record<string, unknown>
  if (Object.hasOwn(config, 'knowledgeBases')) return value
  if (!Object.hasOwn(config, 'knowledgeBaseIds') && !Object.hasOwn(config, 'knowledgeBaseId')) {
    return value
  }

  const { knowledgeBaseId, knowledgeBaseIds, ...nextConfig } = config
  const legacyKnowledgeBaseIds = Object.hasOwn(config, 'knowledgeBaseIds')
    ? knowledgeBaseIds
    : typeof knowledgeBaseId === 'string'
      ? knowledgeBaseId.trim()
        ? [knowledgeBaseId.trim()]
        : []
      : knowledgeBaseId
  const parsedKnowledgeBaseIds = ragKnowledgeBaseIdsSchema.safeParse(legacyKnowledgeBaseIds)

  if (!parsedKnowledgeBaseIds.success) {
    return {
      ...nextConfig,
      knowledgeBases: legacyKnowledgeBaseIds,
    }
  }

  return {
    ...nextConfig,
    knowledgeBases: parsedKnowledgeBaseIds.data.map((id) => ({ id })),
  }
}

export const ragNodeSchema = z.preprocess(
  migrateLegacyKnowledgeBaseReferences,
  z.object({
    // 创建节点时允许为空，后续由用户选择一个或多个知识库
    knowledgeBases: ragKnowledgeBaseReferencesSchema,
    topK: ragTopKSchema,
  }),
)

export type RagKnowledgeBaseReference = z.output<typeof ragKnowledgeBaseReferenceSchema>
export type RagNodeConfig = z.output<typeof ragNodeSchema>
