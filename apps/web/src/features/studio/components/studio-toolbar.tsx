import { Button } from '@ai-workflow/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { ChevronDown, FileUp, Plus, Search, SquarePlus } from 'lucide-react'

import type { StudioAppSort } from '../types'

interface StudioToolbarProps {
  search: string
  sort: StudioAppSort
  onCreateBlankApp: () => void
  onImportApp: () => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: StudioAppSort) => void
}

function StudioSortSelect({
  sort,
  onSortChange,
}: {
  sort: StudioAppSort
  onSortChange: (sort: StudioAppSort) => void
}) {
  return (
    <Select value={sort} onValueChange={(value) => onSortChange(value as StudioAppSort)}>
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
        <SelectItem value="updated_desc">最近修改</SelectItem>
        <SelectItem value="created_desc">最近创建</SelectItem>
        <SelectItem value="created_asc">最早创建</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function StudioToolbar({
  search,
  sort,
  onCreateBlankApp,
  onImportApp,
  onSearchChange,
  onSortChange,
}: StudioToolbarProps) {
  return (
    <>
      <StudioSortSelect sort={sort} onSortChange={onSortChange} />

      <div className="relative min-w-0 max-sm:w-full sm:min-w-44">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="搜索工作流应用"
          maxLength={40}
          placeholder="搜索"
          className="bg-input focus-visible:bg-background h-8 rounded-lg border-transparent pr-3 pl-9 text-sm shadow-none"
        />
      </div>

      <DropdownMenu>
        <div className="ml-auto flex shrink-0 overflow-hidden rounded-lg">
          <Button
            type="button"
            className="h-8 rounded-none rounded-l-lg px-3 text-sm"
            onClick={onCreateBlankApp}
          >
            <Plus className="size-4" />
            创建
          </Button>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              aria-label="更多创建选项"
              className="border-primary-foreground/15 h-8 rounded-none rounded-r-lg border-l px-2"
            >
              <ChevronDown className="size-4 transition-transform group-aria-expanded/button:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
        </div>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={onCreateBlankApp}>
            <SquarePlus className="text-muted-foreground size-4" />
            <span>创建空白应用</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem className="items-start" onSelect={onImportApp}>
            <FileUp className="text-muted-foreground mt-0.5 size-4" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>导入 DSL 文件</span>
              <span className="text-muted-foreground text-xs font-normal">
                拖放 DSL 文件到此处创建应用
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
