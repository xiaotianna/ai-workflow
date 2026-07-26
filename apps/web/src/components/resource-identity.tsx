import { type CSSProperties, type ReactNode } from 'react'

export const defaultResourceIconBackground = 'rgb(255, 234, 213)'

export interface ResourceIdentityProps {
  title: string
  kindLabel: string
  icon: ReactNode
  iconBackground?: CSSProperties['background']
  /** 右侧操作区，由各 feature 注入菜单等内容 */
  actions?: ReactNode
}

export function ResourceIdentity({
  title,
  kindLabel,
  icon,
  iconBackground = defaultResourceIconBackground,
  actions,
}: ResourceIdentityProps) {
  return (
    <div className="hover:bg-muted flex w-full items-start gap-2 rounded-xl p-2 transition-colors">
      <span
        className="border-border/80 relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-[0.5px] text-[24px] leading-none"
        style={{ background: iconBackground }}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 self-stretch">
        <div className="flex w-full min-w-0 pr-1">
          <div className="text-text-secondary truncate text-sm/5 font-semibold">{title}</div>
        </div>
        <div className="text-muted-foreground truncate text-[10px] leading-3 font-medium tracking-wide uppercase">
          {kindLabel}
        </div>
      </div>
      {actions ?? <span className="size-8 shrink-0" aria-hidden />}
    </div>
  )
}
