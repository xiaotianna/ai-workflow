import { createBuiltinWorkflowNodeCatalog, type WorkflowNodeCatalog } from '@ai-workflow/core'
import { builtinFields } from '@ai-workflow/form'
import type { NodeConfigFieldRendererMap } from '@ai-workflow/form/components/node-config-fields'
import {
  builtinNodeConfigRenderers,
  type NodeConfigRendererMap,
} from '@ai-workflow/form/components/node-config-section'
import { createBuiltinNodeUIRegistry, type NodeUIRegistryReader } from '@ai-workflow/nodes-ui'
import { createContext, useContext, type ReactNode } from 'react'

import { builtinWorkflowNodeConfigFieldRenderers } from '../node-config-renderers/builtin'

export interface WorkflowWebCatalog {
  readonly fingerprint: string
  readonly nodeRegistry: WorkflowNodeCatalog['nodeRegistry']
  readonly nodeUIRegistry: NodeUIRegistryReader
  readonly fieldRenderers: NodeConfigFieldRendererMap
  readonly configRenderers: NodeConfigRendererMap
}

export interface CreateWorkflowWebCatalogOptions {
  readonly coreCatalog: WorkflowNodeCatalog
  readonly nodeUIRegistry: NodeUIRegistryReader
  readonly fieldRenderers?: NodeConfigFieldRendererMap
  readonly configRenderers?: NodeConfigRendererMap
}

export function createWorkflowWebCatalog({
  coreCatalog,
  nodeUIRegistry,
  fieldRenderers = {},
  configRenderers = {},
}: CreateWorkflowWebCatalogOptions): WorkflowWebCatalog {
  return Object.freeze({
    fingerprint: coreCatalog.fingerprint,
    nodeRegistry: coreCatalog.nodeRegistry,
    nodeUIRegistry,
    fieldRenderers: Object.freeze({ ...fieldRenderers }),
    configRenderers: Object.freeze({ ...configRenderers }),
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
    <WorkflowCatalogContext.Provider value={catalog}>{children}</WorkflowCatalogContext.Provider>
  )
}

export function useWorkflowCatalog(): WorkflowWebCatalog {
  const catalog = useContext(WorkflowCatalogContext)

  if (!catalog) {
    throw new Error('WorkflowCatalogProvider 尚未挂载')
  }

  return catalog
}
