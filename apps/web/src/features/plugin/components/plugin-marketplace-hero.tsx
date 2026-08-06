import { cn } from '@ai-workflow/ui/lib/utils'
import { useRef } from 'react'

import { pluginFilters, type PluginFilterId } from '../constants'
import { usePluginHeroCollapse } from '../hooks/use-plugin-hero-collapse'
import { PluginHeroBackground } from './plugin-hero-background'
import { PluginMarketplaceHeader } from './plugin-marketplace-header'

export interface PluginMarketplaceHeroProps {
  search: string
  activeFilter: PluginFilterId
  onSearchChange: (search: string) => void
  onFilterChange: (filter: PluginFilterId) => void
}

function PluginFilterTab({
  filter,
  isActive,
  onSelect,
}: {
  filter: (typeof pluginFilters)[number]
  isActive: boolean
  onSelect: () => void
}) {
  const Icon = filter.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex h-8 shrink-0 cursor-pointer items-center rounded-lg border px-2.5 text-[13px] leading-4 font-medium whitespace-nowrap backdrop-blur-[5px] transition-[background-color,border-color,color]',
        isActive
          ? 'text-primary border-white/95 bg-white shadow-md'
          : 'border-transparent text-white hover:bg-white/20',
      )}
    >
      <Icon aria-hidden className="mr-1.5 size-4" />
      {filter.label}
    </button>
  )
}

function PluginFilterTabs({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: PluginFilterId
  onFilterChange: (filter: PluginFilterId) => void
}) {
  const [firstFilter, ...restFilters] = pluginFilters

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto pb-0.5">
      <PluginFilterTab
        filter={firstFilter}
        isActive={firstFilter.id === activeFilter}
        onSelect={() => onFilterChange(firstFilter.id)}
      />

      <span
        aria-hidden
        className="flex h-8 shrink-0 items-center justify-center px-2 text-[13px] text-white/90"
      >
        ·
      </span>

      {restFilters.map((filter) => (
        <PluginFilterTab
          key={filter.id}
          filter={filter}
          isActive={filter.id === activeFilter}
          onSelect={() => onFilterChange(filter.id)}
        />
      ))}
    </div>
  )
}

export function PluginMarketplaceHero({
  search,
  activeFilter,
  onSearchChange,
  onFilterChange,
}: PluginMarketplaceHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  usePluginHeroCollapse({ heroRef, titleRef, trackRef })

  return (
    <>
      <div ref={trackRef} aria-hidden className="pointer-events-none" />

      <div
        ref={heroRef}
        className={cn(
          'sticky -top-6 z-30 mx-3 w-[calc(100%-1.5rem)] shrink-0 self-start overflow-hidden rounded-lg px-3 pt-3 [overflow-anchor:none] data-[collapsed=true]:shadow-md',
        )}
        style={
          {
            '--hero-progress': 0,
            paddingBottom: 'calc(24px - 8px * var(--hero-progress))',
          } as React.CSSProperties
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ top: 'calc(-24px * var(--hero-progress))' }}
        >
          <PluginHeroBackground className="h-full w-full" />
        </div>

        <div className="relative z-10 flex w-full flex-col items-start">
          <PluginMarketplaceHeader
            search={search}
            collapseMobileTitle
            onSearchChange={onSearchChange}
          />

          <div className="relative z-10 mx-5 w-[calc(100%-2.5rem)]">
            <div
              className="overflow-hidden will-change-[height,opacity]"
              style={{
                marginTop: 'calc(32px - 16px * var(--hero-progress))',
                height: 'calc(var(--hero-title-height, 72px) * (1 - var(--hero-progress)))',
                opacity: 'calc(1 - var(--hero-progress))',
              }}
            >
              <div ref={titleRef}>
                <h1 className="mb-2 text-[30px] leading-9 font-semibold text-white">
                  探索 · 扩展 · 构建
                </h1>
                <p className="text-[14px] leading-5 font-medium text-white/80">
                  使用社区构建的集成助力您的 AI 开发。
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'calc(32px - 16px * var(--hero-progress))' }}>
              <PluginFilterTabs activeFilter={activeFilter} onFilterChange={onFilterChange} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
