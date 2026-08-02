/**
 * 定义runtime的输入输出
 */

import { JsonValue, SystemVariableKey, WorkflowEdge, WorkflowNode } from '@ai-workflow/core'

// 定义 Runtime 节点状态
export type RuntimeNodeStatus =
  // 等待执行（节点还不满足执行条件）
  | 'PENDING'
  // 运行中
  | 'RUNNING'
  // 成功
  | 'SUCCEEDED'
  // 失败
  | 'FAILED'
  // 暂停（正在等待外部事件，例如人工审核、子工作流返回等，之后还可能恢复）
  | 'SUSPENDED'
  // 跳过，该节点不会执行（例如条件节点）
  | 'SKIPPED'

// 定义 Runtime 边状态
export type RuntimeEdgeStatus =
  // 等待（上游节点尚未完成，当前边状态仍未确定）
  | 'WAITING'
  // 激活（上游节点激活了当前边对应的 sourceHandle）
  | 'ACTIVE'
  // 未激活（上游节点未选择当前边或已经被跳过）
  | 'INACTIVE'

// 定义启动一次 Runtime 所需的上下文数据
export interface StartRuntimeInput {
  // 当前工作流运行的唯一标识
  runId: string
  // 调用方传入的工作流业务输入（外部原始输入，尚未校验）
  input: Record<string, unknown>
  // Runtime 可读取的系统级变量，例如用户和工作流标识
  system: Record<SystemVariableKey, JsonValue>
}

// 运行完整状态
export interface RuntimeState {
  // 工作流唯一标识
  runId: string
  // 已根据 Start 节点定义校验并归一化（和StartRuntimeInput的区别在于是否进行了参数校验）
  input: Record<string, unknown>
  system: Record<SystemVariableKey, JsonValue>
  // 节点运行状态
  nodes: Record<WorkflowNode['id'], RuntimeNodeStatus>
  // 边运行状态
  edges: Record<WorkflowEdge['id'], RuntimeEdgeStatus>
  /**
   * 按 Runtime executionKey 保存每次节点执行产生的 JSON 输出对象
   * executionKey 是“某个节点在这次工作流运行中的某一次逻辑执行”的唯一标识，
   * 不直接使用 nodeId，主要是因为 Loop 中同一个节点可能执行多次
   * 可以用于重试节点，以及runtime节点定位
   * outputs: Record<executionKey, Record<outputField输出字段, 值>>
   */
  outputs: Record<string, Record<string, JsonValue>>
  // 按 Runtime executionKey 与 nodeId 的映射
  nodeIdByExecutionKey: Record<string, WorkflowNode['id']>
  // 保存 Loop 与 Sub Workflow 的 Runtime 自有 Scope 状态
  // scopes: Record<string, RuntimeScopeState>
}
