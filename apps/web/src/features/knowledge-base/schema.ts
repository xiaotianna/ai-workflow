import { z } from 'zod'

import { documentAcceptedFileExtensions, documentMaxFileSizeBytes } from './constants'

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

const documentFileSchema = z.custom<File>(
  (value) => typeof File !== 'undefined' && value instanceof File,
  '请选择有效的文件',
)

export const addDocumentFilesSchema = z.object({
  files: z
    .array(documentFileSchema)
    .min(1, '请至少选择一个文件')
    .superRefine((files, context) => {
      files.forEach((file, index) => {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

        if (!documentAcceptedFileExtensions.some((item) => item === extension)) {
          context.addIssue({
            code: 'custom',
            message: `${file.name} 的文件格式不受支持`,
            path: [index],
          })
        }

        if (file.size > documentMaxFileSizeBytes) {
          context.addIssue({
            code: 'custom',
            message: `${file.name} 不能超过 15 MB`,
            path: [index],
          })
        }
      })
    }),
})

export const addDocumentSchema = addDocumentFilesSchema
  .extend({
    segmentIdentifier: z.string().min(1, '请输入分段标识符'),
    maxSegmentLength: z.coerce
      .number<number>()
      .int('分段最大长度必须是整数')
      .min(100, '分段最大长度不能小于 100')
      .max(4000, '分段最大长度不能超过 4000'),
    overlapLength: z.coerce
      .number<number>()
      .int('分段重叠长度必须是整数')
      .min(0, '分段重叠长度不能小于 0'),
    replaceWhitespace: z.boolean(),
    removeUrlsAndEmails: z.boolean(),
    topK: z.coerce.number<number>().int().min(1).max(10),
  })
  .superRefine((value, context) => {
    if (value.overlapLength >= value.maxSegmentLength) {
      context.addIssue({
        code: 'custom',
        message: '分段重叠长度必须小于分段最大长度',
        path: ['overlapLength'],
      })
    }
  })

export type AddDocumentFormInput = z.input<typeof addDocumentSchema>
export type AddDocumentInput = z.output<typeof addDocumentSchema>

export const ADD_DOCUMENT_INITIAL_VALUES = {
  files: [],
  segmentIdentifier: '\\n',
  maxSegmentLength: 1024,
  overlapLength: 50,
  replaceWhitespace: true,
  removeUrlsAndEmails: false,
  topK: 3,
} satisfies AddDocumentFormInput
