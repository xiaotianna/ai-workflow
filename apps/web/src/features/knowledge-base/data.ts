import type { KnowledgeBaseDto } from '@/api/knowledge-bases'

import type { KnowledgeBaseListItem } from './types'

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
