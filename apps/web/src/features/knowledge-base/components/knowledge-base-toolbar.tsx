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
  knowledgeBaseSortStrategies,
  knowledgeBaseSortValues,
} from '../knowledge-base-sort-strategies'
import type { KnowledgeBaseSort } from '../types'

interface KnowledgeBaseToolbarProps {
  search: string
  sort: KnowledgeBaseSort
  onCreateKnowledgeBase: () => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: KnowledgeBaseSort) => void
}

function KnowledgeBaseSortSelect({
  sort,
  onSortChange,
}: {
  sort: KnowledgeBaseSort
  onSortChange: (sort: KnowledgeBaseSort) => void
}) {
  return (
    <Select value={sort} onValueChange={(value) => onSortChange(value as KnowledgeBaseSort)}>
      <SelectTrigger
        size="sm"
        aria-label="排序方式"
        className="w-55 justify-between rounded-lg px-2.5 text-left"
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
        {knowledgeBaseSortValues.map((value) => (
          <SelectItem key={value} value={value}>
            {knowledgeBaseSortStrategies[value].optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function KnowledgeBaseToolbar({
  search,
  sort,
  onCreateKnowledgeBase,
  onSearchChange,
  onSortChange,
}: KnowledgeBaseToolbarProps) {
  return (
    <>
      <KnowledgeBaseSortSelect sort={sort} onSortChange={onSortChange} />

      <div className="relative min-w-0 max-sm:w-full sm:min-w-44">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="搜索知识库"
          maxLength={40}
          placeholder="搜索"
          className="bg-input focus-visible:bg-background h-8 rounded-lg border-transparent pr-3 pl-9 text-sm shadow-none"
        />
      </div>

      <Button
        type="button"
        className="ml-auto h-8 shrink-0 rounded-lg px-3 text-sm"
        onClick={onCreateKnowledgeBase}
      >
        <Plus className="size-4" />
        创建
      </Button>
    </>
  )
}
