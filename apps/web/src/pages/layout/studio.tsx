import { cn } from '@ai-workflow/ui/lib/utils'
import { Bot, ChevronDown, GitBranch, MessageSquare, Plus, Search, Upload } from 'lucide-react'

import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'

type AppType = 'workflow' | 'chatflow'

interface StudioApp {
  id: string
  name: string
  type: AppType
  editedAt: string
}

const mockApps: StudioApp[] = [
  {
    id: '1',
    name: 'work flow',
    type: 'workflow',
    editedAt: '2024/04/30 11:30',
  },
  {
    id: '2',
    name: 'chat flow',
    type: 'chatflow',
    editedAt: '2024/04/30 11:30',
  },
]

function FilterButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="border-border bg-background text-foreground hover:bg-muted inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-sm shadow-xs transition-colors"
    >
      {label}
      <ChevronDown className="text-muted-foreground size-3.5" />
    </button>
  )
}

function AppTypeBadge({ type }: { type: AppType }) {
  if (type === 'workflow') {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <GitBranch className="size-3" />
        工作流
      </span>
    )
  }

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs uppercase">
      <MessageSquare className="size-3" />
      Chatflow
    </span>
  )
}

function StudioAppCard({ app }: { app: StudioApp }) {
  return (
    <article className="border-border bg-card hover:border-border/80 group flex flex-col rounded-xl border p-4 shadow-xs transition-colors hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white shadow-sm">
          <Bot className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{app.name}</h3>
            <AppTypeBadge type={app.type} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="border-border text-muted-foreground hover:text-foreground hover:border-border mt-4 inline-flex w-fit items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs transition-colors"
      >
        <Plus className="size-3" />
        添加标签
      </button>

      <p className="text-muted-foreground mt-auto pt-4 text-xs">
        AI Workflow · 编辑于 {app.editedAt}
      </p>
    </article>
  )
}

export default function StudioPage() {
  return (
    <div className="flex min-h-full flex-col px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">工作室</h1>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton label="类型" />
          <FilterButton label="标签" />
          <FilterButton label="创建者" />
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-muted inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-sm shadow-xs transition-colors"
          >
            <span className="text-muted-foreground">排序方式</span>
            最近修改
            <ChevronDown className="text-muted-foreground size-3.5" />
          </button>
        </div>

        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input className="bg-background pl-8" placeholder="搜索" />
        </div>

        <Button className={cn('ml-auto shrink-0 gap-1 rounded-lg')}>
          <Plus className="size-4" />
          创建
          <ChevronDown className="size-3.5 opacity-80" />
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {mockApps.map((app) => (
          <StudioAppCard key={app.id} app={app} />
        ))}
      </div>

      <footer className="text-muted-foreground mt-10 flex items-center justify-center gap-2 py-6 text-sm">
        <Upload className="size-4" />
        拖放 DSL 文件到此处创建应用
      </footer>
    </div>
  )
}
