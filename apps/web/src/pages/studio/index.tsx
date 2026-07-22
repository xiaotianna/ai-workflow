import { useParams } from 'react-router-dom'

export default function StudioDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <main className="bg-background flex min-h-svh flex-col px-8 py-6">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">工作室详情</h1>
        <p className="text-muted-foreground mt-2 text-sm">应用 ID：{id ?? '-'}</p>
      </header>

      <div className="border-border bg-card text-muted-foreground mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed p-12 text-sm">
        页面开发中，敬请期待
      </div>
    </main>
  )
}
