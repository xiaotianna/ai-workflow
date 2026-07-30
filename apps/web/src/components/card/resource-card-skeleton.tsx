import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { cn } from '@ai-workflow/ui/lib/utils'

export interface ResourceCardSkeletonProps {
  className?: string
}

export function ResourceCardSkeleton({ className }: ResourceCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border-border/20 bg-card h-40 w-full overflow-hidden rounded-2xl border shadow-xs',
        className,
      )}
      aria-hidden
    >
      <div className="flex items-start gap-2 px-4 pt-5">
        <Skeleton className="size-10 shrink-0 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-[58%] max-w-28 rounded-sm" />
          <Skeleton className="h-3 w-[30%] max-w-14 rounded-sm" />
        </div>
      </div>

      <div className="mt-7 px-4">
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="mt-4 h-3 w-4/5 rounded-sm" />
      </div>
    </div>
  )
}

export interface ResourceCardSkeletonGridProps {
  count?: number
  className?: string
}

export function ResourceCardSkeletonGrid({ count = 8, className }: ResourceCardSkeletonGridProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <ResourceCardSkeleton key={index} className={className} />
      ))}
    </>
  )
}
