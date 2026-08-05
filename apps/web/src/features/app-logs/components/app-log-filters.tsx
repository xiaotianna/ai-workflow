import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { CalendarDays, ListFilter, Search } from 'lucide-react'

import {
  APP_LOG_DATE_RANGE_OPTIONS,
  APP_LOG_STATUS_OPTIONS,
  type AppLogDateRange,
  type AppLogStatusFilter,
} from '../data'

interface AppLogFiltersProps {
  dateRange: AppLogDateRange
  search: string
  status: AppLogStatusFilter
  onDateRangeChange: (range: AppLogDateRange) => void
  onSearchChange: (search: string) => void
  onStatusChange: (status: AppLogStatusFilter) => void
}

export function AppLogFilters({
  dateRange,
  search,
  status,
  onDateRangeChange,
  onSearchChange,
  onStatusChange,
}: AppLogFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="日志筛选条件">
      <Select value={status} onValueChange={(value) => onStatusChange(value as AppLogStatusFilter)}>
        <SelectTrigger
          size="sm"
          className="w-36 rounded-lg px-2.5 text-sm"
          aria-label="按运行状态筛选"
        >
          <ListFilter aria-hidden className="text-muted-foreground size-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4}>
          {APP_LOG_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={dateRange}
        onValueChange={(value) => onDateRangeChange(value as AppLogDateRange)}
      >
        <SelectTrigger
          size="sm"
          className="w-40 rounded-lg px-2.5 text-sm"
          aria-label="按开始时间筛选"
        >
          <CalendarDays aria-hidden className="text-muted-foreground size-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4}>
          {APP_LOG_DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-0 max-sm:w-full sm:min-w-44">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="搜索日志用户或追踪 ID"
          placeholder="搜索用户或追踪 ID"
          maxLength={100}
          className="bg-input h-8 rounded-lg border-transparent pr-3 pl-9 text-sm shadow-none"
        />
      </div>
    </div>
  )
}
