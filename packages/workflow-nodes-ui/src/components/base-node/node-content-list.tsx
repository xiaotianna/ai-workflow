import type { ReactNode } from 'react'

export interface NodeContentListProps {
  children?: ReactNode
}

export function NodeContentList({ children }: NodeContentListProps) {
  if (children === null || children === undefined || children === false) {
    return null
  }

  return <div className="space-y-1.5 px-3 pb-3">{children}</div>
}
