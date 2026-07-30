import type { WorkflowEdge } from '@ai-workflow/core'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'

import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { collectDescendantNodeIds, getSelectionRootNodeIds } from '@/utils/workflow/editor-elements'
import { isLoopSystemNodeType } from '@/utils/workflow/node-type-visibility'

export interface WorkflowClipboardPayload {
  readonly nodes: readonly WorkflowCanvasNode[]
  readonly edges: readonly WorkflowEdge[]
  readonly rootNodeIds: readonly string[]
}

interface PasteWorkflowClipboardResult {
  nodes: WorkflowCanvasNode[]
  edges: WorkflowEdge[]
  selectedNodeIds: Set<string>
}

function cloneClipboardNode(node: WorkflowCanvasNode): WorkflowCanvasNode {
  const clonedNode = structuredClone(node)

  delete clonedNode.dragging
  delete clonedNode.measured
  delete clonedNode.selected

  return clonedNode
}

function remapNodeInputReferences(
  node: WorkflowCanvasNode,
  nodeIdMap: ReadonlyMap<string, string>,
): WorkflowCanvasNode['data']['inputs'] {
  return Object.fromEntries(
    Object.entries(node.data.inputs).map(([inputKey, inputValue]) => {
      if (
        inputValue.type !== 'reference' ||
        inputValue.reference.scope !== 'node' ||
        !nodeIdMap.has(inputValue.reference.nodeId)
      ) {
        return [inputKey, structuredClone(inputValue)]
      }

      return [
        inputKey,
        {
          ...structuredClone(inputValue),
          reference: {
            ...structuredClone(inputValue.reference),
            nodeId: nodeIdMap.get(inputValue.reference.nodeId)!,
          },
        },
      ]
    }),
  )
}

export function createWorkflowClipboardPayload(
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
  selectedNodeIds: ReadonlySet<string>,
): WorkflowClipboardPayload | undefined {
  const copyableSelectedNodeIds = new Set(
    nodes
      .filter((node) => selectedNodeIds.has(node.id) && !isLoopSystemNodeType(node.type))
      .map((node) => node.id),
  )
  const rootNodeIds = getSelectionRootNodeIds(copyableSelectedNodeIds, nodes)

  if (rootNodeIds.size === 0) return undefined

  const copiedNodeIds = collectDescendantNodeIds(rootNodeIds, nodes)

  return {
    nodes: nodes.filter((node) => copiedNodeIds.has(node.id)).map(cloneClipboardNode),
    edges: edges
      .filter((edge) => copiedNodeIds.has(edge.source) && copiedNodeIds.has(edge.target))
      .map((edge) => structuredClone(edge)),
    rootNodeIds: [...rootNodeIds],
  }
}

export function pasteWorkflowClipboardPayload({
  payload,
  currentNodes,
  disabledNodeTypes,
  offset,
}: {
  payload: WorkflowClipboardPayload
  currentNodes: readonly WorkflowCanvasNode[]
  disabledNodeTypes: ReadonlySet<string>
  offset: number
}): PasteWorkflowClipboardResult | undefined {
  const copiedNodeIds = new Set(payload.nodes.map((node) => node.id))
  const currentNodeIds = new Set(currentNodes.map((node) => node.id))
  const allowedSourceNodeIds = new Set<string>()
  let changed = true

  while (changed) {
    changed = false

    for (const node of payload.nodes) {
      if (allowedSourceNodeIds.has(node.id) || disabledNodeTypes.has(node.type)) continue

      const parentAvailable =
        !node.parentId ||
        (copiedNodeIds.has(node.parentId)
          ? allowedSourceNodeIds.has(node.parentId)
          : currentNodeIds.has(node.parentId))

      if (!parentAvailable) continue

      allowedSourceNodeIds.add(node.id)
      changed = true
    }
  }

  if (allowedSourceNodeIds.size === 0) return undefined

  const nodeIdMap = new Map(
    [...allowedSourceNodeIds].map((sourceNodeId) => [sourceNodeId, generateUuid()]),
  )
  const pastedNodes = payload.nodes.flatMap((node) => {
    const nextNodeId = nodeIdMap.get(node.id)
    if (!nextNodeId) return []

    const copiedParentId = node.parentId ? nodeIdMap.get(node.parentId) : undefined
    const shouldOffsetPosition = !node.parentId || !copiedNodeIds.has(node.parentId)

    return [
      {
        ...cloneClipboardNode(node),
        id: nextNodeId,
        position: shouldOffsetPosition
          ? {
              x: node.position.x + offset,
              y: node.position.y + offset,
            }
          : { ...node.position },
        parentId: copiedParentId ?? node.parentId,
        data: {
          ...structuredClone(node.data),
          inputs: remapNodeInputReferences(node, nodeIdMap),
        },
      },
    ]
  })
  const pastedEdges = payload.edges.flatMap((edge) => {
    const source = nodeIdMap.get(edge.source)
    const target = nodeIdMap.get(edge.target)

    if (!source || !target) return []

    return [
      {
        ...structuredClone(edge),
        id: generateUuid(),
        source,
        target,
      },
    ]
  })

  return {
    nodes: pastedNodes,
    edges: pastedEdges,
    selectedNodeIds: new Set(
      payload.rootNodeIds.flatMap((sourceNodeId) => {
        const pastedNodeId = nodeIdMap.get(sourceNodeId)
        return pastedNodeId ? [pastedNodeId] : []
      }),
    ),
  }
}
