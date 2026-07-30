import { Button } from '@ai-workflow/ui/components/button'
import { ChevronLeft } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'

import { LayoutSidebar, type LayoutSidebarNavigationItem } from '@/components/layout-sidebar'

export interface DetailLayoutProps {
  backTo: string
  backLabel: string
  /** 返回链接下方的资源标识区，由各 feature 通过 ResourceIdentity 等组件注入 */
  resourceIdentity: ReactNode
  navigationItems: readonly LayoutSidebarNavigationItem[]
  navigationLabel: string
  /** 传递给详情子路由的资源状态等上下文 */
  outletContext?: unknown
  /** 渲染在布局外壳之前的内容，例如弹窗 */
  before?: ReactNode
}

export function DetailLayout({
  backTo,
  backLabel,
  resourceIdentity,
  navigationItems,
  navigationLabel,
  outletContext,
  before,
}: DetailLayoutProps) {
  return (
    <>
      {before}

      <div className="flex h-svh min-w-0 gap-1 overflow-hidden bg-[#f2f4f7] p-1">
        <div className="bg-background border-border flex h-full rounded-lg shadow-xs">
          <LayoutSidebar
            header={
              <div className="flex flex-col px-2 py-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground w-fit justify-start self-start px-1"
                >
                  <Link to={backTo} aria-label="返回">
                    <ChevronLeft aria-hidden />
                    <span className="mr-1">/</span>
                    <span className="pr-1.5">{backLabel}</span>
                  </Link>
                </Button>
                {resourceIdentity}
              </div>
            }
            items={navigationItems}
            navigationLabel={navigationLabel}
          />
        </div>

        <main className="border-border bg-background min-h-0 min-w-0 flex-1 overflow-auto rounded-lg shadow-xs">
          <Outlet context={outletContext} />
        </main>
      </div>
    </>
  )
}
