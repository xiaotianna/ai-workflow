import { BookOpen, CircleHelp, Puzzle, Settings, Workflow } from 'lucide-react'
import type { CSSProperties } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '../../components/sidebar'
import { TooltipProvider } from '../../components/tooltip'

const navigationItems = [
  {
    label: '工作流',
    href: '/studio',
    icon: Workflow,
  },
  {
    label: '知识库',
    href: '/knowledge-base',
    icon: BookOpen,
  },
  {
    label: '插件',
    href: '/plugin',
    icon: Puzzle,
  },
]

function PrimaryNavigation() {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup className="px-3 py-2 group-data-[collapsible=icon]:px-2">
      <SidebarGroupLabel className="text-sidebar-foreground/45 px-3 text-[11px] font-semibold tracking-[0.08em] uppercase">
        导航
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className="data-active:bg-primary/10 data-active:text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10 gap-3 rounded-lg px-3 text-[15px] font-medium"
                >
                  <NavLink to={item.href} onClick={() => setOpenMobile(false)}>
                    <item.icon className="size-[18px]" />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export default function LayoutPage() {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            '--sidebar-width': '17rem',
          } as CSSProperties
        }
      >
        <Sidebar collapsible="icon" className="border-sidebar-border/80">
          <SidebarHeader className="border-sidebar-border/70 gap-3 border-b px-3 pt-3 pb-4 group-data-[collapsible=icon]:px-2">
            <div className="flex h-10 items-center justify-between gap-2 px-1">
              <NavLink to="/studio" className="flex min-w-0 items-center gap-2.5">
                <span className="bg-primary text-primary-foreground shadow-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
                  <Workflow className="size-[18px]" />
                </span>
                <span className="truncate text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                  AI Workflow
                </span>
              </NavLink>
              <SidebarTrigger className="text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarHeader>

          <SidebarContent className="pt-2">
            <PrimaryNavigation />
          </SidebarContent>

          <SidebarFooter className="border-sidebar-border/70 border-t p-3 group-data-[collapsible=icon]:p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="帮助中心"
                  className="text-muted-foreground hover:text-sidebar-foreground h-9 rounded-lg px-3"
                >
                  <CircleHelp />
                  <span>帮助中心</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="账户设置"
                  className="hover:bg-sidebar-accent h-12 rounded-xl px-2.5"
                >
                  <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    A
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col items-start group-data-[collapsible=icon]:hidden">
                    <span className="w-full truncate text-sm font-semibold">AI Workflow</span>
                    <span className="text-muted-foreground w-full truncate text-xs">管理员</span>
                  </span>
                  <Settings className="text-muted-foreground size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-svh min-w-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-semibold">AI Workflow</span>
          </header>
          <div className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
