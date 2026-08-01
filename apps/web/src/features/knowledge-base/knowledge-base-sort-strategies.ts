import type { KnowledgeBaseListItem, KnowledgeBaseSort } from './types'

interface KnowledgeBaseSortStrategy {
  optionLabel: string
  timeLabel: string
  timeField: 'createdAt' | 'updatedAt'
}

export const knowledgeBaseSortStrategies = {
  updated_desc: {
    optionLabel: '最近修改',
    timeLabel: '编辑于',
    timeField: 'updatedAt',
  },
  created_desc: {
    optionLabel: '最近创建',
    timeLabel: '创建于',
    timeField: 'createdAt',
  },
  created_asc: {
    optionLabel: '最早创建',
    timeLabel: '创建于',
    timeField: 'createdAt',
  },
} satisfies Record<KnowledgeBaseSort, KnowledgeBaseSortStrategy>

export const knowledgeBaseSortValues = [
  'updated_desc',
  'created_desc',
  'created_asc',
] as const satisfies readonly KnowledgeBaseSort[]

const knowledgeBaseTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function getKnowledgeBaseTimeDisplay(
  knowledgeBase: KnowledgeBaseListItem,
  sort: KnowledgeBaseSort,
) {
  const strategy = knowledgeBaseSortStrategies[sort]
  const timestamp = knowledgeBase[strategy.timeField]
  const date = new Date(timestamp)

  return {
    label: strategy.timeLabel,
    value: Number.isNaN(date.getTime()) ? timestamp : knowledgeBaseTimeFormatter.format(date),
  }
}
