import { z } from 'zod'

import {
  pluginNodeDefinitionSchema,
  type AnyPluginNodeDefinition,
  type PluginNodeDefinition,
} from './node'

/**
 * 插件权限，在安装插件的时候提示：
 * 1、web:execute：如果插件包含自定义的前端代码，安装时提示风险，并决定是否加载 Web Remote。
 * 2、network:public：插件沙箱需要访问公网。未声明时，沙箱禁止公网请求。
 * 3、secrets:read：是否允许插件读取到工作流的env变量中的密钥
 */
export const PLUGIN_PERMISSION_VALUES = ['web:execute', 'network:public', 'secrets:read'] as const

export type PluginPermission = (typeof PLUGIN_PERMISSION_VALUES)[number]

function hasUniqueItems(values: readonly string[]) {
  return new Set(values).size === values.length
}

export interface PluginConfig<
  TNodes extends readonly AnyPluginNodeDefinition[] = readonly PluginNodeDefinition[],
> {
  readonly displayName: string
  readonly description?: string
  // 检查整个插件是否兼容当前平台宿主版本，使用 SemVer range 表达式（例如：^1.2.3）
  readonly hostVersionRange: string
  // 插件需要向用户申请的权限
  readonly permissions?: readonly PluginPermission[]
  /**
   * 检查平台是否提供插件需要的具体表单控件
   * web工作流编辑器中需要的表单字段组件，例如插件配置需要：模型选择器、知识库选择器组件
   * 这些控件依赖平台业务数据，第三方插件无法自行实现，因此由宿主提供
   *  requires: {
        hostFields: ['model-selector', 'knowledge-base-selector'],
      }
   */
  readonly requires?: {
    readonly hostFields?: readonly string[]
  }
  // 是数组的原因是，一个插件其实是一个插件包，提供多个节点
  readonly nodes: TNodes
}

export function defineConfig<const TConfig extends PluginConfig>(config: TConfig): TConfig {
  return config
}

export const pluginConfigSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional(),
    hostVersionRange: z.string().trim().min(1),
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
