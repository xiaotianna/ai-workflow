import { BuiltinNodeType, type JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { matchesDataType } from '../utils/matches-data-type'
import { resolveVariableValue, type VariableResolutionContext } from './resolve-variable-value'

export function resolveWorkflowOutputs(
  context: VariableResolutionContext,
): Record<string, JsonValue> {
  // 当前 Web 的 End 配置区把工作流返回变量写在 End.inputs。旧快照或未来显式声明了
  // Workflow.outputs 时继续以显式契约为准；否则合并本次实际执行成功的根 End 输出。
  if (context.workflow.outputs.length === 0) {
    const outputs: Record<string, JsonValue> = {}
    for (const node of context.workflow.nodes) {
      if (node.type !== BuiltinNodeType.END || node.parentId) continue
      const executionKey = context.state.nodeStates[node.id]?.latestExecutionKey,
        execution = executionKey ? context.state.executions[executionKey] : undefined
      if (execution?.status !== 'SUCCEEDED' || !execution.outputs) continue
      Object.assign(outputs, execution.outputs)
    }
    return outputs
  }

  const outputs: Record<string, JsonValue> = {}

  for (const output of context.workflow.outputs) {
    const value = resolveVariableValue(output.value, context)
    if (!matchesDataType(value, output.dataType)) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.VALUE_TYPE_MISMATCH,
        `工作流输出 ${output.key} 与声明类型不匹配`,
        { key: output.key, expectedDataType: output.dataType },
      )
    }

    outputs[output.key] = value
  }

  return outputs
}
