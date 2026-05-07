// packages/workflow-core/src/types/workflow-variable.ts

import type { WorkflowDataType } from './workflow-data-type'

/**
 * 工作流变量定义
 *
 * 用于：
 * - Start 节点输入变量
 * - Loop 节点循环变量
 * - Agent Memory
 * - 全局上下文变量
 * - Workflow Environment Variables
 *
 * 注意：
 * 这是“变量声明”
 * 不是运行时变量值
 */
export interface WorkflowVariableDefinition {
  /**
   * 变量唯一名称
   *
   * 示例：
   * question
   * userId
   * chatHistory
   */
  name: string

  /**
   * 变量数据类型
   */
  dataType: WorkflowDataType

  /**
   * 变量描述
   */
  description?: string

  /**
   * 是否必填
   */
  required?: boolean

  /**
   * 默认值
   */
  defaultValue?: unknown
}

/**
 * 工作流运行时变量值
 *
 * 示例：
 * {
 *   name: 'question',
 *   value: 'hello'
 * }
 */
export interface WorkflowVariableValue {
  /**
   * 变量名称
   */
  name: string

  /**
   * 当前值
   */
  value: unknown
}

/**
 * Runtime Variables Store
 *
 * 用于 workflow runtime 执行阶段
 *
 * 示例：
 * {
 *   question: 'hello',
 *   count: 1,
 *   messages: []
 * }
 */
export type WorkflowVariables = Record<string, unknown>
