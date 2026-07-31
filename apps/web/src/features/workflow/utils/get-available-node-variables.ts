import { getNodePorts, nodeRegistry, type WorkflowEdge, type WorkflowNode } from '@ai-workflow/core'
import type { AvailableVariableOption } from '@ai-workflow/form/components/node-variable-section'

import { getWorkflowNodeDisplayLabel } from '@/utils/workflow/node-display'

function collectUpstreamNodeIds(nodeId: string, edges: readonly WorkflowEdge[]) {
  const incomingNodeIds = new Map<string, string[]>()

  for (const edge of edges) {
    const incoming = incomingNodeIds.get(edge.target) ?? []
    incoming.push(edge.source)
    incomingNodeIds.set(edge.target, incoming)
  }

  const upstreamNodeIds = new Set<string>()
  const pendingNodeIds = [...(incomingNodeIds.get(nodeId) ?? [])]

  while (pendingNodeIds.length > 0) {
    const upstreamNodeId = pendingNodeIds.pop()!
    if (upstreamNodeIds.has(upstreamNodeId)) continue

    upstreamNodeIds.add(upstreamNodeId)
    pendingNodeIds.push(...(incomingNodeIds.get(upstreamNodeId) ?? []))
  }

  return upstreamNodeIds
}

export function getAvailableNodeVariables({
  nodeId,
  nodes,
  edges,
}: {
  nodeId: string
  nodes: readonly WorkflowNode[]
  edges: readonly WorkflowEdge[]
}): AvailableVariableOption[] {
  const upstreamNodeIds = collectUpstreamNodeIds(nodeId, edges)
  const options: AvailableVariableOption[] = []
  const optionIds = new Set<string>()

  for (const node of nodes) {
    if (!upstreamNodeIds.has(node.id)) continue

    const nodeType = nodeRegistry.get(node.type)
    if (!nodeType) continue

    const nodeLabel = getWorkflowNodeDisplayLabel(node)
    const outputs = new Map(
      node.outputs.map((output) => [
        output.key,
        {
          dataType: output.dataType,
        },
      ]),
    )
    const parsedConfig = nodeType.schema.safeParse(node.config)

    if (parsedConfig.success) {
      const ports = getNodePorts(nodeType, parsedConfig.data)

      for (const [outputKey, port] of Object.entries(ports.outputs)) {
        if (!outputs.has(outputKey)) {
          outputs.set(outputKey, {
            dataType: port.dataType,
          })
        }
      }
    }

    for (const [outputKey, output] of outputs) {
      const optionId = JSON.stringify([node.id, outputKey])
      if (optionIds.has(optionId)) continue

      optionIds.add(optionId)
      options.push({
        id: optionId,
        label: `${nodeLabel} / ${outputKey}`,
        sourceId: node.id,
        sourceLabel: nodeLabel,
        variableName: outputKey,
        dataType: output.dataType,
        reference: {
          scope: 'node',
          nodeId: node.id,
          outputKey,
          path: [],
        },
      })
    }
  }

  return options
}
