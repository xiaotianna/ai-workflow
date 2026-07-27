import type { ReactNode } from 'react'

export interface NodeContentItemProps {
  content: ReactNode
}

export function NodeContentItem({ content }: NodeContentItemProps) {
  return <div className="bg-muted/60 min-w-0 rounded-md px-2 py-1.5">{content}</div>
}
