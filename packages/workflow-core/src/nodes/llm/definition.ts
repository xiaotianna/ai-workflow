import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

/**
 * 调用createNodeDefinition会自动生成ports
 * 端口示例：
{
  ports: {
    inputs: {
      input: {
        label: '输入',
        dataType: 'json',
        required: true,
      },
    },
    outputs: {
      result: {
        label: '结果',
        dataType: 'json',
        multiple: true,
      },
    },
  },
}
 */
export const llmNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.LLM,
  label: 'LLM',
  description: '调用大语言模型生成回答',
  icon: BuiltinNodeType.LLM,
  inputPort: {
    id: 'input',
    label: '输入',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
  },
  outputPort: {
    id: 'result',
    label: '生成结果',
    dataType: DATA_TYPE_KINDS.STRING,
    multiple: true,
  },
})
