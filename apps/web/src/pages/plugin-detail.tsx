import { Button } from '@ai-workflow/ui/components/button'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { findMockPluginDetail, PluginDetail, PluginMarketplaceHeader } from '@/features/plugin'

export default function PluginDetailPage() {
  const { author = '', pluginId = '' } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const plugin = findMockPluginDetail(author, pluginId)

  function handleSearchSubmit(value: string) {
    const searchParams = new URLSearchParams()
    if (value) searchParams.set('query', value)

    void navigate({
      pathname: '/plugin',
      search: searchParams.toString(),
    })
  }

  return (
    <div className="bg-input h-svh min-w-0 overflow-auto">
      <header className="sticky top-0 z-40 bg-transparent p-3">
        <PluginMarketplaceHeader
          search={search}
          collapseMobileTitle
          showLogoBackAction
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
        />
      </header>

      {plugin ? (
        <PluginDetail plugin={plugin} />
      ) : (
        <section className="mx-auto flex max-w-3xl flex-col items-center px-8 py-28 text-center">
          <h1 className="text-foreground text-2xl font-semibold">未找到该插件</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            插件可能已下架，或者当前链接中的作者与插件 ID 不正确。
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link to="/plugin">返回插件列表</Link>
          </Button>
        </section>
      )}
    </div>
  )
}
