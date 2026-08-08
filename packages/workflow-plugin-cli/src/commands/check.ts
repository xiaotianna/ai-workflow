import { loadPluginConfig } from '../config/load-config'
import { findPluginPackage } from '../package/package-context'
import type { CheckedPlugin, CheckPluginOptions } from '../shared/types'
import { validatePluginSourceReferences } from '../validation/source-references'

export async function checkPlugin(options: CheckPluginOptions = {}): Promise<CheckedPlugin> {
  const packageContext = await findPluginPackage(options.cwd)
  const config = await loadPluginConfig(packageContext)
  await validatePluginSourceReferences(packageContext, config)
  return { package: packageContext, config }
}
