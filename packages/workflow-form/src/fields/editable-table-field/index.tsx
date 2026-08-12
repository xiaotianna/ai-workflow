import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Plus } from 'lucide-react'
import { useState, type CSSProperties, type FocusEvent, type ReactNode } from 'react'

export interface EditableTableCellContext<TRow> {
  column: EditableTableColumn<TRow>
  disabled: boolean
  row: TRow
  rowIndex: number
}

export interface EditableTableColumn<TRow> {
  id: string
  header: ReactNode
  width?: CSSProperties['width']
  headerClassName?: string
  cellClassName?: string | ((context: EditableTableCellContext<TRow>) => string | undefined)
  renderCell: (context: EditableTableCellContext<TRow>) => ReactNode
}

export interface EditableTableFieldProps<TRow> {
  ariaLabel: string
  columns: readonly EditableTableColumn<TRow>[]
  rows: readonly TRow[]
  getRowKey: (row: TRow, rowIndex: number) => string
  addRowLabel?: string
  className?: string
  disabled?: boolean
  emptyContent?: ReactNode
  tableClassName?: string
  onAddRow?: () => void
}

function resolveCellClassName<TRow>(
  column: EditableTableColumn<TRow>,
  context: EditableTableCellContext<TRow>,
) {
  return typeof column.cellClassName === 'function'
    ? column.cellClassName(context)
    : column.cellClassName
}

export function EditableTableField<TRow>({
  ariaLabel,
  columns,
  rows,
  getRowKey,
  addRowLabel = '添加一行',
  className,
  disabled = false,
  emptyContent,
  tableClassName,
  onAddRow,
}: EditableTableFieldProps<TRow>) {
  const [isAddRowHovered, setIsAddRowHovered] = useState(false),
    [isAddRowFocusVisible, setIsAddRowFocusVisible] = useState(false),
    isAddRowActive = isAddRowHovered || isAddRowFocusVisible

  function handleAddRowFocus(event: FocusEvent<HTMLButtonElement>) {
    setIsAddRowFocusVisible(event.currentTarget.matches(':focus-visible'))
  }

  return (
    <div data-slot="editable-table-field" className={cn('relative pb-2', className)}>
      <div
        className={cn(
          'border-border bg-input overflow-hidden rounded-lg border-[0.5px] transition-colors',
          isAddRowActive && !disabled && 'border-b-primary',
        )}
      >
        <Table aria-label={ariaLabel} className={cn('table-fixed', tableClassName)}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>

          <TableHeader>
            <TableRow className="bg-background/40 hover:bg-background/40">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    'border-border/70 h-8 border-r-[0.5px] px-2.5 last:border-r-0',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={getRowKey(row, rowIndex)} className="group/row">
                {columns.map((column) => {
                  const context = {
                    column,
                    disabled,
                    row,
                    rowIndex,
                  } satisfies EditableTableCellContext<TRow>

                  return (
                    <TableCell
                      key={column.id}
                      className={cn(
                        'border-border/70 h-9 border-r-[0.5px] p-0 last:border-r-0',
                        resolveCellClassName(column, context),
                      )}
                    >
                      {column.renderCell(context)}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}

            {rows.length === 0 && emptyContent ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-14 px-3 text-center text-xs"
                >
                  {emptyContent}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {onAddRow ? (
        <button
          type="button"
          disabled={disabled}
          aria-label={addRowLabel}
          className="group/add-row absolute inset-x-0 bottom-0 flex h-4 cursor-pointer items-center justify-center outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onMouseEnter={() => setIsAddRowHovered(true)}
          onMouseLeave={() => setIsAddRowHovered(false)}
          onFocus={handleAddRowFocus}
          onBlur={() => setIsAddRowFocusVisible(false)}
          onClick={onAddRow}
        >
          <span className="bg-primary text-primary-foreground relative flex size-5 items-center justify-center rounded-full opacity-0 shadow-sm transition-[background-color,opacity,transform] group-hover/add-row:opacity-100 group-focus-visible/add-row:opacity-100 group-active/add-row:scale-95">
            <Plus className="size-3" strokeWidth={3} aria-hidden />
          </span>
        </button>
      ) : null}
    </div>
  )
}
