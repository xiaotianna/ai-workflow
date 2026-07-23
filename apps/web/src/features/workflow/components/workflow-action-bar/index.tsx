import { Button } from '@ai-workflow/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ChevronDown, Clock3, History, ListTree, Play, RotateCcw, Scan } from 'lucide-react'

const iconBtnClass =
  'border-border bg-background/95 size-8 shrink-0 rounded-lg border-[0.5px] p-0 shadow-xs backdrop-blur-[5px]'

export const WorkflowActionBar = () => {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="text-primary h-8 gap-1.5 rounded-lg px-3 text-[13px]"
      >
        <Play className="size-3.5 fill-current" aria-hidden />
        测试运行
      </Button>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={iconBtnClass}
          aria-label="重置"
        >
          <RotateCcw className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={iconBtnClass}
          aria-label="运行历史"
        >
          <Clock3 className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={cn(iconBtnClass, 'relative')}
          aria-label="检查清单"
        >
          <ListTree className="size-4" aria-hidden />
          <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-medium">
            6
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(iconBtnClass, 'h-8 w-auto px-2.5 text-xs font-semibold tracking-wide')}
          aria-label="环境变量"
        >
          ENV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={iconBtnClass}
          aria-label="定位"
        >
          <Scan className="size-4" aria-hidden />
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" className="h-8 gap-0.5 rounded-lg pr-2 pl-3 text-[13px]">
            发布
            <ChevronDown className="size-3.5 opacity-80" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6}>
          <DropdownMenuItem>发布到当前环境</DropdownMenuItem>
          <DropdownMenuItem>发布并更新 API</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className={iconBtnClass}
        aria-label="版本历史"
      >
        <History className="size-4" aria-hidden />
      </Button>
    </div>
  )
}
