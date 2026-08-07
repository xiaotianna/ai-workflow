import { z } from 'zod'

import { pluginIdSchema } from './identifiers'
import {
  pluginNodeDefinitionSchema,
  type AnyPluginNodeDefinition,
  type PluginNodeDefinition,
} from './node'

export const PLUGIN_PERMISSION_VALUES = ['web:execute', 'network:public', 'secrets:read'] as const

export type PluginPermission = (typeof PLUGIN_PERMISSION_VALUES)[number]

function hasUniqueItems(values: readonly string[]) {
  return new Set(values).size === values.length
}

export interface PluginConfig<
  TNodes extends readonly AnyPluginNodeDefinition[] = readonly PluginNodeDefinition[],
> {
  readonly id: string
  readonly displayName: string
  readonly description?: string
  readonly engine: string
  readonly permissions?: readonly PluginPermission[]
  readonly requires?: {
    readonly hostFields?: readonly string[]
  }
  readonly nodes: TNodes
}

export function defineConfig<const TConfig extends PluginConfig>(config: TConfig): TConfig {
  return config
}

export const pluginConfigSchema = z
  .object({
    id: pluginIdSchema,
    displayName: z.string().trim().min(1).max(128),
    description: z.string().trim().optional(),
    engine: z.string().trim().min(1),
    permissions: z
      .array(z.enum(PLUGIN_PERMISSION_VALUES))
      .refine(hasUniqueItems, '插件权限不能重复')
      .default([]),
    requires: z
      .object({
        hostFields: z
          .array(z.string().trim().min(1))
          .refine(hasUniqueItems, '宿主字段能力不能重复')
          .default([]),
      })
      .strict()
      .default({ hostFields: [] }),
    nodes: z.array(pluginNodeDefinitionSchema).min(1),
  })
  .strict()
  .superRefine((config, context) => {
    const nodeKeys = new Set<string>()
    const requiredHostFields = new Set(config.requires.hostFields)
    const hasWebExecutePermission = config.permissions.includes('web:execute')

    config.nodes.forEach((node, index) => {
      if (nodeKeys.has(node.key)) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'key'],
          message: `插件节点 Key 不能重复：${node.key}`,
        })
      }
      nodeKeys.add(node.key)

      for (const [fieldName, formField] of Object.entries(node.config.form ?? {})) {
        if ('host' in formField && formField.host && !requiredHostFields.has(formField.ui)) {
          context.addIssue({
            code: 'custom',
            path: ['nodes', index, 'config', 'form', fieldName, 'ui'],
            message: `宿主字段能力未在 requires.hostFields 中声明：${formField.ui}`,
          })
        }
      }

      const requiresWebExecution =
        node.ui?.node.custom === true ||
        node.ui?.node.content !== undefined ||
        node.ui?.form.custom === true

      if (requiresWebExecution && !hasWebExecutePermission) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'ui'],
          message: '自定义节点 UI 或配置表单必须声明 web:execute 权限',
        })
      }
    })
  })

export type ParsedPluginConfig = z.output<typeof pluginConfigSchema>
