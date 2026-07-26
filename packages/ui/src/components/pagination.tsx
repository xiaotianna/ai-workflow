import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../lib/utils'
import { Button } from './button'

type PaginationItem = number | 'ellipsis'

export interface PaginationProps {
  /** Zero-based current page index */
  pageIndex: number
  /** Total number of pages */
  pageCount: number
  /** Called when page changes, receives zero-based index */
  onPageChange: (pageIndex: number) => void
  /** Current page size; pair with `pageSizeOptions` to show the selector */
  pageSize?: number
  /** Available page size options */
  pageSizeOptions?: readonly number[]
  /** Called when page size changes */
  onPageSizeChange?: (pageSize: number) => void
  /** Number of sibling pages shown around the current page */
  siblingCount?: number
  className?: string
}

function getPaginationItems(
  pageIndex: number,
  pageCount: number,
  siblingCount: number,
): PaginationItem[] {
  const total = Math.max(pageCount, 1)
  const current = pageIndex + 1

  if (total <= 1) {
    return [1]
  }

  const totalPageNumbers = siblingCount * 2 + 5

  if (total <= totalPageNumbers) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const leftSibling = Math.max(current - siblingCount, 1)
  const rightSibling = Math.min(current + siblingCount, total)
  const showLeftEllipsis = leftSibling > 2
  const showRightEllipsis = rightSibling < total - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from({ length: 3 + siblingCount * 2 }, (_, index) => index + 1)
    return [...leftRange, 'ellipsis', total]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, index) => total - (3 + siblingCount * 2) + index + 1,
    )
    return [1, 'ellipsis', ...rightRange]
  }

  if (showLeftEllipsis && showRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSibling - leftSibling + 1 },
      (_, index) => leftSibling + index,
    )
    return [1, 'ellipsis', ...middleRange, 'ellipsis', total]
  }

  return Array.from({ length: total }, (_, index) => index + 1)
}

function PaginationPill({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-muted flex items-center gap-0.5 rounded-full p-0.5', className)}>
      {children}
    </div>
  )
}

function Pagination({
  pageIndex,
  pageCount,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const safePageCount = Math.max(pageCount, 1)
  const currentPage = pageIndex + 1
  const pageItems = getPaginationItems(pageIndex, safePageCount, siblingCount)
  const showPageSize =
    pageSize !== undefined &&
    pageSizeOptions !== undefined &&
    pageSizeOptions.length > 0 &&
    onPageSizeChange !== undefined

  return (
    <div className={cn('grid grid-cols-3 items-center py-2', className)}>
      <div className="flex justify-start">
        <PaginationPill>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="上一页"
            className="text-muted-foreground size-7 rounded-full"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>

          <span className="text-muted-foreground min-w-10 px-1 text-center text-sm tabular-nums">
            {currentPage} / {safePageCount}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="下一页"
            className="text-muted-foreground size-7 rounded-full"
            disabled={pageIndex >= safePageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </PaginationPill>
      </div>

      <div className="flex justify-center">
        <PaginationPill>
          {pageItems.map((item, index) => {
            if (item === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  aria-hidden
                  className="text-muted-foreground flex size-7 items-center justify-center text-sm"
                >
                  …
                </span>
              )
            }

            const isActive = item - 1 === pageIndex

            return (
              <Button
                key={item}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`第 ${item} 页`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'size-7 rounded-lg text-sm tabular-nums',
                  isActive &&
                    'bg-background border-border text-foreground hover:bg-background focus-visible:bg-background border-[0.5px] shadow-xs',
                  !isActive && 'text-muted-foreground',
                )}
                onClick={() => onPageChange(item - 1)}
              >
                {item}
              </Button>
            )
          })}
        </PaginationPill>
      </div>

      <div className="flex justify-end">
        {showPageSize ? (
          <PaginationPill>
            {pageSizeOptions.map((option) => {
              const isActive = option === pageSize

              return (
                <button
                  key={option}
                  type="button"
                  aria-label={`每页 ${option} 条`}
                  aria-pressed={isActive}
                  className={cn(
                    'cursor-pointer rounded-full px-2.5 py-1 text-sm tabular-nums transition-[background-color,box-shadow,color] outline-none',
                    isActive
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground focus-visible:text-foreground',
                  )}
                  onClick={() => onPageSizeChange(option)}
                >
                  {option}
                </button>
              )
            })}
          </PaginationPill>
        ) : null}
      </div>
    </div>
  )
}

export { Pagination, getPaginationItems }
