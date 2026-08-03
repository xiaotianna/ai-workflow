import { Button } from '@ai-workflow/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { ChevronDown, LoaderCircle } from 'lucide-react'

interface PublishProps {
  loadError?: boolean
  loading?: boolean
  pending?: boolean
  publishedAt?: string
  onPublish: () => void
}

export const Publish = ({
  loadError = false,
  loading = false,
  pending = false,
  publishedAt,
  onPublish,
}: PublishProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-0.5 rounded-lg pr-2 pl-3 text-[13px]"
          aria-busy={pending}
          aria-keyshortcuts="Meta+Shift+P Control+Shift+P"
          disabled={pending}
        >
          {pending ? '发布中' : '发布'}
          {pending ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5 opacity-80" aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        aria-label="发布工作流"
        className="w-64 max-w-[calc(100vw-1rem)] p-4"
      >
        <div className="mb-3" role="presentation">
          <p className="text-muted-foreground text-xs leading-4 font-medium">
            {publishedAt ? '最新发布' : '发布状态'}
          </p>
          <p className="text-foreground text-sm leading-5 font-medium">
            {loading
              ? '正在获取发布状态…'
              : loadError
                ? '无法获取发布状态'
                : publishedAt
                  ? `发布于 ${formatRelativeTime(publishedAt)}`
                  : '当前尚未发布'}
          </p>
        </div>
        <DropdownMenuItem
          aria-keyshortcuts="Meta+Shift+P Control+Shift+P"
          disabled={loading || pending}
          onSelect={onPublish}
          className="bg-primary text-primary-foreground data-[highlighted]:bg-primary/85 data-[highlighted]:text-primary-foreground active:bg-primary/70 h-8 w-full justify-center gap-1 rounded-lg px-3.5 py-0 text-sm font-semibold shadow-xs"
        >
          {pending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
          <span>{pending ? '发布中' : publishedAt ? '发布更新' : '发布工作流'}</span>
          <span className="flex items-center gap-1" aria-hidden>
            {['⌘', '⇧', 'P'].map((key) => (
              <kbd
                key={key}
                className="bg-primary-foreground/15 text-primary-foreground flex size-5 items-center justify-center rounded-md font-sans text-xs leading-none"
              >
                {key}
              </kbd>
            ))}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const differenceMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000))
  if (differenceMinutes < 1) return '刚刚'
  if (differenceMinutes < 60) return `${differenceMinutes} 分钟前`

  const differenceHours = Math.floor(differenceMinutes / 60)
  if (differenceHours < 24) return `${differenceHours} 小时前`

  const differenceDays = Math.floor(differenceHours / 24)
  if (differenceDays < 7) return `${differenceDays} 天前`

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
