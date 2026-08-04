import { jsonValueSchema, type JsonValue } from '@ai-workflow/core'
import { z } from 'zod'

// 定义 Runtime 自身产生的稳定错误码，节点 Executor 的错误码由跨语言协议单独维护
export const RUNTIME_ERROR_CODES = {
  // 启动边界：Start 输入存在未声明字段或缺少必填字段
  INVALID_START_INPUT: 'INVALID_START_INPUT',
  // 启动边界：系统变量键集合不完整或变量值与声明的数据类型不匹配
  INVALID_SYSTEM_VARIABLES: 'INVALID_SYSTEM_VARIABLES',
  // 恢复边界：持久化的 RuntimeState 无法通过当前 State Schema 校验
  INVALID_RUNTIME_STATE: 'INVALID_RUNTIME_STATE',
  // 调用参数、Workflow 快照、RuntimeState 或系统变量中的运行身份不一致
  RUNTIME_IDENTITY_MISMATCH: 'RUNTIME_IDENTITY_MISMATCH',
  // RuntimeState 内部索引、节点状态、Execution 状态或 WorkflowVersion 快照不一致
  RUNTIME_STATE_MISMATCH: 'RUNTIME_STATE_MISMATCH',
  // 当前 Run 已经成功或失败，不能继续应用新的节点结果
  RUN_ALREADY_TERMINAL: 'RUN_ALREADY_TERMINAL',
  // 仍有 WAITING 节点，但没有 RUNNING 节点，也没有任何节点可以继续推进
  RUN_STALLED: 'RUN_STALLED',
  // 直接值、解析结果、节点输出或节点配置不是可序列化的 JsonValue
  VALUE_NOT_JSON: 'VALUE_NOT_JSON',
  // 动态值不符合 Core 中声明的 string、number、boolean 或 json 数据类型
  VALUE_TYPE_MISMATCH: 'VALUE_TYPE_MISMATCH',
  // 变量引用的系统变量、环境变量、节点执行结果或输出字段不存在
  VARIABLE_NOT_FOUND: 'VARIABLE_NOT_FOUND',
  // 变量根值存在，但引用的对象属性或数组下标路径不存在
  VARIABLE_PATH_NOT_FOUND: 'VARIABLE_PATH_NOT_FOUND',
  // 当前阶段不允许把 Secret 环境变量明文写入 RuntimeState 或 MQ
  UNSUPPORTED_SECRET_VARIABLE: 'UNSUPPORTED_SECRET_VARIABLE',
  // 当前节点类型没有注册显式 Runtime Config projector
  UNSUPPORTED_NODE_CONFIG: 'UNSUPPORTED_NODE_CONFIG',
  // Executor 缺少节点声明的必填输出，或已声明输出不符合约束
  INVALID_NODE_RESULT: 'INVALID_NODE_RESULT',
  // 节点 Executor 执行失败，Runtime 将其归一化为工作流失败原因
  NODE_EXECUTION_FAILED: 'NODE_EXECUTION_FAILED',
  // 非 RuntimeError 的未知异常被收口为稳定的 Runtime 内部错误
  INTERNAL_RUNTIME_ERROR: 'INTERNAL_RUNTIME_ERROR',
} as const

export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[keyof typeof RUNTIME_ERROR_CODES]

// 定义可以写入数据库、日志或 API 响应的标准 Runtime 错误数据
export const runtimeErrorDataSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string(), jsonValueSchema).optional(),
})

export type RuntimeErrorData = z.output<typeof runtimeErrorDataSchema>

// 定义 Runtime 内部可以抛出并由 NestJS 边界识别的标准异常
export class RuntimeError extends Error {
  // 方便日志和异常过滤器识别错误来源
  override readonly name = 'RuntimeError'

  constructor(
    readonly code: RuntimeErrorCode,
    message: string = code,
    // 必须确保可以json序列化
    readonly details?: Record<string, JsonValue>,
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }

  toData(): RuntimeErrorData {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

export function toRuntimeError(error: unknown): RuntimeError {
  if (error instanceof RuntimeError) {
    return error
  }

  return new RuntimeError(
    RUNTIME_ERROR_CODES.INTERNAL_RUNTIME_ERROR,
    error instanceof Error ? error.message : '未知 Runtime 错误',
  )
}
