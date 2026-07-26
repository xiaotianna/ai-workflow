import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Plus, Search, Tags, X } from 'lucide-react'

import { documentCategoryOptions, documentSortOptions } from '../constants'

interface DocumentToolbarProps {
  category: string
  search: string
  sortBy: string
  onAddDocument: () => void
  onCategoryChange: (category: string) => void
  onMetadataClick: () => void
  onSearchChange: (search: string) => void
  onSortByChange: (sortBy: string) => void
}

export function DocumentToolbar({
  category,
  search,
  sortBy,
  onAddDocument,
  onCategoryChange,
  onMetadataClick,
  onSearchChange,
  onSortByChange,
}: DocumentToolbarProps) {
  const showCategoryClear = category !== 'all'

  return (
    <>
      <div className="flex min-w-0 items-center gap-1">
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger
            size="sm"
            aria-label="文档分类"
            className="w-28 justify-between rounded-lg px-2.5 text-left"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="start"
            sideOffset={4}
            className="w-(--radix-select-trigger-width)"
          >
            {documentCategoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCategoryClear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="清除分类筛选"
            className="text-muted-foreground shrink-0"
            onClick={() => onCategoryChange('all')}
          >
            <X aria-hidden className="size-4" />
          </Button>
        ) : undefined}
      </div>

      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger
          size="sm"
          aria-label="排序字段"
          className="w-55 justify-between rounded-lg px-2.5 text-left"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-muted-foreground shrink-0">排序:</span>
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-(--radix-select-trigger-width)"
        >
          {documentSortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-0 max-sm:w-full sm:min-w-44">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索"
          aria-label="搜索文档"
          className="bg-input focus-visible:bg-background h-8 rounded-lg border-transparent pr-3 pl-9 text-sm shadow-none"
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="ml-auto h-8 shrink-0 rounded-lg px-3 text-sm"
        onClick={onMetadataClick}
      >
        <Tags className="size-4" />
        元数据
      </Button>

      <Button
        type="button"
        className="h-8 shrink-0 rounded-lg px-3 text-sm"
        onClick={onAddDocument}
      >
        <Plus className="size-4" />
        添加文件
      </Button>
    </>
  )
}
