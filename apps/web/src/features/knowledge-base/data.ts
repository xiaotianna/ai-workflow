import type { KnowledgeBaseDto } from '@/api/knowledge-bases'

import type { KnowledgeBaseDocument, KnowledgeBaseListItem } from './types'

const uploadedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

type MockDocumentTemplate = Omit<
  KnowledgeBaseDocument,
  'id' | 'knowledgeBaseId' | 'uploadedAtLabel'
>

const mockDocumentTemplates: MockDocumentTemplate[] = [
  {
    name: '产品使用手册.md',
    fileType: 'markdown',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 12_840,
    recallCount: 36,
    uploadedAt: '2026-07-28T02:14:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
  {
    name: '常见问题解答.md',
    fileType: 'markdown',
    segmentationMode: 'qa',
    segmentationModeLabel: 'Q&A',
    characterCount: 5620,
    recallCount: 128,
    uploadedAt: '2026-07-30T09:42:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
  {
    name: '服务协议.pdf',
    fileType: 'pdf',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 21_400,
    recallCount: 12,
    uploadedAt: '2026-08-01T06:20:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
  {
    name: '客服话术库.txt',
    fileType: 'text',
    segmentationMode: 'parent-child',
    segmentationModeLabel: '父子分段',
    characterCount: 8960,
    recallCount: 54,
    uploadedAt: '2026-08-02T11:05:00.000Z',
    status: 'indexing',
    statusLabel: '索引中',
    enabled: true,
  },
  {
    name: '退换货政策.md',
    fileType: 'markdown',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 3180,
    recallCount: 9,
    uploadedAt: '2026-08-03T03:30:00.000Z',
    status: 'error',
    statusLabel: '错误',
    enabled: true,
  },
  {
    name: '内部培训材料.pdf',
    fileType: 'pdf',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 45_200,
    recallCount: 3,
    uploadedAt: '2026-08-03T08:18:00.000Z',
    status: 'disabled',
    statusLabel: '已禁用',
    enabled: false,
  },
  {
    name: 'API 接入指南.md',
    fileType: 'markdown',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 9740,
    recallCount: 21,
    uploadedAt: '2026-08-04T01:55:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
  {
    name: '版本更新说明.md',
    fileType: 'markdown',
    segmentationMode: 'qa',
    segmentationModeLabel: 'Q&A',
    characterCount: 2460,
    recallCount: 7,
    uploadedAt: '2026-08-04T07:12:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
  {
    name: '运维值班手册.txt',
    fileType: 'text',
    segmentationMode: 'parent-child',
    segmentationModeLabel: '父子分段',
    characterCount: 11_200,
    recallCount: 15,
    uploadedAt: '2026-08-05T04:40:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
  {
    name: '品牌介绍.pdf',
    fileType: 'pdf',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 6800,
    recallCount: 2,
    uploadedAt: '2026-08-05T10:08:00.000Z',
    status: 'indexing',
    statusLabel: '索引中',
    enabled: true,
  },
  {
    name: '售后流程说明.md',
    fileType: 'markdown',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 4310,
    recallCount: 18,
    uploadedAt: '2026-08-05T13:22:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
  {
    name: '安全合规清单.txt',
    fileType: 'text',
    segmentationMode: 'general',
    segmentationModeLabel: '通用',
    characterCount: 1590,
    recallCount: 0,
    uploadedAt: '2026-08-06T00:15:00.000Z',
    status: 'available',
    statusLabel: '可用',
    enabled: true,
  },
]

/** 文档接口接入前的前端预览数据，按当前知识库 ID 生成。 */
export function createMockDocuments(knowledgeBaseId: string): KnowledgeBaseDocument[] {
  return mockDocumentTemplates.map((template, index) => ({
    ...template,
    id: `${knowledgeBaseId}-doc-${index + 1}`,
    knowledgeBaseId,
    uploadedAtLabel: uploadedAtFormatter.format(new Date(template.uploadedAt)),
  }))
}

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

export function formatDocumentCharacterCount(count: number) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }

  return String(count)
}
