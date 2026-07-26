import { Button } from '@ai-workflow/ui/components/button'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { documentPageSizeOptions } from '../constants'

interface DocumentPaginationProps {
  pageIndex: number
  pageCount: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function DocumentPagination({
  pageIndex,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: DocumentPaginationProps) {
  const safePageCount = Math.max(pageCount, 1)
  const currentPage = pageIndex + 1

  return (
    <div className="border-border flex items-center justify-between border-t px-2 py-3">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="上一页"
          className="text-muted-foreground"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>

        <span className="text-muted-foreground min-w-10 text-center text-sm tabular-nums">
          {currentPage} / {safePageCount}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="下一页"
          className="text-muted-foreground"
          disabled={pageIndex >= safePageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
        {Array.from({ length: safePageCount }, (_, index) => {
          const pageNumber = index + 1
          const isActive = index === pageIndex

          return (
            <Button
              key={pageNumber}
              type="button"
              variant={isActive ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label={`第 ${pageNumber} 页`}
              aria-current={isActive ? 'page' : undefined}
              className={cn('text-sm tabular-nums', isActive && 'min-w-8')}
              onClick={() => onPageChange(index)}
            >
              {pageNumber}
            </Button>
          )
        })}
      </div>

      <div className="flex items-center gap-1">
        {documentPageSizeOptions.map((option) => {
          const isActive = option === pageSize

          return (
            <Button
              key={option}
              type="button"
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              aria-label={`每页 ${option} 条`}
              aria-pressed={isActive}
              className="h-8 min-w-8 rounded-lg px-2.5 text-sm tabular-nums"
              onClick={() => onPageSizeChange(option)}
            >
              {option}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
