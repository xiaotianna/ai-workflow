import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { build } from 'esbuild'

import { resolveExistingPackageFile } from '../package/package-context'
import type { CheckedPlugin } from '../shared/types'
import type { PluginBuildPlan, PluginWebModulePlan } from './manifest'

function createImportStatement(module: PluginWebModulePlan, localName: string): string {
  const entry = JSON.stringify(module.reference.entry)
  return `import * as ${localName}Namespace from ${entry}\nconst ${localName} = ${localName}Namespace[${JSON.stringify(module.reference.export ?? 'default')}]`
}

function createWebRemoteSource(modules: readonly PluginWebModulePlan[]): string {
  const imports: string[] = []
  const exports: string[] = []
  const nodeModules = new Map<string, string[]>()

  modules.forEach((module, index) => {
    const localName = `pluginModule${index}`
    imports.push(createImportStatement(module, localName))
    exports.push(`export { ${localName} as ${module.remoteExport} }`)

    const assignments = nodeModules.get(module.nodeKey) ?? []
    assignments.push(`${JSON.stringify(module.role)}: ${localName}`)
    nodeModules.set(module.nodeKey, assignments)
  })

  const nodes = [...nodeModules.entries()]
    .map(([nodeKey, assignments]) => `${JSON.stringify(nodeKey)}: { ${assignments.join(', ')} }`)
    .join(',\n')

  return `${imports.join('\n')}\n\n${exports.join('\n')}\n\nexport const pluginWebModule = {\n  nodes: {\n${nodes}\n  },\n}\n\nexport default pluginWebModule\n`
}

async function copyStaticAssets(
  checkedPlugin: CheckedPlugin,
  plan: PluginBuildPlan,
  stagingDirectory: string,
): Promise<void> {
  for (const asset of plan.assets) {
    const sourcePath = await resolveExistingPackageFile(
      checkedPlugin.package.rootDir,
      asset.sourceEntry,
      `节点 ${asset.nodeKey} 的 icon`,
    )
    const outputPath = join(stagingDirectory, asset.artifact)
    await mkdir(dirname(outputPath), { recursive: true })
    await copyFile(sourcePath, outputPath)
  }
}

async function buildWebRemote(
  checkedPlugin: CheckedPlugin,
  plan: PluginBuildPlan,
  stagingDirectory: string,
): Promise<void> {
  if (plan.webModules.length === 0) return

  const webDirectory = join(stagingDirectory, 'web')
  await mkdir(webDirectory, { recursive: true })
  await build({
    stdin: {
      contents: createWebRemoteSource(plan.webModules),
      sourcefile: 'ai-workflow-plugin-web-entry.tsx',
      resolveDir: checkedPlugin.package.rootDir,
      loader: 'tsx',
    },
    outfile: join(webDirectory, 'remoteEntry.js'),
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    jsx: 'automatic',
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'silent',
    external: [
      'react',
      'react/*',
      'react-dom',
      'react-dom/*',
      '@ai-workflow/plugin',
      '@ai-workflow/plugin/*',
    ],
  })

  const remoteManifest = {
    formatVersion: 1,
    format: 'esm',
    entry: 'remoteEntry.js',
    shared: ['react', 'react-dom', '@ai-workflow/plugin/ui'],
    exports: Object.fromEntries(
      plan.webModules.map((module) => [
        module.remoteExport,
        { nodeKey: module.nodeKey, role: module.role },
      ]),
    ),
  }
  await writeFile(
    join(webDirectory, 'remote-manifest.json'),
    `${JSON.stringify(remoteManifest, null, 2)}\n`,
  )
}

async function buildExecutors(
  checkedPlugin: CheckedPlugin,
  plan: PluginBuildPlan,
  stagingDirectory: string,
): Promise<void> {
  for (const executor of plan.executors) {
    const entryPath = await resolveExistingPackageFile(
      checkedPlugin.package.rootDir,
      executor.sourceEntry,
      `节点 ${executor.nodeKey} 的 Executor`,
    )
    const outputPath = join(stagingDirectory, executor.artifact)
    await mkdir(dirname(outputPath), { recursive: true })
    await build({
      entryPoints: [entryPath],
      outfile: outputPath,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      sourcemap: false,
      legalComments: 'none',
      logLevel: 'silent',
    })
  }
}

export async function buildPluginArtifacts(
  checkedPlugin: CheckedPlugin,
  plan: PluginBuildPlan,
  stagingDirectory: string,
): Promise<void> {
  await copyStaticAssets(checkedPlugin, plan, stagingDirectory)
  await buildWebRemote(checkedPlugin, plan, stagingDirectory)
  await buildExecutors(checkedPlugin, plan, stagingDirectory)
}
