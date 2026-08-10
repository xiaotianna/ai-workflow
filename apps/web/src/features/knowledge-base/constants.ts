import type { KnowledgeSegmentationMode } from '@/api/knowledge-bases'

export const knowledgeBaseIconBackground = 'rgb(219, 234, 254)'

export const documentPageSizeOptions = [10, 25, 50] as const

export const documentSegmentationModeValues = ['general', 'qa', 'parent-child'] as const

export type DocumentSegmentationMode = (typeof documentSegmentationModeValues)[number]

export const documentSegmentationModeOptions = [
  {
    value: 'general',
    label: '通用',
    description: '按标题、段落和长度切分，适合一般文档。',
  },
  {
    value: 'qa',
    label: 'Q&A',
    description: '按问答对组织检索单元，适合结构化问答内容。',
  },
  {
    value: 'parent-child',
    label: '父子分段',
    description: '使用子块精准召回，并返回父块补充完整上下文。',
  },
] as const satisfies readonly {
  value: DocumentSegmentationMode
  label: string
  description: string
}[]

export function getDocumentSegmentationModeOption(mode: DocumentSegmentationMode) {
  return (
    documentSegmentationModeOptions.find((option) => option.value === mode) ??
    documentSegmentationModeOptions[0]
  )
}

export const knowledgeSegmentationModeLabels = {
  GENERAL: '通用',
  QA: 'Q&A',
  PARENT_CHILD: '父子分段',
} as const satisfies Record<KnowledgeSegmentationMode, string>

export const documentAcceptedFileTypes = '.pdf,.md,.markdown,.txt'

export const documentAcceptedFileExtensions = ['pdf', 'md', 'markdown', 'txt'] as const

export const documentMaxFileSizeBytes = 15 * 1024 * 1024
