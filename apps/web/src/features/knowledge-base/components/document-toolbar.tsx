import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Plus, Search } from 'lucide-react'

interface DocumentToolbarProps {
  search: string
  disabled?: boolean
  onAddDocument: () => void
  onSearchChange: (search: string) => void
}

export function DocumentToolbar({
  search,
  disabled,
  onAddDocument,
  onSearchChange,
}: DocumentToolbarProps) {
  return (
    <>
      <div className="relative min-w-0 max-sm:w-full sm:min-w-60">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索文档"
          aria-label="搜索文档"
          disabled={disabled}
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
