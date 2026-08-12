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
  }),
  segmentationModeMap = {
    GENERAL: 'general',
    QA: 'qa',
    PARENT_CHILD: 'parent-child',
  } as const satisfies Record<KnowledgeDocumentDto['segmentationMode'], DocumentSegmentationMode>

type SupportedKnowledgeDocumentFileType = Exclude<KnowledgeBaseDocument['fileType'], 'other'>

const supportedKnowledgeDocumentFileTypes = new Set<SupportedKnowledgeDocumentFileType>([
  'markdown',
  'pdf',
  'text',
  'docx',
  'pptx',
  'xlsx',
  'csv',
  'html',
])

export function toKnowledgeBaseListItem(knowledgeBase: KnowledgeBaseDto): KnowledgeBaseListItem {
  return {
    id: knowledgeBase.id,
    title: knowledgeBase.title,
    author: knowledgeBase.author,
    segmentationMode: knowledgeBase.segmentationMode,
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
    fileType: resolveKnowledgeDocumentFileType(document.fileType),
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
            ? '索引构建中'
            : status === 'error'
              ? '索引构建失败'
              : '已禁用',
    enabled: document.enabled,
    needsReindex: document.needsReindex,
  }
}

function resolveKnowledgeDocumentFileType(
  fileType: string,
): SupportedKnowledgeDocumentFileType | 'other' {
  return supportedKnowledgeDocumentFileTypes.has(fileType as SupportedKnowledgeDocumentFileType)
    ? (fileType as SupportedKnowledgeDocumentFileType)
    : 'other'
}

export function formatDocumentCharacterCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}
