import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { cn } from '@ai-workflow/ui/lib/utils'

export interface ResourceCardSkeletonProps {
  className?: string
}

export function ResourceCardSkeleton({ className }: ResourceCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border-border bg-card flex h-fit w-full flex-col overflow-hidden rounded-2xl border shadow-sm',
        className,
      )}
      aria-hidden
    >
      <div className="flex shrink-0 items-center gap-3 pt-4 pr-4 pb-2 pl-4">
        <div className="relative shrink-0">
          <Skeleton className="h-10 w-10 rounded-[10px]" />
          <Skeleton className="absolute -right-0.5 -bottom-0.5 size-4 rounded-md" />
        </div>
        <div className="flex w-0 grow flex-col gap-1 py-px">
          <Skeleton className="h-[21.6px] w-[58%] max-w-40" />
          <Skeleton className="h-3 w-[36%] max-w-24" />
        </div>
      </div>

      <div className="shrink-0 px-4 py-1">
        <div className="flex min-h-8 flex-col gap-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>

      <div className="flex shrink-0 px-4 pt-2 pb-3">
        <Skeleton className="h-3 w-full max-w-56" />
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
