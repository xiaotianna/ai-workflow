import { jsonValueSchema } from '@ai-workflow/core'
import { z } from 'zod'

import { PLUGIN_PERMISSION_VALUES } from './config'
import { pluginFieldSchema } from './field'
import {
  createPluginNodeType,
  pluginPackageNameSchema,
  pluginNodeKeySchema,
  pluginNodeTypeSchema,
  pluginPortIdSchema,
} from './identifiers'
import { compilePluginSchemaToZod } from '../schema/compiler'
import { pluginSchemaAstSchema } from '../schema/ast-schema'
import { pluginNodeOutputDefinitionsSchema } from './node'

const sha256DigestSchema = z.string().regex(/^[a-f0-9]{64}$/i, 'SHA-256 摘要格式不正确')
const semanticVersionSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
    '插件版本必须是合法的 SemVer',
  )
const artifactPathSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.startsWith('\\') &&
      !/^[a-zA-Z]:[\\/]/.test(value) &&
      !value.replaceAll('\\', '/').split('/').includes('..'),
    'artifact 必须使用安全相对路径',
  )

const manifestPortDefinitionSchema = z
  .object({
    dataType: z.enum(['string', 'number', 'boolean', 'json']),
    required: z.boolean().optional(),
    multiple: z.boolean().optional(),
    label: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
  })
  .strict()

const manifestPortMapSchema = z.record(pluginPortIdSchema, manifestPortDefinitionSchema)

const manifestNodeUISchema = z.discriminatedUnion('custom', [
  z
    .object({ custom: z.literal(false), remoteExport: z.string().trim().min(1).optional() })
    .strict(),
  z.object({ custom: z.literal(true), remoteExport: z.string().trim().min(1) }).strict(),
])

const manifestFormUISchema = z.discriminatedUnion('custom', [
  z.object({ custom: z.literal(false) }).strict(),
  z.object({ custom: z.literal(true), remoteExport: z.string().trim().min(1) }).strict(),
])

const manifestExecutionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z.object({ kind: z.literal('sandbox-js'), artifact: artifactPathSchema }).strict(),
])

export const pluginManifestNodeSchema = z
  .object({
    key: pluginNodeKeySchema,
    type: pluginNodeTypeSchema,
    label: z.string().trim().min(1),
    description: z.string().trim().optional(),
    icon: artifactPathSchema.optional(),
    configSchemaVersion: z.number().int().positive(),
    configSchema: pluginSchemaAstSchema.refine((schema) => schema.kind === 'object', {
      message: '节点配置 schema 顶层必须是 object',
    }),
    initialConfig: jsonValueSchema,
    form: z.record(z.string().min(1), pluginFieldSchema).default({}),
    ports: z.object({ inputs: manifestPortMapSchema, outputs: manifestPortMapSchema }).strict(),
    fixedOutputs: pluginNodeOutputDefinitionsSchema.default([]),
    ui: z.object({ node: manifestNodeUISchema, form: manifestFormUISchema }).strict(),
    execution: manifestExecutionSchema,
  })
  .strict()
  .superRefine((node, context) => {
    if (node.configSchema.kind !== 'object') return

    const configResult = compilePluginSchemaToZod(node.configSchema).safeParse(node.initialConfig)
    if (!configResult.success) {
      for (const issue of configResult.error.issues) {
        context.addIssue({
          code: 'custom',
          path: ['initialConfig', ...issue.path],
          message: issue.message,
        })
      }
    }

    for (const fieldName of Object.keys(node.form)) {
      if (!(fieldName in node.configSchema.properties)) {
        context.addIssue({
          code: 'custom',
          path: ['form', fieldName],
          message: `表单字段未在配置 schema 中声明：${fieldName}`,
        })
      }
    }
  })

export const pluginManifestSchema = z
  .object({
    manifestVersion: z.literal(1),
    plugin: z
      .object({
        packageName: pluginPackageNameSchema,
        displayName: z.string().trim().min(1).max(80),
        description: z.string().trim().max(500).optional(),
        version: semanticVersionSchema,
      })
      .strict(),
    hostVersionRange: z.string().trim().min(1),
    permissions: z
      .array(z.enum(PLUGIN_PERMISSION_VALUES))
      .refine((values) => new Set(values).size === values.length, '插件权限不能重复')
      .default([]),
    requires: z
      .object({
        hostFields: z
          .array(z.string().trim().min(1))
          .refine((values) => new Set(values).size === values.length, '宿主字段能力不能重复')
          .default([]),
      })
      .strict()
      .default({ hostFields: [] }),
    nodes: z.array(pluginManifestNodeSchema).min(1),
    integrity: z.object({ algorithm: z.literal('sha256'), digest: sha256DigestSchema }).strict(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const nodeKeys = new Set<string>()
    const nodeTypes = new Set<string>()
    const requiredHostFields = new Set(manifest.requires.hostFields)
    const hasWebExecutePermission = manifest.permissions.includes('web:execute')

    manifest.nodes.forEach((node, index) => {
      if (nodeKeys.has(node.key)) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'key'],
          message: `插件节点 Key 不能重复：${node.key}`,
        })
      }
      nodeKeys.add(node.key)

      if (nodeTypes.has(node.type)) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'type'],
          message: `插件节点类型不能重复：${node.type}`,
        })
      }
      nodeTypes.add(node.type)

      const expectedType = createPluginNodeType(manifest.plugin.packageName, node.key)
      if (node.type !== expectedType) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'type'],
          message: `插件节点类型必须由 package 名称和节点 Key 生成：${expectedType}`,
        })
      }

      for (const [fieldName, formField] of Object.entries(node.form)) {
        if ('host' in formField && formField.host && !requiredHostFields.has(formField.ui)) {
          context.addIssue({
            code: 'custom',
            path: ['nodes', index, 'form', fieldName, 'ui'],
            message: `宿主字段能力未在 requires.hostFields 中声明：${formField.ui}`,
          })
        }
      }

      const requiresWebExecution =
        node.ui.node.custom || node.ui.node.remoteExport !== undefined || node.ui.form.custom
      if (requiresWebExecution && !hasWebExecutePermission) {
        context.addIssue({
          code: 'custom',
          path: ['nodes', index, 'ui'],
          message: '自定义节点 UI 或配置表单必须声明 web:execute 权限',
        })
      }
    })
  })

export type PluginManifest = z.output<typeof pluginManifestSchema>
export type PluginManifestInput = z.input<typeof pluginManifestSchema>
export type PluginManifestNode = z.output<typeof pluginManifestNodeSchema>
