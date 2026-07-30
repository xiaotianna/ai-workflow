import type { KnowledgeBaseDocument, KnowledgeBaseListItem } from './types'

const uploadedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export const initialKnowledgeBases: KnowledgeBaseListItem[] = [
  {
    id: 'readme-md',
    title: 'README.md',
    kindLabel: '通用',
    author: '1 文档',
    editedAtLabel: '7 分钟前',
    description: 'useful for when you want to answer queries about the README.md',
    icon: '📄',
  },
  {
    id: 'demo',
    title: 'demo',
    kindLabel: '通用',
    author: '1 文档',
    editedAtLabel: '3 个月前',
    description: 'demo',
    icon: '📚',
  },
  {
    id: 'lantianyu-resume',
    title: '兰天雨-前端开发.pdf',
    kindLabel: '经济 · 倒排索引',
    author: '0/1 文档',
    editedAtLabel: '3 个月前',
    description: 'useful for when you want to answer queries about 兰天雨的简历',
    icon: '📄',
  },
]

export const initialDocuments: KnowledgeBaseDocument[] = [
  {
    id: 'readme-md-doc',
    knowledgeBaseId: 'readme-md',
    name: 'README.md',
    fileType: 'markdown',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 7200,
    recallCount: 0,
    uploadedAt: '2026-07-26T08:34:00.000Z',
    uploadedAtLabel: uploadedAtFormatter.format(new Date('2026-07-26T08:34:00.000Z')),
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
]

export function formatDocumentCharacterCount(count: number) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }

  return String(count)
}
