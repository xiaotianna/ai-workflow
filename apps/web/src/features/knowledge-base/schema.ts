import { z } from 'zod'

export const knowledgeBaseIcons = ['📚', '📄', '📁', '🔍', '💡', '🧠'] as const

export const createKnowledgeBaseSchema = z.object({
  title: z.string().trim().min(1, '知识库名称不能为空').max(40, '知识库名称不能超过 40 个字符'),
  icon: z.enum(knowledgeBaseIcons),
  description: z
    .string()
    .trim()
    .max(200, '知识库描述不能超过 200 个字符')
    .transform((value) => value || undefined),
})

export type CreateKnowledgeBaseFormInput = z.input<typeof createKnowledgeBaseSchema>
export type CreateKnowledgeBaseInput = z.output<typeof createKnowledgeBaseSchema>

export const CREATE_KNOWLEDGE_BASE_INITIAL_VALUES = {
  title: '',
  icon: knowledgeBaseIcons[0],
  description: '',
} satisfies CreateKnowledgeBaseFormInput
