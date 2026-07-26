import { Pagination } from '@ai-workflow/ui/components/pagination'

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
  return (
    <Pagination
      pageIndex={pageIndex}
      pageCount={pageCount}
      pageSize={pageSize}
      pageSizeOptions={documentPageSizeOptions}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  )
}
