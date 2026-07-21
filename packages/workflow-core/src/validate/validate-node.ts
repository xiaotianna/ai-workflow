// 该文件用于校验node相关的内容，例如：id唯一、是否node已注册...

import { getNodePorts, NodeDefinition, NodeRegistry, NodeType, WorkflowNode } from '../node'
import {
  NodeValidationResult,
  PortConnectionCounts,
  ReportValidationIssueFn,
} from './validate-types'

// 校验节点id唯一
const validateUniqueNodeId = (
  node: WorkflowNode,
  nodeIds: ReadonlySet<string>,
  report: ReportValidationIssueFn,
): boolean => {
  if (!nodeIds.has(node.id)) {
    return true
  }

  report({
    scope: 'node',
    nodeId: node.id,
    field: 'id',
    message: `节点 ID 重复：${node.id}`,
  })
  return false
}

// 校验节点是否注册
const validateRegisteredNodeType = (
  node: WorkflowNode,
  registry: NodeRegistry,
  report: ReportValidationIssueFn,
): NodeType | undefined => {
  // node完整实例
  const nodeType = registry.get(node.type)
  if (nodeType) {
    return nodeType
  }

  report({
    scope: 'node',
    nodeId: node.id,
    field: 'type',
    message: `未知节点类型：${node.type}`,
  })
  return undefined
}

// 校验节点配置，并返回解析的端口，包含静态和动态端口，如果配置校验失败则不返回
const resolveNodePorts = (
  node: WorkflowNode,
  nodeType: NodeType,
  report: ReportValidationIssueFn,
): NodeDefinition['ports'] | undefined => {
  const result = nodeType.schema.safeParse(node.config)
  if (!result.success) {
    report({
      scope: 'node',
      nodeId: node.id,
      field: 'config',
      message: `节点配置不合法：${result.error.issues.map((issue) => issue.message).join('; ')}`,
    })
    return undefined
  }

  return getNodePorts(nodeType, node.config)
}

// 校验单个节点，并收集后续校验所需的节点信息
const validateNode = (
  node: WorkflowNode,
  nodeIds: Set<string>,
  portsByNodeId: NodeValidationResult['portsByNodeId'],
  registry: NodeRegistry,
  report: ReportValidationIssueFn,
): void => {
  // 校验id是否唯一
  if (!validateUniqueNodeId(node, nodeIds, report)) {
    return
  }
  nodeIds.add(node.id)

  // 校验节点是否注册
  const nodeType = validateRegisteredNodeType(node, registry, report)
  if (!nodeType) {
    return
  }

  // 校验节点config，并返回解析的端口（静态+动态）
  const ports = resolveNodePorts(node, nodeType, report)
  if (ports) {
    portsByNodeId.set(node.id, ports)
  }
}

// 校验全部节点，并返回存在的节点和解析的端口
export const validateNodes = (
  workflowNodes: readonly WorkflowNode[],
  registry: NodeRegistry,
  report: ReportValidationIssueFn,
): NodeValidationResult => {
  const nodeIds = new Set<string>()
  const portsByNodeId: NodeValidationResult['portsByNodeId'] = new Map()

  for (const node of workflowNodes) {
    validateNode(node, nodeIds, portsByNodeId, registry, report)
  }

  return {
    nodeIds,
    portsByNodeId,
  }
}

// 执行工作流之前，每个必填输入端口是否至少连接了一条边
export const validateRequiredNodeInputs = (
  nodes: NodeValidationResult,
  inputConnectionCounts: PortConnectionCounts,
  report: ReportValidationIssueFn,
): void => {
  for (const [nodeId, ports] of nodes.portsByNodeId) {
    const inputCounts = inputConnectionCounts.get(nodeId)

    for (const [portId, port] of Object.entries(ports.inputs)) {
      if (port.required === true && !inputCounts?.has(portId)) {
        report({
          scope: 'node',
          nodeId,
          portId,
          message: `必填输入端口尚未连接：${portId}`,
        })
      }
    }
  }
}
