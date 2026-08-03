import type { ExecuteNodeResult } from '@ai-workflow/protocol'

import type { RuntimeState } from './runtime-state-schema'
import type { RuntimeTransition, StartRuntimeInput } from './runtime-types'

/**
 * 整个工作流的状态机控制，主要完成：
 * 1、根据当前状态决定下一步该执行哪些节点
 * 2、接收节点执行结果，再继续推进工作流
 * start和applyNodeResult具体的调用在nestjs中触发
 * 具体调度逻辑在【packages/workflow-runtime/src/scheduler/drain-root-scope.ts】
 */
export interface WorkflowRuntime {
  // 启动工作流，并返回初始化后的状态和副作用
  start(input: StartRuntimeInput): RuntimeTransition
  applyNodeResult(state: RuntimeState, result: ExecuteNodeResult): RuntimeTransition
}
