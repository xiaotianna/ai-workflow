import type { NodeType } from './node-definition'
import { NodeRegistryBuilder, type NodeRegistryReader } from './node-registry'
import { z } from 'zod'

export const workflowPluginLockItemSchema = z
  .object({
    pluginId: z.string().uuid(),
    version: z.string().trim().min(1).max(64),
    digest: z.string().regex(/^[a-f0-9]{64}$/i, '插件摘要必须是 SHA-256'),
  })
  .strict()

export const workflowPluginLockSchema = z
  .array(workflowPluginLockItemSchema)
  .superRefine((items, context) => {
    const pluginIds = new Set<string>()

    items.forEach((item, index) => {
      if (pluginIds.has(item.pluginId)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'pluginId'],
          message: `同一工作流不能锁定同一插件的多个版本：${item.pluginId}`,
        })
      }
      pluginIds.add(item.pluginId)
    })
  })

export type WorkflowPluginLockItem = Readonly<z.output<typeof workflowPluginLockItemSchema>>

export type WorkflowPluginLock = Readonly<z.output<typeof workflowPluginLockSchema>>

export interface WorkflowNodeCatalog {
  readonly fingerprint: string
  readonly pluginLock: WorkflowPluginLock
  readonly nodeRegistry: NodeRegistryReader
}

export interface CreateWorkflowNodeCatalogOptions {
  readonly hostVersion: string
  readonly nodes: Iterable<NodeType>
  readonly pluginLock?: WorkflowPluginLock
}

function createCatalogFingerprint(
  hostVersion: string,
  nodes: readonly NodeType[],
  pluginLock: WorkflowPluginLock,
): string {
  const source = [
    hostVersion,
    ...nodes.map((node) => `node:${node.definition.type}`).sort(),
    ...pluginLock
      .map(({ pluginId, version, digest }) => `plugin:${pluginId}@${version}:${digest}`)
      .sort(),
  ].join('|')
  let hash = 2_166_136_261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return `${hostVersion}:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function createWorkflowNodeCatalog({
  hostVersion,
  nodes,
  pluginLock = [],
}: CreateWorkflowNodeCatalogOptions): WorkflowNodeCatalog {
  const catalogNodes = [...nodes]
  const immutablePluginLock = Object.freeze(pluginLock.map((item) => Object.freeze({ ...item })))

  return Object.freeze({
    fingerprint: createCatalogFingerprint(hostVersion, catalogNodes, immutablePluginLock),
    pluginLock: immutablePluginLock,
    nodeRegistry: new NodeRegistryBuilder(catalogNodes).build(),
  })
}
