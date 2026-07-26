import { type ReactNode } from 'react'

export interface PageTitleProps {
  title: string
  subtitle?: ReactNode
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <div className="flex min-h-6 min-w-0 items-center">
      <div className="flex min-w-0 flex-col">
        <h1 className="text-text-primary text-[18px] font-semibold">{title}</h1>
        {subtitle ? (
          <div className="text-muted-foreground mt-1 flex items-center space-x-0.5 text-sm font-normal">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  )
}
