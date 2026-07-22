import { Button } from '@ai-workflow/ui/components/button'
import { Clipboard, KeyRound } from 'lucide-react'

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-foreground text-background overflow-hidden rounded-xl shadow-sm">
      <div className="border-background/15 border-b px-5 py-3 text-xs font-medium">Code</div>
      <pre className="overflow-x-auto px-5 py-4 text-sm">
        <code>{children}</code>
      </pre>
    </div>
  )
}

export default function AppApiPage() {
  return (
    <section className="min-h-full">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-end gap-3">
          <div className="bg-input text-muted-foreground flex h-9 min-w-0 flex-1 items-center rounded-lg px-3 text-sm sm:max-w-md">
            <span className="mr-2 shrink-0 text-xs font-medium">API 服务器</span>
            <span className="text-foreground truncate font-medium">https://api.example.com/v1</span>
            <Clipboard aria-hidden className="text-muted-foreground ml-auto size-4 shrink-0" />
          </div>
          <span className="bg-primary/10 text-primary shrink-0 rounded-lg px-3 py-2 text-sm font-medium">
            运行中
          </span>
          <Button variant="secondary" size="sm" className="shrink-0">
            <KeyRound aria-hidden data-icon="inline-start" />
            API 密钥
          </Button>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Workflow 应用 API</h2>
        <p className="text-muted-foreground mt-3 text-base">
          Workflow 应用适用于自动化处理、内容生成与数据编排等场景。
        </p>

        <div className="mt-10 space-y-10">
          <section>
            <h3 className="mb-4 text-lg font-semibold">Base URL</h3>
            <CodeBlock>https://api.example.com/v1</CodeBlock>
          </section>

          <section>
            <h3 className="mb-3 text-lg font-semibold">Authentication</h3>
            <p className="text-muted-foreground mb-4 text-sm leading-6">
              Service API 使用 API Key 进行鉴权，请在 Authorization 请求头中携带密钥。
            </p>
            <CodeBlock>{'Authorization: Bearer {API_KEY}'}</CodeBlock>
          </section>
        </div>
      </div>
    </section>
  )
}
