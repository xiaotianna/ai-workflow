import type { JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { matchesDataType } from '../utils/matches-data-type'
import { resolveVariableValue, type VariableResolutionContext } from './resolve-variable-value'

export function resolveWorkflowOutputs(
  context: VariableResolutionContext,
): Record<string, JsonValue> {
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
