import type { KnowledgeDocumentFileTypeFilter, KnowledgeDocumentSort } from './types'

export const documentFileTypeFilterStrategies = {
  all: { optionLabel: '全部' },
  pdf: { optionLabel: 'PDF' },
  markdown: { optionLabel: 'Markdown' },
  text: { optionLabel: 'TXT' },
} satisfies Record<KnowledgeDocumentFileTypeFilter, { optionLabel: string }>

export const documentFileTypeFilterValues = [
  'all',
  'pdf',
  'markdown',
  'text',
] as const satisfies readonly KnowledgeDocumentFileTypeFilter[]

export const documentSortStrategies = {
  uploaded_desc: { optionLabel: '上传时间' },
  recall_desc: { optionLabel: '召回次数' },
  character_desc: { optionLabel: '字符数' },
  name_asc: { optionLabel: '名称' },
} satisfies Record<KnowledgeDocumentSort, { optionLabel: string }>

export const documentSortValues = [
  'uploaded_desc',
  'recall_desc',
  'character_desc',
  'name_asc',
] as const satisfies readonly KnowledgeDocumentSort[]
