import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Plus, Search } from 'lucide-react'

import {
  documentFileTypeFilterStrategies,
  documentFileTypeFilterValues,
  documentSortStrategies,
  documentSortValues,
} from '../document-query-strategies'
import type { KnowledgeDocumentFileTypeFilter, KnowledgeDocumentSort } from '../types'

interface DocumentToolbarProps {
  search: string
  fileType: KnowledgeDocumentFileTypeFilter
  sort: KnowledgeDocumentSort
  disabled?: boolean
  onAddDocument: () => void
  onFileTypeChange: (fileType: KnowledgeDocumentFileTypeFilter) => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: KnowledgeDocumentSort) => void
}

export function DocumentToolbar({
  search,
  fileType,
  sort,
  disabled,
  onAddDocument,
  onFileTypeChange,
  onSearchChange,
  onSortChange,
}: DocumentToolbarProps) {
  return (
    <>
      <Select
        value={fileType}
        disabled={disabled}
        onValueChange={(value) => onFileTypeChange(value as KnowledgeDocumentFileTypeFilter)}
      >
        <SelectTrigger
          size="sm"
          aria-label="文件类型"
          className="w-42 justify-between rounded-lg px-2.5 text-left"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground shrink-0">文件类型</span>
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-(--radix-select-trigger-width)"
        >
          {documentFileTypeFilterValues.map((value) => (
            <SelectItem key={value} value={value}>
              {documentFileTypeFilterStrategies[value].optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sort}
        disabled={disabled}
        onValueChange={(value) => onSortChange(value as KnowledgeDocumentSort)}
      >
        <SelectTrigger
          size="sm"
          aria-label="排序方式"
          className="w-42 justify-between rounded-lg px-2.5 text-left"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground shrink-0">排序方式</span>
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-(--radix-select-trigger-width)"
        >
          {documentSortValues.map((value) => (
            <SelectItem key={value} value={value}>
              {documentSortStrategies[value].optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-0 max-sm:w-full sm:min-w-44">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索文档"
          aria-label="搜索文档"
          className="bg-input focus-visible:bg-background h-8 rounded-lg border-transparent pr-3 pl-9 text-sm shadow-none"
        />
      </div>

      <Button
        type="button"
        className="ml-auto h-8 shrink-0 rounded-lg px-3 text-sm"
        disabled={disabled}
        onClick={onAddDocument}
      >
        <Plus className="size-4" />
        添加文件
      </Button>
    </>
  )
}
