import type { PluginTemplate } from '../shared/types'

export interface PluginTemplateContext {
  readonly packageName: string
  readonly sdkDependency: string
  readonly cliDependency: string
  readonly localDependencies: boolean
}

export interface PluginTemplateFile {
  readonly path: string
  readonly content: string
}

export interface PluginTemplateDependencies {
  readonly sdk: string
  readonly cli: string
  readonly local: boolean
}

export type PluginTemplateFactory = (
  context: PluginTemplateContext,
) => readonly PluginTemplateFile[]

export const PLUGIN_TEMPLATE_VALUES: readonly PluginTemplate[] = ['basic', 'custom-ui', 'executor']

export function isPluginTemplate(value: string): value is PluginTemplate {
  return PLUGIN_TEMPLATE_VALUES.some((template) => template === value)
}
