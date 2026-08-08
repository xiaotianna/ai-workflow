import { relative } from 'node:path'

import type { ParsedPluginConfig, PluginModuleReference } from '@ai-workflow/plugin'
import { build } from 'esbuild'
import { validRange } from 'semver'

import { resolveExistingPackageFile } from '../package/package-context'
import { PluginCliError } from '../shared/diagnostics'
import type { PluginPackageContext } from '../shared/types'

interface ReferencedModule {
  readonly label: string
  readonly nodeKey: string
  readonly platform: 'browser' | 'node'
  readonly reference: PluginModuleReference
}

function collectReferencedModules(config: ParsedPluginConfig): ReferencedModule[] {
  const modules: ReferencedModule[] = []

  for (const node of config.nodes) {
    if (node.ui.node.custom) {
      modules.push({
        label: '完整节点 renderer',
        nodeKey: node.key,
        platform: 'browser',
        reference: node.ui.node.renderer,
      })
    } else if (node.ui.node.content) {
      modules.push({
        label: '节点 content',
        nodeKey: node.key,
        platform: 'browser',
        reference: node.ui.node.content,
      })
    }

    if (node.ui.form.custom) {
      modules.push({
        label: '配置表单 renderer',
        nodeKey: node.key,
        platform: 'browser',
        reference: node.ui.form.renderer,
      })
    }

    if (node.execution.kind === 'sandbox-js') {
      modules.push({
        label: 'Executor',
        nodeKey: node.key,
        platform: 'node',
        reference: { entry: node.execution.entry, export: 'default' },
      })
    }
  }
  return modules
}

async function readModuleExports(
  entryPath: string,
  platform: 'browser' | 'node',
): Promise<Set<string>> {
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    platform,
    format: 'esm',
    target: platform === 'node' ? 'node22' : 'es2022',
    write: false,
    metafile: true,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'silent',
    external:
      platform === 'browser'
        ? [
            'react',
            'react/*',
            'react-dom',
            'react-dom/*',
            '@ai-workflow/plugin',
            '@ai-workflow/plugin/*',
          ]
        : [],
  })

  return new Set(Object.values(result.metafile.outputs).flatMap((output) => output.exports))
}

export async function validatePluginSourceReferences(
  packageContext: PluginPackageContext,
  config: ParsedPluginConfig,
): Promise<void> {
  if (validRange(config.hostVersionRange) === null) {
    throw new PluginCliError('hostVersionRange 不是合法的 SemVer range', {
      code: 'INVALID_HOST_VERSION_RANGE',
      details: [config.hostVersionRange],
    })
  }

  for (const node of config.nodes) {
    if (node.icon) {
      await resolveExistingPackageFile(
        packageContext.rootDir,
        node.icon,
        `节点 ${node.key} 的 icon`,
      )
    }
  }

  for (const module of collectReferencedModules(config)) {
    const entryPath = await resolveExistingPackageFile(
      packageContext.rootDir,
      module.reference.entry,
      `节点 ${module.nodeKey} 的${module.label}`,
    )

    let exports: Set<string>
    try {
      exports = await readModuleExports(entryPath, module.platform)
    } catch (error) {
      throw new PluginCliError(`节点 ${module.nodeKey} 的${module.label}无法编译`, {
        code: 'PLUGIN_MODULE_COMPILE_FAILED',
        details: [relative(packageContext.rootDir, entryPath)],
        cause: error,
      })
    }

    const exportName = module.reference.export ?? 'default'
    if (!exports.has(exportName)) {
      throw new PluginCliError(`节点 ${module.nodeKey} 的${module.label}缺少导出`, {
        code: 'PLUGIN_MODULE_EXPORT_NOT_FOUND',
        details: [`${module.reference.entry}#${exportName}`],
      })
    }
  }
}
