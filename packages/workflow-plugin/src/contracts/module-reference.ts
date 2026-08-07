import { z } from 'zod'

function isSafeRelativePath(value: string) {
  if (value.startsWith('/') || value.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(value)) {
    return false
  }

  const segments = value.replaceAll('\\', '/').split('/')
  return !segments.includes('..') && !segments.includes('')
}

export const pluginModuleReferenceSchema = z
  .object({
    entry: z
      .string()
      .trim()
      .min(1)
      .refine(isSafeRelativePath, '模块入口必须是插件包内的安全相对路径'),
    export: z.string().trim().min(1).default('default'),
  })
  .strict()

export type PluginModuleReference = z.input<typeof pluginModuleReferenceSchema>
