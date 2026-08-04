import { DATA_TYPE_KINDS } from '../../port/data-types'
import type { NodeOutputDefinition } from '../../node/workflow-node-schema'

export const LLM_RESULT_OUTPUT_KEY = 'result'

/** LLM 固定公开的生成结果变量；与同名画布端口没有绑定关系。 */
export const LLM_FIXED_OUTPUTS = [
  {
    key: LLM_RESULT_OUTPUT_KEY,
    label: '生成结果',
    dataType: DATA_TYPE_KINDS.STRING,
    description: '模型生成的完整结果',
  },
] as const satisfies readonly NodeOutputDefinition[]
