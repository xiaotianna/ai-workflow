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
