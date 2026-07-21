interface MockPageProps {
  title: string
  description?: string
}

export default function MockPage({ title, description }: MockPageProps) {
  return (
    <div className="flex min-h-full flex-col px-8 py-6">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-2 text-sm">{description}</p>}
      </header>
      <div className="border-border bg-card text-muted-foreground mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed p-12 text-sm">
        页面开发中，敬请期待
      </div>
    </div>
  )
}
