import {
  BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
  builtinNodeStrategies,
  createBuiltinWorkflowNodeCatalog,
  createWorkflowNodeCatalog,
  type WorkflowNodeCatalog,
  type WorkflowPluginLock,
  type WorkflowPluginLockItem,
} from '@ai-workflow/core'
import { createNodeTypesFromPluginManifest, pluginManifestSchema } from '@ai-workflow/plugin'
import {
  createWorkflowHostFieldRegistry,
  HostFieldProvider,
  type WorkflowHostFieldRegistry,
} from '@ai-workflow/plugin/ui'
import { builtinFields } from '@ai-workflow/form'
import type { NodeConfigFieldRendererMap } from '@ai-workflow/form/components/node-config-fields'
import {
  builtinNodeConfigRenderers,
  type NodeConfigRendererMap,
} from '@ai-workflow/form/components/node-config-section'
import { createBuiltinNodeUIRegistry, type NodeUIRegistryReader } from '@ai-workflow/nodes-ui'
import { createContext, useContext, type ReactNode } from 'react'

import { builtinWorkflowNodeConfigFieldRenderers } from '../node-config-renderers/builtin'
import type { PluginRuntimeCatalogDto } from '@/api/plugins'

export interface WorkflowWebCatalog {
  readonly fingerprint: string
  readonly pluginLock: WorkflowPluginLock
  readonly pluginLockByNodeType: ReadonlyMap<string, WorkflowPluginLockItem>
  readonly pluginGroupLabelByNodeType: ReadonlyMap<string, string>
  readonly nodeRegistry: WorkflowNodeCatalog['nodeRegistry']
  readonly nodeUIRegistry: NodeUIRegistryReader
  readonly fieldRenderers: NodeConfigFieldRendererMap
  readonly hostFieldRegistry: WorkflowHostFieldRegistry
  readonly configRenderers: NodeConfigRendererMap
}

export interface CreateWorkflowWebCatalogOptions {
  readonly coreCatalog: WorkflowNodeCatalog
  readonly nodeUIRegistry: NodeUIRegistryReader
  readonly fieldRenderers?: NodeConfigFieldRendererMap
  readonly configRenderers?: NodeConfigRendererMap
  readonly pluginLockByNodeType?: ReadonlyMap<string, WorkflowPluginLockItem>
  readonly pluginGroupLabelByNodeType?: ReadonlyMap<string, string>
}

export function createWorkflowWebCatalog({
  coreCatalog,
  nodeUIRegistry,
  fieldRenderers = {},
  configRenderers = {},
  pluginLockByNodeType = new Map(),
  pluginGroupLabelByNodeType = new Map(),
}: CreateWorkflowWebCatalogOptions): WorkflowWebCatalog {
  const resolvedFieldRenderers = Object.freeze({ ...fieldRenderers })

  return Object.freeze({
    fingerprint: coreCatalog.fingerprint,
    pluginLock: coreCatalog.pluginLock,
    pluginLockByNodeType,
    pluginGroupLabelByNodeType,
    nodeRegistry: coreCatalog.nodeRegistry,
    nodeUIRegistry,
    fieldRenderers: resolvedFieldRenderers,
    hostFieldRegistry: createWorkflowHostFieldRegistry(resolvedFieldRenderers),
    configRenderers: Object.freeze({ ...configRenderers }),
  })
}

export function createResolvedWorkflowWebCatalog(
  runtimeCatalog: PluginRuntimeCatalogDto,
): WorkflowWebCatalog {
  const manifests = runtimeCatalog.plugins.map((plugin) => ({
    plugin,
    manifest: pluginManifestSchema.parse(plugin.manifest),
  }))
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

  return createWorkflowWebCatalog({
    coreCatalog,
    nodeUIRegistry: createBuiltinNodeUIRegistry(coreCatalog.nodeRegistry),
    fieldRenderers: {
      ...builtinFields,
      ...builtinWorkflowNodeConfigFieldRenderers,
    },
    configRenderers: builtinNodeConfigRenderers,
    pluginLockByNodeType,
    pluginGroupLabelByNodeType,
  })
}

export function createBuiltinWorkflowWebCatalog(): WorkflowWebCatalog {
  const coreCatalog = createBuiltinWorkflowNodeCatalog()

  return createWorkflowWebCatalog({
    coreCatalog,
    nodeUIRegistry: createBuiltinNodeUIRegistry(coreCatalog.nodeRegistry),
    fieldRenderers: {
      ...builtinFields,
      ...builtinWorkflowNodeConfigFieldRenderers,
    },
    configRenderers: builtinNodeConfigRenderers,
  })
}

export const builtinWorkflowWebCatalog = createBuiltinWorkflowWebCatalog()

const WorkflowCatalogContext = createContext<WorkflowWebCatalog | undefined>(undefined)

export function WorkflowCatalogProvider({
  catalog,
  children,
}: {
  catalog: WorkflowWebCatalog
  children: ReactNode
}) {
  return (
    <WorkflowCatalogContext.Provider value={catalog}>
      <HostFieldProvider registry={catalog.hostFieldRegistry}>{children}</HostFieldProvider>
    </WorkflowCatalogContext.Provider>
  )
}

export function useWorkflowCatalog(): WorkflowWebCatalog {
  const catalog = useContext(WorkflowCatalogContext)

  if (!catalog) {
    throw new Error('WorkflowCatalogProvider 尚未挂载')
  }

  return catalog
}
