import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { cn } from '@ai-workflow/ui/lib/utils'

export interface PluginMarketplaceHeroSkeletonProps {
  className?: string
}

export function PluginMarketplaceHeroSkeleton({ className }: PluginMarketplaceHeroSkeletonProps) {
  return (
    <div
      className={cn(
        'relative w-full shrink-0 overflow-hidden rounded-lg px-3 pt-3 pb-6',
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#0033ff]/90" />

      <div className="relative z-10 flex w-full flex-col gap-8">
        <Skeleton className="h-[60px] w-full rounded-lg bg-white/20" />

        <div className="mx-5 space-y-3">
          <Skeleton className="h-9 w-72 max-w-full rounded-md bg-white/20" />
          <Skeleton className="h-5 w-96 max-w-full rounded-md bg-white/15" />
          <div className="flex gap-2 pt-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-lg bg-white/15" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
