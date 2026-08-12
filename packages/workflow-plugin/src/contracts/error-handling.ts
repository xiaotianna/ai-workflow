import { ERROR_HANDLING_PORT_ID } from '@ai-workflow/core'

import { PLUGIN_FIELD_UI_TYPES, type PluginFieldSchema } from './field'
import type { PluginSchemaAst } from '../schema/types'

interface PluginErrorHandlingContractInput {
  readonly configProperties: Readonly<Record<string, PluginSchemaAst>>
  readonly configPath: readonly (string | number)[]
  readonly form: Readonly<Record<string, PluginFieldSchema>>
  readonly formPath: readonly (string | number)[]
  readonly outputPortIds: readonly string[]
  readonly outputPortsPath: readonly (string | number)[]
}

export interface PluginErrorHandlingContractIssue {
  readonly path: readonly (string | number)[]
  readonly message: string
}

export function getPluginErrorHandlingFieldName(
  form: Readonly<Record<string, PluginFieldSchema>>,
): string | undefined {
  return Object.entries(form).find(
    ([, field]) => field.ui === PLUGIN_FIELD_UI_TYPES.ERROR_HANDLING,
  )?.[0]
}

export function getPluginErrorHandlingContractIssues({
  configProperties,
  configPath,
  form,
  formPath,
  outputPortIds,
  outputPortsPath,
}: PluginErrorHandlingContractInput): readonly PluginErrorHandlingContractIssue[] {
  const issues: PluginErrorHandlingContractIssue[] = [],
    schemaFieldNames = Object.entries(configProperties)
      .filter(([, schema]) => schema.kind === 'error-handling')
      .map(([fieldName]) => fieldName),
    formFieldNames = Object.entries(form)
      .filter(([, field]) => field.ui === PLUGIN_FIELD_UI_TYPES.ERROR_HANDLING)
      .map(([fieldName]) => fieldName)

  if (schemaFieldNames.length > 1) {
    issues.push({
      path: configPath,
      message: '每个插件节点只能声明一个异常处理配置字段',
    })
  }

  if (formFieldNames.length > 1) {
    issues.push({
      path: formPath,
      message: '每个插件节点只能声明一个异常处理表单字段',
    })
  }

  for (const fieldName of formFieldNames) {
    if (configProperties[fieldName]?.kind !== 'error-handling') {
      issues.push({
        path: [...formPath, fieldName],
        message: `异常处理表单字段必须使用 pluginSchema.errorHandling()：${fieldName}`,
      })
    }
  }

  for (const fieldName of schemaFieldNames) {
    if (form[fieldName]?.ui !== PLUGIN_FIELD_UI_TYPES.ERROR_HANDLING) {
      issues.push({
        path: [...configPath, 'properties', fieldName],
        message: `异常处理配置必须声明对应的 field.errorHandling() 表单字段：${fieldName}`,
      })
    }
  }

  const usesDynamicErrorHandling = schemaFieldNames.length > 0 || formFieldNames.length > 0
  if (usesDynamicErrorHandling && outputPortIds.includes(ERROR_HANDLING_PORT_ID)) {
    issues.push({
      path: [...outputPortsPath, ERROR_HANDLING_PORT_ID],
      message: `启用异常处理配置后，输出端口 ${ERROR_HANDLING_PORT_ID} 由宿主动态生成，插件不得静态声明`,
    })
  }

  return issues
}
