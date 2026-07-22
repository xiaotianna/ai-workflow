import { Button } from '@ai-workflow/ui/components/button'
import { Play, Plus, Sparkles } from 'lucide-react'

export default function AppWorkflowPage() {
  return (
    <section className="flex min-h-full flex-col">
      <header className="flex shrink-0 items-center justify-between px-6 pt-5 pb-4">
        <div>
          <h2 className="text-lg font-semibold">编排</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">设计并调试工作流节点</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Play aria-hidden data-icon="inline-start" />
            运行
          </Button>
          <Button variant="confirm" size="sm">
            发布
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 p-4 pt-0">
        <div className="border-border bg-muted/25 relative flex min-h-[min(640px,calc(100svh-12rem))] flex-1 items-center justify-center overflow-hidden rounded-2xl border [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px]">
          <div className="border-border bg-card relative z-1 w-72 rounded-2xl border p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                <Sparkles aria-hidden className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">开始</h3>
                <p className="text-muted-foreground text-xs">配置工作流输入变量</p>
              </div>
            </div>
            <button
              type="button"
              className="border-border text-muted-foreground hover:bg-muted focus-visible:bg-muted mt-4 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs outline-hidden transition-colors"
            >
              <Plus aria-hidden className="size-3.5" />
              添加节点
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
