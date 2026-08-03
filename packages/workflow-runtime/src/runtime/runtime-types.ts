/**
 * 定义runtime的输入输出
 */

import type { JsonValue, SystemVariableKey, VariableValue, WorkflowNode } from '@ai-workflow/core'
import type { RuntimeErrorData } from './runtime-error'
import type { RuntimeState } from './runtime-state-schema'

// 定义启动一次 Runtime 所需的上下文数据
export interface StartRuntimeInput {
  // 当前工作流运行的唯一标识
  runId: string
  // 调用方传入的工作流业务输入（外部原始输入，尚未校验）
  input: Record<string, unknown>
  // Runtime 可读取的系统级变量，例如用户和工作流标识
  systemVariables: Record<SystemVariableKey, JsonValue>
}

// 事件1【DISPATCH_NODE】：派发一个节点执行任务
export interface DispatchNodeEffect {
  type: 'DISPATCH_NODE'
  runId: string
  // 当前需要执行的节点标识
  nodeId: WorkflowNode['id']
  // 主要针对loop执行，对普通节点无影响
  executionKey: string
  attempt: number
  // 节点类型，用于 Go Registry 选择 Executor
  nodeType: WorkflowNode['type']
  // 已完成变量解析并且可以安全写入mq的节点输入
  inputs: Record<string, JsonValue>
  // 已通过 NodeType Schema 校验、完成变量解析且可以安全写入 MQ 的节点配置
  config: Record<string, JsonValue>
}

// 事件2【COMPLETE_RUN】：工作流已经完成，并返回最终输出
export interface CompleteRunEffect {
  type: 'COMPLETE_RUN'
  runId: string
  // 根据core中 Workflow.outputs 解析得到的最终输出
  outputs: Record<string, JsonValue>
}

// 事件3【FAIL_RUN】：工作流执行失败，并返回标准化运行时错误
export interface FailRunEffect {
  type: 'FAIL_RUN'
  runId: string
  error: RuntimeErrorData
}

// 定义runtime返回给nestjs处理的三种事件
export type RuntimeEffect = DispatchNodeEffect | CompleteRunEffect | FailRunEffect

// 每执行一个节点，都会记录最新的状态快照，以及需要外部执行的操作
export interface RuntimeTransition {
  // 状态快照
  state: RuntimeState
  // 下一步执行操作，如果开始节点连接了两个节点，那么就是并行操作
  effects: RuntimeEffect[]
}

// runtime在解析某个node的config时，提供当前是哪个node，以及如何解析变量
export interface RuntimeVariableResolverContext {
  readonly node: WorkflowNode
  resolveValue(value: VariableValue): JsonValue
}
