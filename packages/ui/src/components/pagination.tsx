import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../lib/utils'
import { Button } from './button'

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
  className?: string
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

function PageJump({
  pageIndex,
  pageCount,
  onPageChange,
}: {
  pageIndex: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const ignoreBlurRef = React.useRef(false)
  const currentPage = pageIndex + 1
  const inputWidthCh = Math.max(String(currentPage).length + String(pageCount).length + 3, 4)

  React.useEffect(() => {
    if (!editing) {
      return
    }

    const input = inputRef.current
    if (!input) {
      return
    }

    input.focus()
    input.select()
  }, [editing])

  const commit = () => {
    const parsed = Number.parseInt(draft, 10)
    if (!Number.isNaN(parsed)) {
      const nextPageIndex = Math.min(Math.max(parsed, 1), pageCount) - 1
      if (nextPageIndex !== pageIndex) {
        onPageChange(nextPageIndex)
      }
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        aria-label="页码"
        value={draft}
        style={{ width: `${inputWidthCh}ch` }}
        className="bg-background text-foreground hover:border-input-focus focus:border-input-focus focus-visible:border-input-focus h-7 rounded-md border border-transparent px-1.5 text-center text-sm tabular-nums transition-[background-color,border-color] outline-none"
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
        onBlur={() => {
          if (ignoreBlurRef.current) {
            ignoreBlurRef.current = false
            return
          }
          commit()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            inputRef.current?.blur()
            return
          }

          if (event.key === 'Escape') {
            event.preventDefault()
            ignoreBlurRef.current = true
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label="跳转到指定页"
      className="text-muted-foreground hover:text-foreground focus-visible:text-foreground min-w-10 cursor-pointer rounded-full px-1 text-center text-sm tabular-nums transition-colors outline-none"
      onClick={() => {
        setDraft(String(currentPage))
        setEditing(true)
      }}
    >
      {currentPage} / {pageCount}
    </button>
  )
}

function Pagination({
  pageIndex,
  pageCount,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const safePageCount = Math.max(pageCount, 1)
  const showPageSize =
    pageSize !== undefined &&
    pageSizeOptions !== undefined &&
    pageSizeOptions.length > 0 &&
    onPageSizeChange !== undefined

  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
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

        <PageJump pageIndex={pageIndex} pageCount={safePageCount} onPageChange={onPageChange} />

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
  )
}

export { Pagination }
