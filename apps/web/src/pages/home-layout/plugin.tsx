import { PageContent } from '@/components/page-content'
import {
  PluginGrid,
  PluginMarketplaceHero,
  PluginMarketplaceHeroSkeleton,
  usePlugins,
} from '@/features/plugin'

export default function PluginPage() {
  const {
    error,
    filterId,
    initialLoading,
    loading,
    plugins,
    refresh,
    search,
    setFilterId,
    setSearch,
  } = usePlugins()

  return (
    <div className="-mx-8 -mt-6 flex min-h-full flex-col pb-8">
      {initialLoading ? (
        <div className="px-3">
          <PluginMarketplaceHeroSkeleton />
        </div>
      ) : (
        <PluginMarketplaceHero
          search={search}
          activeFilter={filterId}
          onSearchChange={setSearch}
          onFilterChange={setFilterId}
        />
      )}

      <PageContent className="px-8 pt-2">
        <PluginGrid error={error} loading={loading} plugins={plugins} onRetry={refresh} />
      </PageContent>
    </div>
  )
}
