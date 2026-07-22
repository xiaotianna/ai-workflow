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
import { useState } from 'react'

interface StudioToolbarProps {
  search: string
  onCreateBlankApp: () => void
  onSearchChange: (search: string) => void
}

function StudioSortSelect() {
  const [sortBy, setSortBy] = useState('recently-edited')

  return (
    <Select value={sortBy} onValueChange={setSortBy}>
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
        <SelectItem value="recently-edited">最近修改</SelectItem>
        <SelectItem value="recently-created">最近创建</SelectItem>
        <SelectItem value="earliest-created">最早创建</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function StudioToolbar({ search, onCreateBlankApp, onSearchChange }: StudioToolbarProps) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <StudioSortSelect />

      <div className="relative min-w-0 max-sm:w-full sm:min-w-44">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索"
          className="bg-input focus-visible:bg-background h-8 rounded-lg border-transparent pr-3 pl-9 text-sm shadow-none"
        />
      </div>

      <Button
        type="button"
        className="ml-auto h-8 shrink-0 rounded-lg px-3 text-sm"
        onClick={onCreateBlankApp}
      >
        <Plus className="size-4" />
        创建
      </Button>
    </div>
  )
}
