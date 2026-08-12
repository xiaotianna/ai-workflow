import { BuiltinNodeType } from '../builtin-node-types'
import type { NodeInputBindings, NodeOutputDefinition } from '../../node/workflow-node-schema'
import type { DataType } from '../../port/data-types'

export interface SubWorkflowTargetContract {
  nodes: readonly {
    type: string
    outputs: readonly NodeOutputDefinition[]
  }[]
  outputs: readonly {
    key: string
    label: string
    dataType: DataType
    description?: string
  }[]
}

function createDefaultInputValue(output: NodeOutputDefinition) {
  if (output.defaultValue !== undefined) {
    return {
      type: 'value' as const,
      value: output.defaultValue,
    }
  }

  if (output.dataType === 'number') {
    return {
      type: 'value' as const,
      value: 0,
    }
  }

  if (output.dataType === 'boolean') {
    return {
      type: 'value' as const,
      value: false,
    }
  }

  if (output.dataType === 'json') {
    return {
      type: 'value' as const,
      value: {},
    }
  }

  return {
    type: 'value' as const,
    value: '',
  }
}

/**
 * 根据目标工作流的 Start 输入变量与 Workflow.outputs 公开字段，生成子工作流节点的
 * inputs / outputs。已有同名输入绑定会保留，避免重选时丢失用户配置。
 */
export function createSubWorkflowNodeVariables(
  target: SubWorkflowTargetContract,
  previousInputs: NodeInputBindings = {},
): {
  inputs: NodeInputBindings
  outputs: NodeOutputDefinition[]
} {
  const startNode = target.nodes.find((node) => node.type === BuiltinNodeType.START),
    startOutputs = startNode?.outputs ?? [],
    inputs = Object.fromEntries(
      startOutputs.map((output) => [
        output.key,
        previousInputs[output.key] ?? createDefaultInputValue(output),
      ]),
    ) satisfies NodeInputBindings,
    outputs = target.outputs.map((output) => ({
      key: output.key,
      label: output.label,
      dataType: output.dataType,
      ...(output.description ? { description: output.description } : {}),
    }))

  return { inputs, outputs }
}
