import type { NodeOutputDefinition } from '../../node/workflow-node-schema'
import { DATA_TYPE_KINDS } from '../../port/data-types'

export const RAG_DOCUMENTS_OUTPUT_KEY = 'documents'

export const RAG_FIXED_OUTPUTS = [
  {
    key: RAG_DOCUMENTS_OUTPUT_KEY,
    label: '检索文档',
    dataType: DATA_TYPE_KINDS.JSON,
    description: '知识库检索返回的文档列表',
  },
] as const satisfies readonly NodeOutputDefinition[]
