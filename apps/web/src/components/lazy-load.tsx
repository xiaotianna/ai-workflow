import { Suspense, type ReactNode } from 'react'

interface LazyLoadProps {
  children: ReactNode
}

export default function LazyLoad({ children }: LazyLoadProps) {
  return (
    <Suspense
      fallback={
        <div role="status" aria-live="polite">
          页面加载中...
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
