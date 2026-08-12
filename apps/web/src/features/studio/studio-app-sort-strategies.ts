import type { StudioAppListItem, StudioAppSort } from './types'

interface StudioAppSortStrategy {
  optionLabel: string
  timeLabel: string
  timeField: 'createdAt' | 'updatedAt'
}

const updatedAtStrategy = {
    optionLabel: '最近修改',
    timeLabel: '编辑于',
    timeField: 'updatedAt',
  } satisfies StudioAppSortStrategy,
  createdAtDescStrategy = {
    optionLabel: '最近创建',
    timeLabel: '创建于',
    timeField: 'createdAt',
  } satisfies StudioAppSortStrategy,
  createdAtAscStrategy = {
    optionLabel: '最早创建',
    timeLabel: '创建于',
    timeField: 'createdAt',
  } satisfies StudioAppSortStrategy

export const studioAppSortStrategies = {
  updated_desc: updatedAtStrategy,
  created_desc: createdAtDescStrategy,
  created_asc: createdAtAscStrategy,
} satisfies Record<StudioAppSort, StudioAppSortStrategy>

export const studioAppSortValues = [
  'updated_desc',
  'created_desc',
  'created_asc',
] as const satisfies readonly StudioAppSort[]

const studioAppTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function getStudioAppTimeDisplay(app: StudioAppListItem, sort: StudioAppSort) {
  const strategy = studioAppSortStrategies[sort],
    timestamp = app[strategy.timeField],
    date = new Date(timestamp)

  return {
    label: strategy.timeLabel,
    value: Number.isNaN(date.getTime()) ? timestamp : studioAppTimeFormatter.format(date),
  }
}
