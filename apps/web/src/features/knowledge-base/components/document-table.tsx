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
import { FileText, Puzzle } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { documentFileTypeIconBackground, getDocumentSegmentationModeOption } from '../constants'
import { formatDocumentCharacterCount } from '../data'
import type { DocumentActionHandler, KnowledgeBaseDocument } from '../types'
import { DocumentActionMenu } from './document-action-menu'
import { getDocumentActions } from './document-actions'
import { DocumentPagination } from './document-pagination'

const documentTableMinWidth = 72 + 240 + 112 + 88 + 96 + 168 + 88 + 72 + 48

const documentTableRowCellClassName =
  'group-hover/row:bg-input group-data-[state=selected]/row:bg-input group-has-[[data-state=open]]/row:bg-input'

const stickyMenuColumnClassName = 'bg-background sticky right-0'

const stickyEnabledColumnClassName = 'bg-background sticky right-[48px]'

const stickyMenuBodySeparatorClassName =
  'before:bg-border relative flex justify-center before:absolute before:top-1/2 before:left-0 before:h-3.5 before:w-px before:-translate-y-1/2'

function getDocumentColumnStyle(
  columnId: string,
  size: number,
  minSize?: number,
  maxSize?: number,
) {
  const resolvedMinSize = minSize ?? size

  if (columnId === 'name') {
    return {
      width: '22%',
      minWidth: resolvedMinSize,
      ...(maxSize !== undefined ? { maxWidth: maxSize } : {}),
    }
  }

  return {
    width: size,
    minWidth: resolvedMinSize,
  }
}

interface DocumentTableProps {
  documents: KnowledgeBaseDocument[]
  total: number
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
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        status === 'available' && 'text-success',
        status === 'stale' && 'text-warning',
        status === 'indexing' && 'text-info',
        status === 'error' && 'text-destructive',
        status === 'disabled' && 'text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          status === 'available' && 'bg-success',
          status === 'stale' && 'bg-warning',
          status === 'indexing' && 'bg-info',
          status === 'error' && 'bg-destructive',
          status === 'disabled' && 'bg-muted-foreground',
        )}
      />
      {statusLabel}
    </span>
  )
}

export function DocumentTable({
  documents,
  total,
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
        id: 'selectIndex',
        header: ({ table }) => (
          <div className="flex items-center gap-3 whitespace-nowrap">
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
            <span className="text-muted-foreground">#</span>
          </div>
        ),
        cell: ({ row, table }) => {
          const pagination = table.getState().pagination
          const index = pagination.pageIndex * pagination.pageSize + row.index + 1

          return (
            <div className="flex items-center gap-3">
              <Checkbox
                aria-label={`选择 ${row.original.name}`}
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
              />
              <span>{index}</span>
            </div>
          )
        },
        enableSorting: false,
        size: 72,
        minSize: 72,
        maxSize: 72,
      },
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: documentFileTypeIconBackground }}
            >
              <FileText className="text-primary size-3.5" />
            </span>
            <Link
              to={`/knowledge-base/${encodeURIComponent(row.original.knowledgeBaseId)}/documents/${encodeURIComponent(row.original.id)}`}
              className="hover:text-primary focus-visible:text-primary truncate rounded-sm transition-colors outline-none"
            >
              {row.original.name}
            </Link>
          </div>
        ),
        size: 240,
        minSize: 160,
        maxSize: 320,
      },
      {
        accessorKey: 'segmentationMode',
        header: '分段模式',
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground h-6 gap-1 rounded-full border-0 px-2 font-normal"
          >
            <Puzzle aria-hidden className="size-3" />
            {getDocumentSegmentationModeOption(row.original.segmentationMode).label}
          </Badge>
        ),
        enableSorting: false,
        size: 112,
        minSize: 112,
        maxSize: 112,
      },
      {
        accessorKey: 'characterCount',
        header: '字符数',
        cell: ({ row }) => formatDocumentCharacterCount(row.original.characterCount),
        enableSorting: false,
        size: 88,
        minSize: 88,
        maxSize: 88,
      },
      {
        accessorKey: 'chunkCount',
        header: '分段数',
        cell: ({ row }) => row.original.chunkCount,
        enableSorting: false,
        size: 96,
        minSize: 96,
        maxSize: 96,
      },
      {
        accessorKey: 'uploadedAt',
        header: '上传时间',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.uploadedAtLabel}</span>
        ),
        enableSorting: false,
        size: 168,
        minSize: 168,
        maxSize: 168,
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
        size: 88,
        minSize: 88,
        maxSize: 88,
      },
      {
        id: 'enabled',
        header: '操作',
        cell: ({ row }) => (
          <Switch
            aria-label={`${row.original.enabled ? '禁用' : '启用'} ${row.original.name}`}
            checked={row.original.enabled}
            onCheckedChange={(checked) =>
              onDocumentEnabledChange(row.original.id, Boolean(checked))
            }
          />
        ),
        enableSorting: false,
        size: 72,
        minSize: 72,
        maxSize: 72,
      },
      {
        id: 'menu',
        header: () => null,
        cell: ({ row }) => (
          <DocumentActionMenu
            title={row.original.name}
            actions={getDocumentActions(row.original, onDocumentAction)}
          />
        ),
        enableSorting: false,
        size: 48,
        minSize: 48,
        maxSize: 48,
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
    defaultColumn: {
      size: 150,
      minSize: 44,
      maxSize: 9999,
    },
    enableRowSelection: true,
    enableSorting: false,
    manualPagination: true,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-auto">
        <Table
          containerClassName="overflow-visible"
          className="w-full table-fixed border-separate border-spacing-0"
          style={{ minWidth: documentTableMinWidth }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      (header.column.id === 'enabled' || header.column.id === 'menu') &&
                        'text-center',
                      header.column.id === 'enabled' && 'z-20',
                      header.column.id === 'enabled' && stickyEnabledColumnClassName,
                      header.column.id === 'menu' && 'z-20 px-1',
                      header.column.id === 'menu' && stickyMenuColumnClassName,
                    )}
                    style={getDocumentColumnStyle(
                      header.column.id,
                      header.column.getSize(),
                      header.column.columnDef.minSize,
                      header.column.columnDef.maxSize,
                    )}
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="group/row cursor-pointer hover:bg-transparent data-[state=selected]:bg-transparent"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        documentTableRowCellClassName,
                        (cell.column.id === 'enabled' || cell.column.id === 'menu') &&
                          'text-center',
                        cell.column.id === 'enabled' && 'z-10',
                        cell.column.id === 'enabled' && stickyEnabledColumnClassName,
                        cell.column.id === 'menu' && 'z-10 px-1',
                        cell.column.id === 'menu' && stickyMenuColumnClassName,
                      )}
                      style={getDocumentColumnStyle(
                        cell.column.id,
                        cell.column.getSize(),
                        cell.column.columnDef.minSize,
                        cell.column.columnDef.maxSize,
                      )}
                    >
                      {cell.column.id === 'menu' ? (
                        <div className={stickyMenuBodySeparatorClassName}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
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
