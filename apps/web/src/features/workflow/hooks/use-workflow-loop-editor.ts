import { BuiltinNodeType, type NodeRegistryReader, type WorkflowEdge } from '@ai-workflow/core'
import type { Dispatch, SetStateAction } from 'react'

import type { WorkflowCanvasNode } from '@/components/workflow/types'
import {
  collectDescendantNodeIds,
  createCanvasNodes,
  getLoopNodeSize,
  syncLoopChildExtents,
} from '@/utils/workflow/editor-elements'
import {
  isLoopSystemNodeType,
  LOOP_UNAVAILABLE_NODE_TYPES,
} from '@/utils/workflow/node-type-visibility'
import { getNextLoopChildPosition } from '../utils/get-next-loop-child-position'

interface UseWorkflowLoopEditorOptions {
  nodes: readonly WorkflowCanvasNode[]
  edges: readonly WorkflowEdge[]
  setNodes: Dispatch<SetStateAction<WorkflowCanvasNode[]>>
  checkpointHistory: () => void
  markDirty: () => void
  updateNodeInternals: (nodeId: string) => void
  nodeRegistry: NodeRegistryReader
}

/**
 * 维护 Loop 容器相关的编辑行为：子节点添加、缩放边界同步与删除拦截。
 * 必须在 ReactFlowProvider 内、与 useWorkflowEditor 共享 nodes 状态后调用。
 */
export function useWorkflowLoopEditor({
  nodes,
  edges,
  setNodes,
  checkpointHistory,
  markDirty,
  updateNodeInternals,
  nodeRegistry,
}: UseWorkflowLoopEditorOptions) {
  const availableNodeTypes = nodeRegistry
    .list()
    .filter((nodeType) => !LOOP_UNAVAILABLE_NODE_TYPES.has(nodeType.definition.type))

  function syncChildExtents() {
    requestAnimationFrame(() => {
      setNodes((currentNodes) => syncLoopChildExtents(currentNodes))
    })
  }

  function addNodeToLoop(type: string, loopId: string) {
    if (LOOP_UNAVAILABLE_NODE_TYPES.has(type)) {
      return
    }

    const parentLoop = nodes.find(
      (node) => node.id === loopId && node.type === BuiltinNodeType.LOOP,
    )

    if (!parentLoop) {
      return
    }

    const nodeType = nodeRegistry.get(type)

    if (!nodeType) {
      return
    }

    const createdNodes = createCanvasNodes({
      type: nodeType.definition.type,
      existingNodes: nodes,
      parentId: loopId,
      position: getNextLoopChildPosition(loopId, nodes),
      parentSize: getLoopNodeSize(parentLoop),
      nodeRegistry,
    })

    checkpointHistory()
    setNodes((currentNodes) => [...currentNodes, ...createdNodes])
    markDirty()

    requestAnimationFrame(() => {
      updateNodeInternals(loopId)
    })
  }

  function getDeletableRootIds(requestedNodeIds: ReadonlySet<string>) {
    return new Set(
      nodes
        .filter((node) => requestedNodeIds.has(node.id) && !isLoopSystemNodeType(node.type))
        .map((node) => node.id),
    )
  }

  function resolveBeforeDelete(
    requestedNodes: WorkflowCanvasNode[],
    requestedEdges: WorkflowEdge[],
  ) {
    const deletedNodeIds = collectDescendantNodeIds(
        getDeletableRootIds(new Set(requestedNodes.map((node) => node.id))),
        nodes,
      ),
      requestedEdgeIds = new Set(requestedEdges.map((edge) => edge.id)),
      deletedNodes = nodes.filter((node) => deletedNodeIds.has(node.id)),
      deletedEdges = edges.filter(
        (edge) =>
          requestedEdgeIds.has(edge.id) ||
          deletedNodeIds.has(edge.source) ||
          deletedNodeIds.has(edge.target),
      )

    if (deletedNodes.length === 0 && deletedEdges.length === 0) {
      return false
    }

    return {
      nodes: deletedNodes,
      edges: deletedEdges,
    }
  }

  return {
    addNodeToLoop,
    availableNodeTypes,
    getDeletableRootIds,
    resolveBeforeDelete,
    syncChildExtents,
  }
}

export type WorkflowLoopEditor = ReturnType<typeof useWorkflowLoopEditor>
