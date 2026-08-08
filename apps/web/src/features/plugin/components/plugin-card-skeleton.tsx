import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { cn } from '@ai-workflow/ui/lib/utils'

export interface PluginCardSkeletonProps {
  className?: string
}

export function PluginCardSkeleton({ className }: PluginCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border-border/20 bg-card relative flex min-h-44 w-full flex-col overflow-hidden rounded-xl border shadow-xs',
        className,
      )}
      aria-hidden
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <Skeleton className="size-10 shrink-0 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-[45%] max-w-28 rounded-sm" />
          <Skeleton className="h-3 w-[72%] max-w-44 rounded-sm" />
        </div>
      </div>

      <div className="flex-1 px-4 pb-2">
        <Skeleton className="h-3.5 w-full rounded-sm" />
        <Skeleton className="mt-2 h-3.5 w-[88%] rounded-sm" />
      </div>

      <div className="px-4 pt-1 pb-4">
        <Skeleton className="h-6 w-14 rounded-md" />
      </div>
    </div>
  )
}

export interface PluginCardSkeletonGridProps {
  count?: number
  className?: string
}

export function PluginCardSkeletonGrid({ count = 8, className }: PluginCardSkeletonGridProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <PluginCardSkeleton key={index} className={className} />
      ))}
    </>
  )
}
