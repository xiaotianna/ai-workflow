import {
  createPluginNodeType,
  pluginManifestSchema,
  type PluginManifest,
  type PluginManifestInput,
  type PluginModuleReference,
} from '@ai-workflow/plugin'

import type { CheckedPlugin } from '../shared/types'

export type PluginWebModuleRole = 'content' | 'renderer' | 'configRenderer'

export interface PluginWebModulePlan {
  readonly nodeKey: string
  readonly role: PluginWebModuleRole
  readonly reference: PluginModuleReference
  readonly remoteExport: string
}

export interface PluginExecutorPlan {
  readonly nodeKey: string
  readonly sourceEntry: string
  readonly artifact: string
}

export interface PluginAssetPlan {
  readonly nodeKey: string
  readonly sourceEntry: string
  readonly artifact: string
}

export interface PluginBuildPlan {
  readonly manifest: Omit<PluginManifestInput, 'integrity'>
  readonly webModules: readonly PluginWebModulePlan[]
  readonly executors: readonly PluginExecutorPlan[]
  readonly assets: readonly PluginAssetPlan[]
}

function toPascalCase(value: string): string {
  return value
    .split('-')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join('')
}

function createRemoteExport(nodeKey: string, role: PluginWebModuleRole): string {
  const suffix =
    role === 'content' ? 'Content' : role === 'renderer' ? 'Renderer' : 'ConfigRenderer'
  return `${toPascalCase(nodeKey)}${suffix}`
}

function createAssetArtifact(nodeKey: string, sourceEntry: string): string {
  const normalizedEntry = sourceEntry.replaceAll('\\', '/')
  const fileName = normalizedEntry.slice(normalizedEntry.lastIndexOf('/') + 1)
  return `assets/${nodeKey}-${fileName}`
}

export function createPluginBuildPlan(checkedPlugin: CheckedPlugin): PluginBuildPlan {
  const webModules: PluginWebModulePlan[] = []
  const executors: PluginExecutorPlan[] = []
  const assets: PluginAssetPlan[] = []
  const remoteExports = new Set<string>()

  const nodes = checkedPlugin.config.nodes.map((node) => {
    let icon: string | undefined
    if (node.icon) {
      icon = createAssetArtifact(node.key, node.icon)
      assets.push({ nodeKey: node.key, sourceEntry: node.icon, artifact: icon })
    }

    let manifestNodeUi:
      | { readonly custom: false; readonly remoteExport?: string }
      | { readonly custom: true; readonly remoteExport: string }

    if (node.ui.node.custom) {
      const remoteExport = createRemoteExport(node.key, 'renderer')
      remoteExports.add(remoteExport)
      webModules.push({
        nodeKey: node.key,
        role: 'renderer',
        reference: node.ui.node.renderer,
        remoteExport,
      })
      manifestNodeUi = { custom: true, remoteExport }
    } else if (node.ui.node.content) {
      const remoteExport = createRemoteExport(node.key, 'content')
      remoteExports.add(remoteExport)
      webModules.push({
        nodeKey: node.key,
        role: 'content',
        reference: node.ui.node.content,
        remoteExport,
      })
      manifestNodeUi = { custom: false, remoteExport }
    } else {
      manifestNodeUi = { custom: false }
    }

    let manifestFormUi:
      | { readonly custom: false }
      | { readonly custom: true; readonly remoteExport: string }

    if (node.ui.form.custom) {
      const remoteExport = createRemoteExport(node.key, 'configRenderer')
      remoteExports.add(remoteExport)
      webModules.push({
        nodeKey: node.key,
        role: 'configRenderer',
        reference: node.ui.form.renderer,
        remoteExport,
      })
      manifestFormUi = { custom: true, remoteExport }
    } else {
      manifestFormUi = { custom: false }
    }

    let execution:
      | { readonly kind: 'none' }
      | { readonly kind: 'host-llm' }
      | {
          readonly kind: 'sandbox-js'
          readonly artifact: string
        }
    if (node.execution.kind === 'sandbox-js') {
      const artifact = `executor/${node.key}.mjs`
      executors.push({ nodeKey: node.key, sourceEntry: node.execution.entry, artifact })
      execution = { kind: 'sandbox-js', artifact }
    } else if (node.execution.kind === 'host-llm') {
      execution = { kind: 'host-llm' }
    } else {
      execution = { kind: 'none' }
    }

    return {
      key: node.key,
      type: createPluginNodeType(checkedPlugin.package.name, node.key),
      label: node.label,
      ...(node.description === undefined ? {} : { description: node.description }),
      ...(icon === undefined ? {} : { icon }),
      configSchemaVersion: node.config.schemaVersion,
      configSchema: structuredClone(node.config.schema),
      initialConfig: structuredClone(node.config.initial),
      form: structuredClone(node.config.form ?? {}),
      ports: structuredClone(node.ports),
      fixedOutputs: structuredClone(node.fixedOutputs ?? []),
      ui: { node: manifestNodeUi, form: manifestFormUi },
      execution,
    }
  })

  if (remoteExports.size !== webModules.length) {
    throw new Error('生成的 Web Remote export 发生冲突')
  }

  return {
    manifest: {
      manifestVersion: 1,
      plugin: {
        packageName: checkedPlugin.package.name,
        displayName: checkedPlugin.config.displayName,
        ...(checkedPlugin.config.description === undefined
          ? {}
          : { description: checkedPlugin.config.description }),
        version: checkedPlugin.package.version,
      },
      hostVersionRange: checkedPlugin.config.hostVersionRange,
      permissions: [...checkedPlugin.config.permissions],
      requires: { hostFields: [...checkedPlugin.config.requires.hostFields] },
      nodes,
    },
    webModules,
    executors,
    assets,
  }
}

export function finalizePluginManifest(
  plan: PluginBuildPlan,
  integrityDigest: string,
): PluginManifest {
  return pluginManifestSchema.parse({
    ...plan.manifest,
    integrity: { algorithm: 'sha256', digest: integrityDigest },
  })
}
