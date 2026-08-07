import {
  ENVIRONMENT_VARIABLE_NAMESPACE,
  getEnvironmentVariableDataType,
  SYSTEM_VARIABLE_DEFINITIONS,
  SYSTEM_VARIABLE_NAMESPACE,
  type NodeRegistryReader,
  type WorkflowEdge,
  type WorkflowEnvironmentVariable,
  type WorkflowNode,
} from '@ai-workflow/core'
import type { AvailableVariableOption } from '@ai-workflow/form/components/node-variable-section'

import { getWorkflowNodeDisplayLabel } from '@/utils/workflow/node-display'

const SYSTEM_VARIABLE_SOURCE_ID = JSON.stringify(['system'])
const ENVIRONMENT_VARIABLE_SOURCE_ID = JSON.stringify([ENVIRONMENT_VARIABLE_NAMESPACE])

const SYSTEM_VARIABLE_OPTIONS: readonly AvailableVariableOption[] = SYSTEM_VARIABLE_DEFINITIONS.map(
  (variable) => ({
    id: JSON.stringify(['system', variable.key]),
    label: `${SYSTEM_VARIABLE_NAMESPACE} / ${variable.key}`,
    sourceId: SYSTEM_VARIABLE_SOURCE_ID,
    sourceLabel: SYSTEM_VARIABLE_NAMESPACE,
    variableName: variable.key,
    dataType: variable.dataType,
    reference: {
      scope: 'system',
      key: variable.key,
      path: [],
    },
  }),
)

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

export function getAvailableVariables({
  nodeId,
  nodes,
  edges,
  environmentVariables,
  nodeRegistry,
}: {
  nodeId: string
  nodes: readonly WorkflowNode[]
  edges: readonly WorkflowEdge[]
  environmentVariables: readonly WorkflowEnvironmentVariable[]
  nodeRegistry: NodeRegistryReader
}): AvailableVariableOption[] {
  const upstreamNodeIds = collectUpstreamNodeIds(nodeId, edges)
  const environmentVariableOptions: AvailableVariableOption[] = environmentVariables.map(
    (variable) => ({
      id: JSON.stringify([ENVIRONMENT_VARIABLE_NAMESPACE, variable.id]),
      label: `${ENVIRONMENT_VARIABLE_NAMESPACE} / ${variable.name}`,
      sourceId: ENVIRONMENT_VARIABLE_SOURCE_ID,
      sourceLabel: ENVIRONMENT_VARIABLE_NAMESPACE,
      variableName: variable.name,
      dataType: getEnvironmentVariableDataType(variable.type),
      reference: {
        scope: ENVIRONMENT_VARIABLE_NAMESPACE,
        variableId: variable.id,
        path: [],
      },
    }),
  )
  const options: AvailableVariableOption[] = [
    ...SYSTEM_VARIABLE_OPTIONS,
    ...environmentVariableOptions,
  ]
  const optionIds = new Set(options.map((option) => option.id))

  for (const node of nodes) {
    if (!upstreamNodeIds.has(node.id)) continue

    const nodeLabel = getWorkflowNodeDisplayLabel(node, nodeRegistry)
    const outputs = new Map(
      node.outputs.map((output) => [
        output.key,
        {
          dataType: output.dataType,
        },
      ]),
    )
    for (const [outputKey, output] of outputs) {
      const optionId = JSON.stringify(['node', node.id, outputKey])
      if (optionIds.has(optionId)) continue

      optionIds.add(optionId)
      options.push({
        id: optionId,
        label: `${nodeLabel} / ${outputKey}`,
        sourceId: JSON.stringify(['node', node.id]),
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
