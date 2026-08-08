import { PageContent } from '@/components/page-content'
import { publishPlugin } from '@/api/plugins'
import {
  PluginGrid,
  PluginMarketplaceHero,
  PluginMarketplaceHeroSkeleton,
  usePlugins,
  type PluginPublishInput,
} from '@/features/plugin'

export default function PluginPage() {
  const {
    activeFilter,
    hasMore,
    heroLoading,
    initialError,
    initialLoading,
    loadMore,
    loadMoreError,
    loadingMore,
    plugins,
    refresh,
    retryLoadMore,
    search,
    setSearch,
    setActiveFilter,
  } = usePlugins()

  async function handlePublish(input: PluginPublishInput) {
    await publishPlugin(input)
    refresh()
  }

  return (
    <div className="-mx-8 -mt-6 flex min-h-full flex-col pb-8">
      {heroLoading ? (
        <div className="px-3">
          <PluginMarketplaceHeroSkeleton />
        </div>
      ) : (
        <PluginMarketplaceHero
          search={search}
          activeFilter={activeFilter}
          onSearchChange={setSearch}
          onFilterChange={setActiveFilter}
          onPublish={handlePublish}
        />
      )}

      <PageContent className="px-8 pt-2">
        <PluginGrid
          plugins={plugins}
          hasMore={hasMore}
          initialError={initialError}
          initialLoading={initialLoading}
          loadMoreError={loadMoreError}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          onRetryInitial={refresh}
          onRetryLoadMore={retryLoadMore}
        />
      </PageContent>
    </div>
  )
}
