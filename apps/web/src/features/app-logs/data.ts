import type { StudioWorkflowRunStatus } from '@/api/studio'

export type AppLogStatusFilter = 'all' | StudioWorkflowRunStatus
export type AppLogDateRange = 'all' | '24h' | '7d' | '30d'

export const APP_LOG_STATUS_OPTIONS: Array<{
  label: string
  value: AppLogStatusFilter
}> = [
  { label: '全部状态', value: 'all' },
  { label: '运行中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCEEDED' },
  { label: '失败', value: 'FAILED' },
  { label: '已超时', value: 'TIMED_OUT' },
  { label: '已取消', value: 'CANCELLED' },
  { label: '排队中', value: 'QUEUED' },
]

export const APP_LOG_DATE_RANGE_OPTIONS: Array<{
  label: string
  value: AppLogDateRange
}> = [
  { label: '全部时间', value: 'all' },
  { label: '过去 24 小时', value: '24h' },
  { label: '过去 7 天', value: '7d' },
  { label: '过去 30 天', value: '30d' },
]

const DATE_RANGE_DURATION_MS: Record<Exclude<AppLogDateRange, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export function getAppLogRangeStart(range: AppLogDateRange): string | undefined {
  if (range === 'all') return undefined
  return new Date(Date.now() - DATE_RANGE_DURATION_MS[range]).toISOString()
}
