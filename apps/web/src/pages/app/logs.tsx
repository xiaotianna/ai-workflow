import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { ScrollText, Search } from 'lucide-react'

export default function AppLogsPage() {
  return (
    <section className="flex min-h-full flex-col px-8 py-7">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">日志</h2>
        <p className="text-muted-foreground mt-1 text-sm">查看工作流的运行记录与执行结果。</p>
      </header>

      <div className="mt-7 flex items-center gap-2">
        <div className="relative w-72">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input aria-label="搜索日志" placeholder="搜索日志" className="pl-8" />
        </div>
        <Button variant="secondary">筛选</Button>
      </div>

      <div className="border-border mt-5 flex min-h-96 flex-1 flex-col overflow-hidden rounded-xl border">
        <div className="bg-muted/45 text-muted-foreground grid grid-cols-[1.4fr_1fr_1fr_120px] gap-4 border-b px-5 py-3 text-xs font-medium">
          <span>运行时间</span>
          <span>状态</span>
          <span>耗时</span>
          <span>操作</span>
        </div>
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <span className="bg-muted mb-4 flex size-12 items-center justify-center rounded-2xl">
            <ScrollText aria-hidden className="size-5" />
          </span>
          <p className="text-foreground text-sm font-medium">暂无运行日志</p>
          <p className="mt-1 text-xs">工作流运行后，执行记录会显示在这里。</p>
        </div>
      </div>
    </section>
  )
}
