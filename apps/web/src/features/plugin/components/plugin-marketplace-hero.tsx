import { cn } from '@ai-workflow/ui/lib/utils'
import { useRef } from 'react'

import { pluginCategories, type PluginCategoryId } from '../constants'
import { usePluginHeroCollapse } from '../hooks/use-plugin-hero-collapse'
import { PluginHeroBackground } from './plugin-hero-background'
import { PluginMarketplaceHeader } from './plugin-marketplace-header'

export interface PluginMarketplaceHeroProps {
  search: string
  activeCategory: PluginCategoryId
  onSearchChange: (search: string) => void
  onCategoryChange: (category: PluginCategoryId) => void
}

function PluginCategoryTab({
  category,
  isActive,
  onSelect,
}: {
  category: (typeof pluginCategories)[number]
  isActive: boolean
  onSelect: () => void
}) {
  const Icon = category.icon

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
      {category.label}
    </button>
  )
}

function PluginCategoryTabs({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: PluginCategoryId
  onCategoryChange: (category: PluginCategoryId) => void
}) {
  const [firstCategory, ...restCategories] = pluginCategories

  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto pb-0.5">
      <PluginCategoryTab
        category={firstCategory}
        isActive={firstCategory.id === activeCategory}
        onSelect={() => onCategoryChange(firstCategory.id)}
      />

      <span
        aria-hidden
        className="flex h-8 shrink-0 items-center justify-center px-2 text-[13px] text-white/90"
      >
        ·
      </span>

      {restCategories.map((category) => (
        <PluginCategoryTab
          key={category.id}
          category={category}
          isActive={category.id === activeCategory}
          onSelect={() => onCategoryChange(category.id)}
        />
      ))}
    </div>
  )
}

export function PluginMarketplaceHero({
  search,
  activeCategory,
  onSearchChange,
  onCategoryChange,
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
              <PluginCategoryTabs
                activeCategory={activeCategory}
                onCategoryChange={onCategoryChange}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
