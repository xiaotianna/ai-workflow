import type { KnowledgeBaseDto, KnowledgeDocumentDto } from '@/api/knowledge-bases'

import type { DocumentSegmentationMode } from './constants'
import type { KnowledgeBaseDocument, KnowledgeBaseListItem } from './types'

const uploadedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const segmentationModeMap = {
  GENERAL: 'general',
  QA: 'qa',
  PARENT_CHILD: 'parent-child',
} as const satisfies Record<KnowledgeDocumentDto['segmentationMode'], DocumentSegmentationMode>

export function toKnowledgeBaseListItem(knowledgeBase: KnowledgeBaseDto): KnowledgeBaseListItem {
  return {
    id: knowledgeBase.id,
    title: knowledgeBase.title,
    author: knowledgeBase.author,
    createdAt: knowledgeBase.createdAt,
    updatedAt: knowledgeBase.updatedAt,
    description: knowledgeBase.description,
    icon: knowledgeBase.icon,
  }
}

export function toKnowledgeBaseDocument(document: KnowledgeDocumentDto): KnowledgeBaseDocument {
  const status = document.enabled
    ? document.status === 'READY'
      ? document.needsReindex
        ? 'stale'
        : 'available'
      : document.status === 'PROCESSING'
        ? 'indexing'
        : 'error'
    : 'disabled'

  return {
    id: document.id,
    knowledgeBaseId: document.knowledgeBaseId,
    name: document.name,
    fileType:
      document.fileType === 'markdown'
        ? 'markdown'
        : document.fileType === 'pdf'
          ? 'pdf'
          : document.fileType === 'text'
            ? 'text'
            : 'other',
    segmentationMode: segmentationModeMap[document.segmentationMode],
    characterCount: document.characterCount,
    recallCount: document.recallCount,
    chunkCount: document.chunkCount,
    uploadedAt: document.createdAt,
    uploadedAtLabel: uploadedAtFormatter.format(new Date(document.createdAt)),
    status,
    statusLabel:
      status === 'available'
        ? '可用'
        : status === 'stale'
          ? '待更新'
          : status === 'indexing'
            ? '处理中'
            : status === 'error'
              ? '处理失败'
              : '已禁用',
    enabled: document.enabled,
    needsReindex: document.needsReindex,
  }
}

export function formatDocumentCharacterCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}
