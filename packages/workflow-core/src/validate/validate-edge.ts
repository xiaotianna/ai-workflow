import { WorkflowEdge } from '../edge/workflow-edge-schema'
import { PortDefinition } from '../port/port-types'
import {
  EdgeValidationResult,
  NodeValidationResult,
  PortConnectionCounts,
  ReportValidationIssueFn,
} from './validate-types'

// 校验边id的唯一性
const validateUniqueEdgeId = (
  edge: WorkflowEdge,
  edgeIds: Set<string>,
  report: ReportValidationIssueFn,
): boolean => {
  if (edgeIds.has(edge.id)) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      field: 'id',
      message: `边 ID 重复：${edge.id}`,
    })
    return false
  }
  edgeIds.add(edge.id)
  return true
}

// 校验一条边引用的两个节点是否存在
export const validateExistingEdgeNodes = (
  edge: WorkflowEdge,
  // validate-node.ts中导出的vaildateNodes，用于校验所有节点，并返回存在的节点
  nodes: NodeValidationResult,
  report: ReportValidationIssueFn,
): boolean => {
  const sourceExists = nodes.nodeIds.has(edge.source)
  const targetExists = nodes.nodeIds.has(edge.target)
  if (!sourceExists) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      field: 'source',
      nodeId: edge.source,
      message: `源节点不存在：${edge.source}`,
    })
  }
  if (!targetExists) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      field: 'target',
      nodeId: edge.target,
      message: `目标节点不存在：${edge.target}`,
    })
  }

  return sourceExists && targetExists
}

// 生成不包含id参数的边连接标识，用于识别完全重复的线【辅助函数】
// 因为线是node1->node2，即使id不同，但是source、target等完全一致也是重复的
const getConnectionKey = (edge: WorkflowEdge): string => {
  return JSON.stringify([edge.source, edge.sourceHandle, edge.target, edge.targetHandle])
}

// 校验源、目标及端口组成的连线是否重复
const validateUniqueConnection = (
  edge: WorkflowEdge,
  connections: Set<string>,
  report: ReportValidationIssueFn,
): boolean => {
  const key = getConnectionKey(edge)
  if (connections.has(key)) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      message: '存在完全重复的连线',
    })
    return false
  }
  connections.add(key)
  return true
}

// 解析边的端口
interface ResolveEdgePorts {
  output: PortDefinition
  input: PortDefinition
}

/**
 * 对边的端口进行校验，判断是否存在，并且方向是否正确，如果正确，返回对应的端口
 * 1、edge.sourceHandle 是否存在于源节点的 outputs 中
 * 2、edge.targetHandle 是否存在于目标节点的 inputs 中
 */
const resolveEdgePorts = (
  edge: WorkflowEdge,
  nodes: NodeValidationResult,
  report: ReportValidationIssueFn,
): ResolveEdgePorts | undefined => {
  const sourcePorts = nodes.portsByNodeId.get(edge.source)
  const targetPorts = nodes.portsByNodeId.get(edge.target)
  if (!sourcePorts || !targetPorts) {
    // 不进行问题上报，该校验错误已经在validateNodes上报过了，所以取不到值
    return undefined
  }

  const output = sourcePorts.outputs[edge.sourceHandle]
  const input = targetPorts.inputs[edge.targetHandle]

  if (!output) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      field: 'sourceHandle',
      nodeId: edge.source,
      portId: edge.sourceHandle,
      message: `源节点不存在输出端口：${edge.sourceHandle}`,
    })
  }

  if (!input) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      field: 'targetHandle',
      nodeId: edge.target,
      portId: edge.targetHandle,
      message: `目标节点不存在输入端口：${edge.targetHandle}`,
    })
  }

  return output && input ? { output, input } : undefined
}

// 校验源输出和目标输出的数据类型是否一致
const validateSameDataTypes = (
  edge: WorkflowEdge,
  ports: ResolveEdgePorts,
  report: ReportValidationIssueFn,
): boolean => {
  if (ports.output.dataType === ports.input.dataType) {
    return true
  }

  report({
    scope: 'edge',
    edgeId: edge.id,
    field: 'targetHandle',
    nodeId: edge.target,
    portId: edge.targetHandle,
    message: `端口数据类型不兼容：${ports.output.dataType} -> ${ports.input.dataType}`,
  })
  return false
}

// 将指定端点的连接数加一，并返回递增后的连接数【辅助函数】
const addPortConnectionCount = (
  counts: PortConnectionCounts,
  nodeId: string,
  portId: string,
): number => {
  let nodeCounts = counts.get(nodeId)
  if (!nodeCounts) {
    nodeCounts = new Map()
    counts.set(nodeId, nodeCounts)
  }
  const count = (nodeCounts.get(portId) ?? 0) + 1
  nodeCounts.set(portId, count)
  return count
}

// 校验连接数，以及端口的multiple字段约束
const validatePortConnectionLimits = (
  edge: WorkflowEdge,
  ports: ResolveEdgePorts,
  inputCounts: PortConnectionCounts,
  outputCounts: PortConnectionCounts,
  report: ReportValidationIssueFn,
): void => {
  const outputCount = addPortConnectionCount(outputCounts, edge.source, edge.sourceHandle)
  const inputCount = addPortConnectionCount(inputCounts, edge.target, edge.targetHandle)

  if (ports.output.multiple !== true && outputCount > 1) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      field: 'sourceHandle',
      nodeId: edge.source,
      portId: edge.sourceHandle,
      message: `输出端口不支持多条连线：${edge.sourceHandle}`,
    })
  }

  if (ports.input.multiple !== true && inputCount > 1) {
    report({
      scope: 'edge',
      edgeId: edge.id,
      field: 'targetHandle',
      nodeId: edge.target,
      portId: edge.targetHandle,
      message: `输入端口不支持多条连线：${edge.targetHandle}`,
    })
  }
}

// 校验一条边
const validateEdge = (
  edge: WorkflowEdge,
  edgeIds: Set<string>,
  nodes: NodeValidationResult,
  connections: Set<string>,
  inputConnectionCounts: PortConnectionCounts,
  outputConnectionCounts: PortConnectionCounts,
  report: ReportValidationIssueFn,
): boolean => {
  if (!validateUniqueEdgeId(edge, edgeIds, report)) {
    return false
  }

  if (!validateExistingEdgeNodes(edge, nodes, report)) {
    return false
  }

  if (!validateUniqueConnection(edge, connections, report)) {
    return false
  }

  const ports = resolveEdgePorts(edge, nodes, report)
  if (!ports || !validateSameDataTypes(edge, ports, report)) {
    return false
  }

  validatePortConnectionLimits(edge, ports, inputConnectionCounts, outputConnectionCounts, report)
  return true
}

// 校验所有边，并返回
export const validateEdges = (
  workflowEdges: readonly WorkflowEdge[],
  nodes: NodeValidationResult,
  report: ReportValidationIssueFn,
): EdgeValidationResult => {
  const edgeIds = new Set<string>()
  const connections = new Set<string>()
  const inputConnectionCounts: PortConnectionCounts = new Map()
  const outputConnectionCounts: PortConnectionCounts = new Map()
  const resolvedEdges: WorkflowEdge[] = []

  for (const edge of workflowEdges) {
    const isResolved = validateEdge(
      edge,
      edgeIds,
      nodes,
      connections,
      inputConnectionCounts,
      outputConnectionCounts,
      report,
    )
    if (isResolved) {
      resolvedEdges.push(edge)
    }
  }
  return { inputConnectionCounts, resolvedEdges }
}
