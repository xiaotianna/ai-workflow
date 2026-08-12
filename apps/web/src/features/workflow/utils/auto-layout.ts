import { BuiltinNodeType, type WorkflowEdge } from '@ai-workflow/core'
import type { XYPosition } from '@xyflow/react'

import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { getLoopNodeSize } from '@/utils/workflow/editor-elements'

const LAYOUT_ORIGIN = {
    x: 120,
    y: 120,
  },
  DEFAULT_NODE_SIZE = {
    width: 240,
    height: 100,
  },
  LAYER_GAP = 120,
  ROW_GAP = 64

interface LayoutInsertedNodeOnEdgeOptions {
  edgeCenter: XYPosition
  insertedNodeId: string
  sourceNodeId: string
  targetNodeId: string
}

function getNodeLayoutSize(node: WorkflowCanvasNode) {
  if (node.type === BuiltinNodeType.LOOP) return getLoopNodeSize(node)

  return {
    width:
      node.measured?.width ??
      node.width ??
      (typeof node.style?.width === 'number' ? node.style.width : DEFAULT_NODE_SIZE.width),
    height:
      node.measured?.height ??
      node.height ??
      (typeof node.style?.height === 'number' ? node.style.height : DEFAULT_NODE_SIZE.height),
  }
}

function getRootNodeRanks(
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
): Map<string, number> {
  const rootNodeIds = new Set(nodes.map((node) => node.id)),
    outgoingNodeIds = new Map<string, Set<string>>(),
    incomingCount = new Map(nodes.map((node) => [node.id, 0])),
    ranks = new Map(nodes.map((node) => [node.id, 0]))

  for (const edge of edges) {
    if (!rootNodeIds.has(edge.source) || !rootNodeIds.has(edge.target)) continue

    const outgoing = outgoingNodeIds.get(edge.source) ?? new Set<string>()
    if (outgoing.has(edge.target)) continue

    outgoing.add(edge.target)
    outgoingNodeIds.set(edge.source, outgoing)
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)
  }

  const pendingNodeIds = nodes
      .filter((node) => incomingCount.get(node.id) === 0)
      .map((node) => node.id),
    visitedNodeIds = new Set<string>()

  while (pendingNodeIds.length > 0) {
    const nodeId = pendingNodeIds.shift()!
    visitedNodeIds.add(nodeId)

    for (const targetNodeId of outgoingNodeIds.get(nodeId) ?? []) {
      ranks.set(targetNodeId, Math.max(ranks.get(targetNodeId) ?? 0, (ranks.get(nodeId) ?? 0) + 1))
      const nextIncomingCount = (incomingCount.get(targetNodeId) ?? 1) - 1
      incomingCount.set(targetNodeId, nextIncomingCount)

      if (nextIncomingCount === 0) pendingNodeIds.push(targetNodeId)
    }
  }

  let nextCycleRank = Math.max(0, ...ranks.values()) + 1

  for (const node of nodes) {
    if (visitedNodeIds.has(node.id)) continue

    ranks.set(node.id, nextCycleRank)
    nextCycleRank += 1
  }

  return ranks
}

function collectDownstreamNodeIds(
  startNodeId: string,
  edges: readonly WorkflowEdge[],
): Set<string> {
  const outgoingNodeIds = new Map<string, Set<string>>()

  for (const edge of edges) {
    const outgoing = outgoingNodeIds.get(edge.source) ?? new Set<string>()
    outgoing.add(edge.target)
    outgoingNodeIds.set(edge.source, outgoing)
  }

  const downstreamNodeIds = new Set<string>(),
    pendingNodeIds = [startNodeId]

  while (pendingNodeIds.length > 0) {
    const nodeId = pendingNodeIds.shift()!
    if (downstreamNodeIds.has(nodeId)) continue

    downstreamNodeIds.add(nodeId)
    pendingNodeIds.push(...(outgoingNodeIds.get(nodeId) ?? []))
  }

  return downstreamNodeIds
}

/**
 * 把新增节点放到原连线中，并只向后推动空间不足的下游分支。
 * 纵向沿用原贝塞尔连线的中点，后续节点整体平移以保留已有连线形态。
 */
export function layoutInsertedNodeOnEdge(
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
  { edgeCenter, insertedNodeId, sourceNodeId, targetNodeId }: LayoutInsertedNodeOnEdgeOptions,
): WorkflowCanvasNode[] {
  const sourceNode = nodes.find((node) => node.id === sourceNodeId && !node.parentId),
    targetNode = nodes.find((node) => node.id === targetNodeId && !node.parentId),
    insertedNode = nodes.find((node) => node.id === insertedNodeId && !node.parentId)

  if (!sourceNode || !targetNode || !insertedNode) return [...nodes]

  const sourceSize = getNodeLayoutSize(sourceNode),
    insertedSize = getNodeLayoutSize(insertedNode),
    minimumInsertedX = sourceNode.position.x + sourceSize.width + LAYER_GAP,
    maximumInsertedX = targetNode.position.x - insertedSize.width - LAYER_GAP,
    centeredInsertedX = edgeCenter.x - insertedSize.width / 2,
    insertedX =
      maximumInsertedX >= minimumInsertedX
        ? Math.min(Math.max(centeredInsertedX, minimumInsertedX), maximumInsertedX)
        : minimumInsertedX,
    insertedPosition = {
      x: insertedX,
      y: edgeCenter.y - insertedSize.height / 2,
    },
    requiredTargetX = insertedX + insertedSize.width + LAYER_GAP,
    downstreamOffsetX = Math.max(0, requiredTargetX - targetNode.position.x),
    downstreamNodeIds =
      downstreamOffsetX > 0 ? collectDownstreamNodeIds(targetNodeId, edges) : new Set<string>()

  // 环形连线不能反向推动本次插入的上游节点或新增节点。
  downstreamNodeIds.delete(sourceNodeId)
  downstreamNodeIds.delete(insertedNodeId)

  return nodes.map((node) => {
    if (node.id === insertedNodeId) {
      return { ...node, position: insertedPosition }
    }

    if (node.parentId || !downstreamNodeIds.has(node.id)) return node

    return {
      ...node,
      position: {
        x: node.position.x + downstreamOffsetX,
        y: node.position.y,
      },
    }
  })
}

export function autoLayoutRootNodes(
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
): WorkflowCanvasNode[] {
  const rootNodes = nodes.filter((node) => !node.parentId)
  if (rootNodes.length === 0) return [...nodes]

  const ranks = getRootNodeRanks(rootNodes, edges),
    layers = new Map<number, WorkflowCanvasNode[]>()

  for (const node of rootNodes) {
    const rank = ranks.get(node.id) ?? 0,
      layer = layers.get(rank) ?? []
    layer.push(node)
    layers.set(rank, layer)
  }

  const nextPositionByNodeId = new Map<string, WorkflowCanvasNode['position']>()
  let currentX = LAYOUT_ORIGIN.x

  for (const [, layerNodes] of [...layers.entries()].sort(([left], [right]) => left - right)) {
    let currentY = LAYOUT_ORIGIN.y,
      layerWidth = 0

    for (const node of layerNodes) {
      const size = getNodeLayoutSize(node)
      nextPositionByNodeId.set(node.id, { x: currentX, y: currentY })
      currentY += size.height + ROW_GAP
      layerWidth = Math.max(layerWidth, size.width)
    }

    currentX += layerWidth + LAYER_GAP
  }

  return nodes.map((node) => {
    const nextPosition = nextPositionByNodeId.get(node.id)

    return nextPosition ? { ...node, position: nextPosition } : node
  })
}
