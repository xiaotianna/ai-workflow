import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'
import { RAG_DOCUMENTS_OUTPUT_KEY } from './outputs'

export const ragNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.RAG,
  label: '知识库检索',
  description: '从指定知识库中检索相关内容',
  icon: BuiltinNodeType.RAG,
  inputPort: {
    id: 'query',
    label: '检索内容',
    dataType: DATA_TYPE_KINDS.STRING,
    required: true,
  },
  outputPort: {
    id: RAG_DOCUMENTS_OUTPUT_KEY,
    label: '检索结果',
    dataType: DATA_TYPE_KINDS.JSON,
    multiple: true,
  },
})
