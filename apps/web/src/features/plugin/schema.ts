import { z } from 'zod'

const maxPluginPackageSize = 50 * 1024 * 1024

export const pluginPublishVisibilityValues = ['PUBLIC', 'PRIVATE'] as const

export const pluginPublishSchema = z.object({
  file: z
    .custom<File | undefined>((value) => value === undefined || value instanceof File)
    .refine((file) => file !== undefined, '请选择插件包')
    .refine((file) => file === undefined || /\.tgz$/i.test(file.name), '仅支持 .tgz 格式的插件包')
    .refine(
      (file) => file === undefined || file.size <= maxPluginPackageSize,
      '插件包不能超过 50 MB',
    )
    .transform((file) => file!),
  visibility: z.enum(pluginPublishVisibilityValues),
  changelog: z
    .string()
    .trim()
    .max(5000, '版本说明不能超过 5000 个字符')
    .transform((value) => value || undefined),
})

export type PluginPublishFormInput = z.input<typeof pluginPublishSchema>
export type PluginPublishInput = z.output<typeof pluginPublishSchema>

export const PLUGIN_PUBLISH_INITIAL_VALUES = {
  file: undefined,
  visibility: 'PUBLIC',
  changelog: '',
} satisfies PluginPublishFormInput
