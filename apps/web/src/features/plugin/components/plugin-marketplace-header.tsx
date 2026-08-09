import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ArrowLeft, BookOpen, Search, Upload } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { publishPlugin } from '@/api/plugins'

import type { PluginPublishInput } from '../schema'
import { PluginPublishDialog } from './plugin-publish-dialog'

export interface PluginMarketplaceHeaderProps {
  search: string
  onSearchChange: (search: string) => void
  onSearchSubmit?: (search: string) => void
  onPublish?: (input: PluginPublishInput) => unknown | Promise<unknown>
  collapseMobileTitle?: boolean
  showLogoBackAction?: boolean
  className?: string
}

export function PluginMarketplaceHeader({
  search,
  onSearchChange,
  onSearchSubmit,
  onPublish,
  collapseMobileTitle = false,
  showLogoBackAction = false,
  className,
}: PluginMarketplaceHeaderProps) {
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearchSubmit?.(search.trim())
  }

  return (
    <div
      className={cn(
        'border-border/50 bg-background/80 flex h-15 w-full items-center rounded-lg border-[0.5px] backdrop-blur-[6px]',
        className,
      )}
    >
      <div className="flex h-full min-w-0 flex-1 items-center px-5 py-2">
        <Link
          to="/plugin"
          aria-label={showLogoBackAction ? '返回插件列表' : '插件 Marketplace'}
          className={cn(
            'group/brand flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md outline-none',
            !showLogoBackAction && 'focus-visible:bg-muted',
          )}
        >
          <span
            className={cn(
              'relative flex h-8 w-13 shrink-0 items-center justify-center rounded-md',
              showLogoBackAction &&
                'group/logo hover:bg-muted group-focus-visible/brand:bg-muted transition-colors duration-150 motion-reduce:transition-none',
            )}
          >
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                showLogoBackAction &&
                  'transition-[opacity,transform] duration-150 ease-out group-hover/logo:-translate-x-1 group-hover/logo:scale-90 group-hover/logo:opacity-0 group-focus-visible/brand:-translate-x-1 group-focus-visible/brand:scale-90 group-focus-visible/brand:opacity-0 motion-reduce:transition-none',
              )}
            >
              <img
                width={52}
                height={24}
                className="block h-6 w-13 -scale-x-100 object-contain dark:brightness-0 dark:invert"
                alt=""
                src="/plugin-logo.svg"
              />
            </span>
            {showLogoBackAction ? (
              <span className="text-foreground absolute inset-0 flex translate-x-1 scale-90 items-center justify-center opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover/logo:translate-x-0 group-hover/logo:scale-100 group-hover/logo:opacity-100 group-focus-visible/brand:translate-x-0 group-focus-visible/brand:scale-100 group-focus-visible/brand:opacity-100 motion-reduce:transition-none">
                <ArrowLeft aria-hidden className="size-5" />
              </span>
            ) : null}
          </span>
          <span
            className="text-foreground overflow-hidden text-[18px] leading-6 font-semibold whitespace-nowrap md:hidden"
            style={
              collapseMobileTitle
                ? {
                    maxWidth: 'calc(var(--hero-progress, 0) * 150px)',
                    opacity: 'clamp(0, (var(--hero-progress, 0) - 0.15) / 0.85, 1)',
                  }
                : undefined
            }
          >
            插件 Marketplace
          </span>
          <span className="text-foreground hidden overflow-hidden text-[18px] leading-6 font-semibold whitespace-nowrap md:inline md:max-w-37.5">
            插件 Marketplace
          </span>
        </Link>
      </div>

      <form className="relative z-10 w-64 shrink-0" role="search" onSubmit={handleSubmit}>
        <Search
          aria-hidden
          className="text-input-placeholder pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          name="query"
          autoComplete="off"
          aria-label="搜索插件"
          maxLength={100}
          placeholder="搜索名称、描述、ID 或发布者"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="bg-input focus-visible:bg-background h-9 rounded-[10px] border-transparent pr-2 pl-8 text-[14px] leading-5 shadow-none"
        />
      </form>

      <div className="flex h-full shrink-0 items-center justify-end gap-4 pr-3.5 pl-4">
        <div aria-hidden className="bg-muted-foreground/30 mx-0 h-4 w-px shrink-0" />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="发布插件"
            className="text-muted-foreground hover:text-foreground size-8"
            onClick={() => setPublishDialogOpen(true)}
          >
            <Upload className="size-4 shrink-0" />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-8"
          >
            <Link
              to="/docs/plugin"
              target="_blank"
              rel="noreferrer"
              aria-label="在新窗口查看插件文档"
            >
              <BookOpen className="size-4 shrink-0" />
            </Link>
          </Button>
        </div>
      </div>

      <PluginPublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        onPublish={onPublish ?? publishPlugin}
      />
    </div>
  )
}
