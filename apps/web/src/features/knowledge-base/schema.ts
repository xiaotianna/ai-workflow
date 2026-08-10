import { z } from 'zod'

import {
  documentAcceptedFileExtensions,
  documentMaxFileSizeBytes,
  documentSegmentationModeValues,
} from './constants'

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
    .max(10, '一次最多上传 10 个文件')
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
    segmentationMode: z.enum(documentSegmentationModeValues),
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
  segmentationMode: 'general',
  maxSegmentLength: 1024,
  overlapLength: 50,
  replaceWhitespace: true,
} satisfies AddDocumentFormInput

export const knowledgeBaseSettingsSchema = z
  .object({
    segmentationMode: z.enum(documentSegmentationModeValues),
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
    retrievalProfile: z.enum(['hybrid-accurate', 'hybrid-fast']),
    retrievalTopK: z.coerce
      .number<number>()
      .int('默认返回数量必须是整数')
      .min(1, '默认返回数量不能小于 1')
      .max(20, '默认返回数量不能超过 20'),
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

export type KnowledgeBaseSettingsFormInput = z.input<typeof knowledgeBaseSettingsSchema>
export type KnowledgeBaseSettingsInput = z.output<typeof knowledgeBaseSettingsSchema>

export const KNOWLEDGE_BASE_SETTINGS_INITIAL_VALUES = {
  segmentationMode: 'general',
  maxSegmentLength: 1024,
  overlapLength: 50,
  replaceWhitespace: true,
  retrievalProfile: 'hybrid-accurate',
  retrievalTopK: 8,
} satisfies KnowledgeBaseSettingsFormInput
