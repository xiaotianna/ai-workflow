import { NodeDefinition } from '../../node/node-definition'
import { BuiltinNodeType } from '../builtin-node-types'

export const ragNodeDefinition = {
  type: BuiltinNodeType.RAG,
  label: '知识库检索',
  description: '',
  icon: BuiltinNodeType.RAG,
  theme: '#B9E6C7',
} satisfies NodeDefinition
