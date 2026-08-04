import {
  jsonValueSchema,
  systemVariableKeySchema,
  type JsonValue,
  type SystemVariableKey,
} from '@ai-workflow/core'
import { z } from 'zod'
import { runtimeErrorDataSchema } from './runtime-error'

// 工作流运行状态
export const RUNTIME_RUN_STATUSES = {
  // 运行中
  RUNNING: 'RUNNING',
  // 成功
  SUCCEEDED: 'SUCCEEDED',
  // 失败
  FAILED: 'FAILED',
} as const

// 定义 Runtime 节点状态
export const RUNTIME_NODE_STATUSES = {
  // 等待执行（节点还不满足执行条件）
  WAITING: 'WAITING',
  // 运行中
  RUNNING: 'RUNNING',
  // 成功
  SUCCEEDED: 'SUCCEEDED',
  // 失败
  FAILED: 'FAILED',
  // 跳过，该节点不会执行（例如条件节点）
  SKIPPED: 'SKIPPED',
} as const

// 定义 Runtime 边状态
export const RUNTIME_EDGE_STATUSES = {
  // 等待（上游节点尚未完成，当前边状态仍未确定）
  WAITING: 'WAITING',
  // 激活（上游节点激活了当前边对应的 sourceHandle）
  ACTIVE: 'ACTIVE',
  // 未激活（上游节点未选择当前边或已经被跳过）
  INACTIVE: 'INACTIVE',
} as const

// 单次节点逻辑执行记录的状态
export const RUNTIME_EXECUTION_STATUSES = {
  // 节点任务已经派发，正在等待 Executor 返回结果
  RUNNING: 'RUNNING',
  // Executor 已成功返回并保存输出
  SUCCEEDED: 'SUCCEEDED',
  // Executor 执行失败或 Runtime 无法接受执行结果
  FAILED: 'FAILED',
} as const

const runtimeRunStatusSchema = z.enum(RUNTIME_RUN_STATUSES)
const runtimeNodeStatusSchema = z.enum(RUNTIME_NODE_STATUSES)
const runtimeEdgeStatusSchema = z.enum(RUNTIME_EDGE_STATUSES)
const runtimeExecutionStatusSchema = z.enum(RUNTIME_EXECUTION_STATUSES)

// 当前 Run 可读取的系统级变量，例如用户、应用、Workflow 和 Run 标识；键和值契约复用 Core
const runtimeSystemVariablesSchema: z.ZodType<Record<SystemVariableKey, JsonValue>> = z.record(
  systemVariableKeySchema,
  jsonValueSchema,
)

export const runtimeNodeStateSchema = z.object({
  // 当前节点在根 DAG 中的运行状态
  status: runtimeNodeStatusSchema,
  // 当前节点最近一次逻辑执行的 executionKey；恢复和变量解析不能反向拆解 executionKey
  latestExecutionKey: z.string().min(1).optional(),
})

export const runtimeExecutionSchema = z.object({
  // 某个节点在本次工作流运行中的一次逻辑执行标识；Loop 和重试会产生不同 executionKey
  executionKey: z.string().min(1),
  // 当前 Execution 对应的 Workflow 节点 ID
  nodeId: z.string().min(1),
  // 当前 Execution 所在的 Runtime Scope；第一阶段只支持根作用域
  scopeKey: z.literal('root'),
  // 节点执行位置的逻辑序号，用于确定性恢复和生成下一次 Execution
  sequence: z.number().int().nonnegative(),
  // 当前节点逻辑执行的尝试次数，首次执行为 1
  attempt: z.number().int().positive(),
  // 当前 Execution 的运行状态
  status: runtimeExecutionStatusSchema,
  // 本地控制节点完成后记录的执行耗时；业务节点的实际耗时由宿主 NodeRun 持久化
  durationMs: z.number().int().nonnegative().optional(),
  // 已完成变量解析，可以安全派发给 Executor 的节点输入
  inputs: z.record(z.string(), jsonValueSchema),
  // 已通过节点 Schema 校验并完成变量解析，可以安全派发给 Executor 的节点配置
  config: z.record(z.string(), jsonValueSchema),
  // Executor 成功返回后，按节点已声明输出投影出的可引用 JSON 变量
  outputs: z.record(z.string(), jsonValueSchema).optional(),
  // Executor 或 Runtime 产生的标准化错误数据，只在执行失败时保存
  error: runtimeErrorDataSchema.optional(),
})

export const RUNTIME_STATE_SCHEMA_VERSION = 1 as const

export const runtimeStateSchema = z.object({
  // 持久化 State 的结构版本，用于恢复时选择兼容的解析或迁移逻辑
  schemaVersion: z.literal(RUNTIME_STATE_SCHEMA_VERSION),
  // State 修订号，由宿主用于串行提交或乐观锁控制，防止并行结果互相覆盖
  revision: z.number().int().nonnegative(),
  // 当前工作流运行的唯一标识
  runId: z.string().min(1),
  // 当前运行所属的 Workflow ID
  workflowId: z.string().min(1),
  // 当前运行绑定的不可变 WorkflowVersion 快照 ID
  workflowVersionId: z.string().min(1),
  // 当前工作流 Run 的整体状态
  status: runtimeRunStatusSchema,
  // 已根据 Start 节点输出定义校验并归一化的调用输入
  startInput: z.record(z.string(), jsonValueSchema),
  // Runtime 可读取的系统级变量，例如用户、应用、Workflow 和 Run 标识
  systemVariables: runtimeSystemVariablesSchema,
  // 按节点 ID 保存根 DAG 中每个节点的当前状态和最近一次 Execution
  nodeStates: z.record(z.string(), runtimeNodeStateSchema),
  // 按 Edge ID 保存根 DAG 中每条边的当前激活状态
  edgeStates: z.record(z.string(), runtimeEdgeStatusSchema),
  // 按 executionKey 保存每次节点逻辑执行的输入、配置、输出和错误
  executions: z.record(z.string(), runtimeExecutionSchema),
  // 下一次创建 Execution 时使用的逻辑序号
  nextExecutionSequence: z.number().int().nonnegative(),
})

export type RuntimeState = z.output<typeof runtimeStateSchema>
export type RuntimeNodeState = z.output<typeof runtimeNodeStateSchema>
export type RuntimeExecution = z.output<typeof runtimeExecutionSchema>
export type RuntimeRunStatus = z.output<typeof runtimeRunStatusSchema>
export type RuntimeNodeStatus = z.output<typeof runtimeNodeStatusSchema>
export type RuntimeEdgeStatus = z.output<typeof runtimeEdgeStatusSchema>
