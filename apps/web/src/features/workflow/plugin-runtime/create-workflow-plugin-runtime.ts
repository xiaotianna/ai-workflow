import {
  BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
  builtinNodeStrategies,
  createWorkflowNodeCatalog,
  type WorkflowPluginLockItem,
} from '@ai-workflow/core'
import { createNodeTypesFromPluginManifest, pluginManifestSchema } from '@ai-workflow/plugin'
import { builtinFields } from '@ai-workflow/form'
import { builtinNodeConfigRenderers } from '@ai-workflow/form/components/node-config-section'
import { createBuiltinNodeUIRegistry } from '@ai-workflow/nodes-ui'

import type { PluginRuntimeCatalogDto } from '@/api/plugins'
import { getPluginAssetUrl } from '@/features/plugin/asset-url'
import { createWorkflowWebCatalog, type WorkflowWebCatalog } from '../catalog/workflow-web-catalog'
import { builtinWorkflowNodeConfigFieldRenderers } from '../node-config-renderers/builtin'
import {
  createPluginUiRegistrations,
  manifestHasUnresolvedRemoteUi,
} from './create-plugin-ui-registrations'
import {
  getPluginRemoteEntryAssetPath,
  loadPluginWebRemote,
  pluginManifestNeedsWebRemote,
} from './load-plugin-web-remote'

export interface LoadedPluginWebModule {
  readonly pluginId: string
  readonly manifest: ReturnType<typeof pluginManifestSchema.parse>
  readonly webModule: import('@ai-workflow/plugin/ui').PluginWebModule
}

export interface WorkflowPluginRuntime extends WorkflowWebCatalog {
  readonly pluginRemoteErrors: ReadonlyMap<string, string>
  readonly hasUnresolvedRemoteUi: boolean
  readonly loadedWebModules: readonly LoadedPluginWebModule[]
}

export async function createWorkflowPluginRuntime(
  runtimeCatalog: PluginRuntimeCatalogDto,
  signal?: AbortSignal,
): Promise<WorkflowPluginRuntime> {
  const manifests = runtimeCatalog.plugins.map((plugin) => ({
    plugin,
    manifest: pluginManifestSchema.parse(plugin.manifest),
  }))

  const loadedWebModules: LoadedPluginWebModule[] = []
  const pluginRemoteErrors = new Map<string, string>()

  await Promise.all(
    manifests.map(async ({ plugin, manifest }) => {
      if (!pluginManifestNeedsWebRemote(manifest)) return

      const assetUrl = getPluginAssetUrl(
        plugin.pluginId,
        plugin.versionId,
        getPluginRemoteEntryAssetPath(),
      )

      try {
        const webModule = await loadPluginWebRemote(assetUrl, signal)
        loadedWebModules.push({ pluginId: plugin.pluginId, manifest, webModule })
      } catch (error) {
        pluginRemoteErrors.set(
          plugin.pluginId,
          error instanceof Error ? error.message : '插件 Web Remote 加载失败',
        )
      }
    }),
  )

  const coreCatalog = createWorkflowNodeCatalog({
    hostVersion: BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
    nodes: [
      ...Object.values(builtinNodeStrategies),
      ...manifests.flatMap(({ manifest }) => createNodeTypesFromPluginManifest(manifest)),
    ],
    pluginLock: runtimeCatalog.pluginLock,
  })

  if (coreCatalog.fingerprint !== runtimeCatalog.fingerprint) {
    throw new Error('插件目录指纹不一致，请刷新后重试')
  }

  const pluginLockById = new Map(coreCatalog.pluginLock.map((lock) => [lock.pluginId, lock]))
  const pluginLockByNodeType = new Map<string, WorkflowPluginLockItem>()
  const pluginGroupLabelByNodeType = new Map<string, string>()

  for (const { plugin, manifest } of manifests) {
    const lock = pluginLockById.get(plugin.pluginId)
    if (!lock) throw new Error(`插件目录缺少版本锁：${plugin.pluginId}`)

    const groupLabel = manifest.plugin.displayName
    for (const node of manifest.nodes) {
      pluginLockByNodeType.set(node.type, lock)
      pluginGroupLabelByNodeType.set(node.type, groupLabel)
    }
  }

  const nodeUIRegistry = createBuiltinNodeUIRegistry(coreCatalog.nodeRegistry)
  const mergedConfigRenderers = { ...builtinNodeConfigRenderers }

  for (const loaded of loadedWebModules) {
    try {
      const { uiRegistrations, configRenderers } = createPluginUiRegistrations(
        loaded.manifest,
        loaded.webModule,
      )

      for (const registration of uiRegistrations) {
        nodeUIRegistry.register(registration)
      }

      Object.assign(mergedConfigRenderers, configRenderers)
    } catch (error) {
      pluginRemoteErrors.set(
        loaded.pluginId,
        error instanceof Error ? error.message : '插件 UI 注册失败',
      )
    }
  }

  const loadedWebModuleByPluginId = new Map(
    loadedWebModules.map((loaded) => [loaded.pluginId, loaded.webModule]),
  )

  const hasUnresolvedRemoteUi = manifests.some(({ plugin, manifest }) => {
    if (pluginRemoteErrors.has(plugin.pluginId)) {
      return pluginManifestNeedsWebRemote(manifest)
    }

    return manifestHasUnresolvedRemoteUi(manifest, loadedWebModuleByPluginId.get(plugin.pluginId))
  })

  const catalog = createWorkflowWebCatalog({
    coreCatalog,
    nodeUIRegistry,
    fieldRenderers: {
      ...builtinFields,
      ...builtinWorkflowNodeConfigFieldRenderers,
    },
    configRenderers: mergedConfigRenderers,
    pluginLockByNodeType,
    pluginGroupLabelByNodeType,
  })

  return Object.freeze({
    ...catalog,
    pluginRemoteErrors: Object.freeze(new Map(pluginRemoteErrors)),
    hasUnresolvedRemoteUi,
    loadedWebModules: Object.freeze([...loadedWebModules]),
  })
}
