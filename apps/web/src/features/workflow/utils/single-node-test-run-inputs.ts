import { DATA_TYPE_KINDS, type NodeOutputDefinition, type WorkflowNode } from '@ai-workflow/core'

/** 从节点输入绑定派生单节点运行表单字段；有输入时一律视为必填。 */
export function createSingleNodeTestRunInputDefinitions(
  node: WorkflowNode,
): NodeOutputDefinition[] {
  return Object.entries(node.inputs).map(([key, binding]) => {
    if (binding.type === 'value') {
      const value = binding.value
      if (typeof value === 'number') {
        return {
          key,
          label: key,
          dataType: DATA_TYPE_KINDS.NUMBER,
          required: true,
          defaultValue: value,
        }
      }
      if (typeof value === 'boolean') {
        return {
          key,
          label: key,
          dataType: DATA_TYPE_KINDS.BOOLEAN,
          required: true,
          defaultValue: value,
        }
      }
      if (value !== null && typeof value === 'object') {
        return {
          key,
          label: key,
          dataType: DATA_TYPE_KINDS.JSON,
          required: true,
          defaultValue: value,
        }
      }
      return {
        key,
        label: key,
        dataType: DATA_TYPE_KINDS.STRING,
        required: true,
        ...(typeof value === 'string' ? { defaultValue: value } : {}),
      }
    }

    return {
      key,
      label: key,
      dataType: DATA_TYPE_KINDS.STRING,
      required: true,
    }
  })
}
