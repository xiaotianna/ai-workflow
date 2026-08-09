import { Button } from '@ai-workflow/ui/components/button'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getPlugin, type InstalledPluginDto, type UninstalledPluginDto } from '@/api/plugins'
import { PluginDetail, PluginMarketplaceHeader, toPluginDetail } from '@/features/plugin'

export default function PluginDetailPage() {
  const { pluginId = '' } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [plugin, setPlugin] = useState<ReturnType<typeof toPluginDetail>>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setPlugin(undefined)

    void getPlugin(pluginId, controller.signal)
      .then((result) => setPlugin(toPluginDetail(result)))
      .catch(() => {
        if (!controller.signal.aborted) setPlugin(undefined)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [pluginId])

  function handleSearchSubmit(value: string) {
    const searchParams = new URLSearchParams()
    if (value) searchParams.set('query', value)

    void navigate({
      pathname: '/plugin',
      search: searchParams.toString(),
    })
  }

  function handleInstalled(result: InstalledPluginDto) {
    setPlugin((currentPlugin) => {
      if (!currentPlugin || currentPlugin.id !== result.pluginId) return currentPlugin

      return {
        ...currentPlugin,
        installCount: currentPlugin.installation
          ? currentPlugin.installCount
          : currentPlugin.installCount + 1,
        installation: result.installation,
        updateAvailable: result.updateAvailable,
      }
    })
  }

  function handleUninstalled(result: UninstalledPluginDto) {
    setPlugin((currentPlugin) => {
      if (!currentPlugin || currentPlugin.id !== result.pluginId) return currentPlugin

      return {
        ...currentPlugin,
        installCount: Math.max(0, currentPlugin.installCount - 1),
        installation: null,
        updateAvailable: false,
      }
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

      {loading ? (
        <section className="mx-auto flex max-w-3xl flex-col items-center px-8 py-28 text-center">
          <p className="text-muted-foreground text-sm">正在加载插件…</p>
        </section>
      ) : plugin ? (
        <PluginDetail
          plugin={plugin}
          onInstalled={handleInstalled}
          onUninstalled={handleUninstalled}
        />
      ) : (
        <section className="mx-auto flex max-w-3xl flex-col items-center px-8 py-28 text-center">
          <h1 className="text-foreground text-2xl font-semibold">未找到该插件</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            插件可能已下架，或者当前插件 UUID 不存在。
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link to="/plugin">返回插件列表</Link>
          </Button>
        </section>
      )}
    </div>
  )
}
