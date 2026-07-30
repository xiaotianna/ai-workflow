import { z } from 'zod'

export const studioAppIcons = ['🤖', '✨', '💡', '🚀', '🧩', '📊'] as const

export const createStudioAppSchema = z.object({
  title: z.string().trim().min(1, '应用名称不能为空').max(40, '应用名称不能超过 40 个字符'),
  icon: z.enum(studioAppIcons),
  description: z
    .string()
    .trim()
    .max(200, '应用描述不能超过 200 个字符')
    .transform((value) => value || undefined),
})

export type CreateStudioAppFormInput = z.input<typeof createStudioAppSchema>
export type CreateStudioAppInput = z.output<typeof createStudioAppSchema>

export const CREATE_STUDIO_APP_INITIAL_VALUES = {
  title: '',
  icon: studioAppIcons[0],
  description: '',
} satisfies CreateStudioAppFormInput

const maxDslFileSize = 10 * 1024 * 1024

export const importDslSchema = z.object({
  file: z
    .custom<File | undefined>((value) => value === undefined || value instanceof File)
    .refine((file) => file !== undefined, '请选择 JSON 格式的 DSL 文件')
    .refine(
      (file) => file === undefined || /\.json$/i.test(file.name),
      '仅支持 .json 格式的 DSL 文件',
    )
    .refine((file) => file === undefined || file.size <= maxDslFileSize, 'DSL 文件不能超过 10 MB'),
  content: z
    .string()
    .min(1, 'DSL 文件内容不能为空')
    .refine((content) => {
      try {
        JSON.parse(content)
        return true
      } catch {
        return false
      }
    }, 'DSL 文件不是有效的 JSON 格式'),
})

export type ImportDslFormInput = z.input<typeof importDslSchema>

export const IMPORT_DSL_INITIAL_VALUES = {
  file: undefined,
  content: '',
} satisfies ImportDslFormInput
