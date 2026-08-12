import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { pluginConfigSchema, type ParsedPluginConfig } from '@ai-workflow/plugin'
import { build } from 'esbuild'

import { formatSchemaIssues, PluginCliError } from '../shared/diagnostics'
import type { PluginPackageContext } from '../shared/types'

export async function loadPluginConfig(
  packageContext: PluginPackageContext,
): Promise<ParsedPluginConfig> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'ai-workflow-plugin-config-')),
    temporaryEntry = join(temporaryDirectory, 'config.mjs')

  try {
    await build({
      entryPoints: [packageContext.entryPath],
      outfile: temporaryEntry,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      packages: 'bundle',
      sourcemap: false,
      legalComments: 'none',
      logLevel: 'silent',
    })

    const moduleUrl = `${pathToFileURL(temporaryEntry).href}?loaded=${Date.now()}`,
      loadedModule: Readonly<Record<string, unknown>> = await import(moduleUrl)

    if (!('default' in loadedModule)) {
      throw new PluginCliError('插件根入口缺少默认导出', {
        code: 'MISSING_DEFAULT_EXPORT',
        details: [packageContext.entryPath],
      })
    }

    const result = pluginConfigSchema.safeParse(loadedModule.default)
    if (!result.success) {
      throw new PluginCliError('插件默认导出未通过 PluginConfig 校验', {
        code: 'INVALID_PLUGIN_CONFIG',
        details: formatSchemaIssues(result.error),
      })
    }

    return result.data
  } catch (error) {
    if (error instanceof PluginCliError) throw error
    throw new PluginCliError('无法编译或加载插件根入口', {
      code: 'PLUGIN_ENTRY_LOAD_FAILED',
      details: [packageContext.entryPath],
      cause: error,
    })
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}
