import { Badge } from '@ai-workflow/ui/components/badge'
import { Checkbox } from '@ai-workflow/ui/components/checkbox'
import { Switch } from '@ai-workflow/ui/components/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { cn } from '@ai-workflow/ui/lib/utils'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, FileText, Puzzle } from 'lucide-react'
import { useMemo } from 'react'

import { documentFileTypeIconBackground } from '../constants'
import { formatDocumentCharacterCount } from '../data'
import type { DocumentActionHandler, KnowledgeBaseDocument } from '../types'
import { DocumentActionMenu } from './document-action-menu'
import { getDocumentActions } from './document-actions'
import { DocumentPagination } from './document-pagination'

interface DocumentTableProps {
  documents: KnowledgeBaseDocument[]
  pageIndex: number
  pageSize: number
  rowSelection: RowSelectionState
  sorting: SortingState
  onDocumentAction?: DocumentActionHandler
  onDocumentEnabledChange: (documentId: string, enabled: boolean) => void
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onSortingChange: OnChangeFn<SortingState>
}

function DocumentStatusBadge({
  status,
  statusLabel,
}: Pick<KnowledgeBaseDocument, 'status' | 'statusLabel'>) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          status === 'available' && 'bg-success',
          status === 'indexing' && 'bg-info',
          status === 'error' && 'bg-destructive',
          status === 'disabled' && 'bg-muted-foreground',
        )}
      />
      {statusLabel}
    </span>
  )
}

function SortableHeader({ label, sorted }: { label: string; sorted: false | 'asc' | 'desc' }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      {sorted ? (
        <ArrowDown
          aria-hidden
          className={cn('text-muted-foreground size-3.5', sorted === 'asc' && 'rotate-180')}
        />
      ) : undefined}
    </span>
  )
}

export function DocumentTable({
  documents,
  pageIndex,
  pageSize,
  rowSelection,
  sorting,
  onDocumentAction,
  onDocumentEnabledChange,
  onPageChange,
  onPageSizeChange,
  onRowSelectionChange,
  onSortingChange,
}: DocumentTableProps) {
  const columns = useMemo<ColumnDef<KnowledgeBaseDocument>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label="全选当前页文档"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`选择 ${row.original.name}`}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: 'index',
        header: '#',
        cell: ({ row, table }) => {
          const pagination = table.getState().pagination
          return pagination.pageIndex * pagination.pageSize + row.index + 1
        },
        enableSorting: false,
        size: 48,
      },
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: documentFileTypeIconBackground }}
            >
              <FileText className="text-primary size-4" />
            </span>
            <span className="truncate font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'segmentationModeLabel',
        header: '分段模式',
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1 rounded-md">
            <Puzzle aria-hidden className="size-3" />
            {row.original.segmentationModeLabel}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'characterCount',
        header: '字符数',
        cell: ({ row }) => formatDocumentCharacterCount(row.original.characterCount),
      },
      {
        accessorKey: 'recallCount',
        header: ({ column }) => (
          <SortableHeader label="召回次数" sorted={column.getIsSorted() || false} />
        ),
        cell: ({ row }) => row.original.recallCount,
      },
      {
        accessorKey: 'uploadedAt',
        header: ({ column }) => (
          <SortableHeader label="上传时间" sorted={column.getIsSorted() || false} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.uploadedAtLabel}</span>
        ),
      },
      {
        accessorKey: 'statusLabel',
        header: '状态',
        cell: ({ row }) => (
          <DocumentStatusBadge
            status={row.original.status}
            statusLabel={row.original.statusLabel}
          />
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Switch
              aria-label={`${row.original.enabled ? '禁用' : '启用'} ${row.original.name}`}
              checked={row.original.enabled}
              onCheckedChange={(checked) =>
                onDocumentEnabledChange(row.original.id, Boolean(checked))
              }
            />
            <DocumentActionMenu
              title={row.original.name}
              actions={getDocumentActions(row.original, onDocumentAction)}
            />
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onDocumentAction, onDocumentEnabledChange],
  )

  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize],
  )

  const table = useReactTable({
    data: documents,
    columns,
    state: {
      pagination,
      rowSelection,
      sorting,
    },
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: (updater) => {
      const nextPagination = typeof updater === 'function' ? updater(pagination) : updater
      if (nextPagination.pageIndex !== pageIndex) {
        onPageChange(nextPagination.pageIndex)
      }
      if (nextPagination.pageSize !== pageSize) {
        onPageSizeChange(nextPagination.pageSize)
      }
    },
    onRowSelectionChange,
    onSortingChange,
  })

  return (
    <div className="border-border bg-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === 'actions' && 'text-right',
                      header.column.getCanSort() && 'cursor-pointer select-none',
                    )}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(cell.column.id === 'actions' && 'text-right')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-32 text-center"
                >
                  暂无文档
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DocumentPagination
        pageIndex={table.getState().pagination.pageIndex}
        pageCount={table.getPageCount()}
        pageSize={table.getState().pagination.pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}
