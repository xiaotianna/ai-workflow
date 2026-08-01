import type { WorkflowEdge } from '../edge/workflow-edge-schema'
import type { WorkflowNode } from '../node/workflow-node-schema'
import type { WorkflowEnvironmentVariable } from '../variable/environment-variable'
import type { NodeValidationResult, ReportValidationIssueFn } from './validate-types'

// 根据执行连线收集当前节点的全部上游节点，变量可见性不依赖画布坐标或nodes数组顺序
const collectUpstreamNodeIds = (
  nodeId: string,
  incomingNodeIds: ReadonlyMap<string, readonly string[]>,
): Set<string> => {
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

// 校验节点输入引用只能读取上游节点已经公开的输出变量
export const validateVariableReferences = (
  workflowNodes: readonly WorkflowNode[],
  environmentVariables: readonly WorkflowEnvironmentVariable[],
  resolvedEdges: readonly WorkflowEdge[],
  nodes: NodeValidationResult,
  report: ReportValidationIssueFn,
): void => {
  const nodeById = new Map(workflowNodes.map((node) => [node.id, node]))
  const environmentVariableIds = new Set(environmentVariables.map((variable) => variable.id))
  const incomingNodeIds = new Map<string, string[]>()

  for (const edge of resolvedEdges) {
    const incoming = incomingNodeIds.get(edge.target) ?? []
    incoming.push(edge.source)
    incomingNodeIds.set(edge.target, incoming)
  }

  for (const node of workflowNodes) {
    const upstreamNodeIds = collectUpstreamNodeIds(node.id, incomingNodeIds)

    for (const [inputKey, inputValue] of Object.entries(node.inputs)) {
      if (inputValue.type !== 'reference') {
        continue
      }

      if (inputValue.reference.scope === 'env') {
        if (!environmentVariableIds.has(inputValue.reference.variableId)) {
          report({
            scope: 'node',
            nodeId: node.id,
            field: 'inputs',
            message: `输入变量 ${inputKey} 引用了不存在的环境变量：${inputValue.reference.variableId}`,
          })
        }

        continue
      }

      if (inputValue.reference.scope !== 'node') continue

      const { nodeId: referencedNodeId, outputKey } = inputValue.reference
      const referencedNode = nodeById.get(referencedNodeId)

      if (!referencedNode) {
        report({
          scope: 'node',
          nodeId: node.id,
          field: 'inputs',
          message: `输入变量 ${inputKey} 引用了不存在的节点：${referencedNodeId}`,
        })
        continue
      }

      if (!upstreamNodeIds.has(referencedNodeId)) {
        report({
          scope: 'node',
          nodeId: node.id,
          field: 'inputs',
          message: `输入变量 ${inputKey} 只能引用上游节点：${referencedNodeId}`,
        })
        continue
      }

      const dynamicOutputExists = referencedNode.outputs.some((output) => output.key === outputKey)
      const staticOutputExists = Boolean(
        nodes.portsByNodeId.get(referencedNodeId)?.outputs[outputKey],
      )

      if (!dynamicOutputExists && !staticOutputExists) {
        report({
          scope: 'node',
          nodeId: node.id,
          field: 'inputs',
          message: `输入变量 ${inputKey} 引用了不存在的输出变量：${referencedNodeId}.${outputKey}`,
        })
      }
    }
  }
}
