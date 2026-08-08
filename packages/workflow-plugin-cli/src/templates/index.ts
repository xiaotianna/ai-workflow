import { createBasicTemplate } from './basic'
import { createCustomUiTemplate } from './custom-ui'
import { createExecutorTemplate } from './executor'
import type { PluginTemplate } from '../shared/types'
import type { PluginTemplateFactory } from './types'

export { isPluginTemplate, PLUGIN_TEMPLATE_VALUES } from './types'
export type { PluginTemplateContext, PluginTemplateDependencies, PluginTemplateFile } from './types'

export const pluginTemplateFactories: Readonly<Record<PluginTemplate, PluginTemplateFactory>> = {
  basic: createBasicTemplate,
  'custom-ui': createCustomUiTemplate,
  executor: createExecutorTemplate,
}
