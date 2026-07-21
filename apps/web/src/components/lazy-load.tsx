import { Suspense, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

interface LazyLoadProps {
  children: ReactNode
}

export default function LazyLoad({ children }: LazyLoadProps) {
  return (
    <Suspense
      fallback={
        <div
          className="bg-background fixed inset-0 z-50 flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-label="页面加载中"
        >
          <LoaderCircle className="text-muted-foreground size-6 animate-spin" aria-hidden="true" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
