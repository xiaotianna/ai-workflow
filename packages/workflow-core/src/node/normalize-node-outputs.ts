import type { NodeOutputDefinition } from './workflow-node-schema'

/**
 * 将节点类型声明的固定输出合并进节点实例输出。
 * 输出变量与画布端口是两套独立契约，不从端口推导固定输出。
 */
export function normalizeNodeOutputs(
  outputs: readonly NodeOutputDefinition[],
  fixedOutputs: readonly NodeOutputDefinition[] = [],
): NodeOutputDefinition[] {
  if (fixedOutputs.length === 0) {
    return [...outputs]
  }

  const fixedKeys = new Set(fixedOutputs.map((output) => output.key))

  return [
    ...fixedOutputs.map((output) => ({ ...output })),
    ...outputs.filter((output) => !fixedKeys.has(output.key)),
  ]
}
