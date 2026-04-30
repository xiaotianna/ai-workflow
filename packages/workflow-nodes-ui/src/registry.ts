import type { NodeContentProps } from './nodes/base'
import type { JSX } from 'react'

export type NodeContentRenderer = (props: NodeContentProps) => JSX.Element

const uiNodeRegistry = new Map<string, NodeContentRenderer>()

export function registerUINode(type: string, renderer: NodeContentRenderer) {
  if (uiNodeRegistry.has(type)) {
    throw new Error(`UI Node "${type}" 已经注册`)
  }

  uiNodeRegistry.set(type, renderer)

  return renderer
}

export function getUINode(type: string) {
  const renderer = uiNodeRegistry.get(type)

  if (!renderer) {
    throw new Error(`UI Node "${type}" 未注册`)
  }

  return renderer
}
