import type { ReactNode } from 'react'

interface NodeBodyProps {
  children?: ReactNode
}

/**
 * 只在存在实际可渲染内容时提供普通节点的 Body 间距。
 */
export function NodeBody({ children }: NodeBodyProps) {
  if (children === null || children === undefined || children === false) {
    return null
  }

  return <div className="px-3 pb-3">{children}</div>
}
