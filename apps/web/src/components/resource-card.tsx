import { cn } from '@ai-workflow/ui/lib/utils'
import { MessageSquare, Waypoints, type LucideIcon } from 'lucide-react'
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'

export type ResourceKind = 'workflow' | 'chatflow'

export interface ResourceCardProps extends Omit<ComponentPropsWithoutRef<'article'>, 'children'> {
  title: string
  kind: ResourceKind
  kindLabel: string
  author: string
  editedAtLabel: string
  description?: string
  icon?: ReactNode
  iconBackground?: CSSProperties['background']
}

const kindConfig: Record<
  ResourceKind,
  { badgeClassName: string; BadgeIcon: LucideIcon; badgeLabel: string }
> = {
  workflow: {
    BadgeIcon: Waypoints,
    badgeClassName: 'bg-indigo-600 text-white',
    badgeLabel: '工作流',
  },
  chatflow: {
    BadgeIcon: MessageSquare,
    badgeClassName: 'bg-primary text-primary-foreground',
    badgeLabel: '对话流',
  },
}

const defaultIconBackground = 'rgb(255, 234, 213)'

export function ResourceCard({
  title,
  kind,
  kindLabel,
  author,
  editedAtLabel,
  description,
  icon,
  iconBackground = defaultIconBackground,
  className,
  ...props
}: ResourceCardProps) {
  const { BadgeIcon, badgeClassName } = kindConfig[kind]

  return (
    <article
      className={cn(
        'bg-card hover:border-border/50 group border-border/20 flex h-fit w-full cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-xs outline-hidden transition-shadow duration-200 ease-in-out hover:shadow-lg',
        className,
      )}
      {...props}
    >
      <div className="flex shrink-0 items-center gap-3 pt-4 pr-4 pb-2 pl-4">
        <div className="relative shrink-0">
          <span
            className="border-border/80 relative flex h-10 w-10 shrink-0 grow-0 items-center justify-center overflow-hidden rounded-[10px] border-[0.5px] text-[24px] leading-none"
            style={{ background: iconBackground }}
          >
            {icon ?? <span aria-hidden>🤖</span>}
          </span>
          <span
            className={cn(
              'border-border absolute -right-0.5 -bottom-0.5 inline-flex size-4 items-center justify-center rounded-md border shadow-sm',
              badgeClassName,
            )}
            title={kindConfig[kind].badgeLabel}
          >
            <BadgeIcon className="size-3" strokeWidth={2.25} />
          </span>
        </div>

        <div className="flex w-0 grow flex-col gap-1 py-px">
          <div className="text-text-secondary flex items-center text-sm/5 font-semibold">
            <h2 className="truncate">{title}</h2>
          </div>
          <div className="text-muted-foreground truncate text-[10px] leading-3 font-medium tracking-wide uppercase">
            {kindLabel}
          </div>
        </div>
      </div>

      <div className="text-muted-foreground shrink-0 px-4 py-1 text-xs leading-4">
        <div className="line-clamp-2 min-h-8">{description}</div>
      </div>

      <div className="text-muted-foreground flex min-w-0 shrink-0 items-center overflow-hidden pt-2 pr-4 pb-3 pl-4 text-xs leading-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 whitespace-nowrap">
          <div className="min-w-0 truncate">{author}</div>
          <div className="shrink-0">·</div>
          <div className="min-w-0 truncate">编辑于 {editedAtLabel}</div>
        </div>
      </div>
    </article>
  )
}
