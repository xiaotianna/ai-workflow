import type { WorkflowEdge } from '../edge/workflow-edge-schema'
import type { NodeDefinition, WorkflowNode } from '../node'

// 单个节点的字段、输入端口产生的校验错误
// 注：因为可以通过scope确定节点位置，所以不用要输出端口，同时端口的校验在edge上
export interface NodeValidationIssue {
  scope: 'node'
  nodeId: string
  field?: keyof WorkflowNode
  portId?: string
  message: string
}

// 边校验错误类型（针对单个错误）
export interface EdgeValidationIssue {
  scope: 'edge'
  edgeId: string
  field?: keyof WorkflowEdge
  nodeId?: string
  portId?: string
  message: string
}

// 整体工作流错误
interface WorkflowLevelValidationIssue {
  scope: 'workflow'
  message: string
}

export type WorkflowValidationIssue =
  | NodeValidationIssue
  | EdgeValidationIssue
  | WorkflowLevelValidationIssue

// 各个校验方法收集错误的统一上报函数
export type ReportValidationIssueFn = (issue: WorkflowValidationIssue) => void

// 节点校验后，最后的有效结果（不保存错误，是可用节点信息）
export interface NodeValidationResult {
  nodeIds: Set<WorkflowNode['id']>
  portsByNodeId: Map<WorkflowNode['id'], NodeDefinition['ports']>
}

// 节点中各端口的有效连接数
export type PortConnectionCounts = Map<WorkflowNode['id'], Map<string, number>>

// 边校验结果，供必填输入和拓扑规则使用（只保存边校验后可供后续规则使用的数据）
export interface EdgeValidationResult {
  inputConnectionCounts: PortConnectionCounts
  resolvedEdges: WorkflowEdge[]
}
