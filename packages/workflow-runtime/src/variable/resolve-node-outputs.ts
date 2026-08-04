import type { WorkflowNode } from '@ai-workflow/core'

import { normalizeDeclaredValues } from '../input/normalize-declared-values'
import { resolveVariableValue, type VariableResolutionContext } from './resolve-variable-value'

/**
 * 节点执行器返回同名字段作为默认输出；定义了 value 的字段改由直接值或上游变量映射产生。
 */
export function resolveNodeOutputs(
  rawOutputs: Readonly<Record<string, unknown>>,
  node: WorkflowNode,
  context: VariableResolutionContext,
) {
  const mappedOutputs = Object.fromEntries(
    node.outputs.flatMap((output) =>
      output.value ? [[output.key, resolveVariableValue(output.value, context)] as const] : [],
    ),
  )

  return normalizeDeclaredValues(
    {
      ...rawOutputs,
      ...mappedOutputs,
    },
    node.outputs,
    {
      boundary: 'nodeOutput',
      ownerId: node.id,
      unknownValuePolicy: 'omit',
    },
  )
}
