import type { ComponentType } from 'react'
import type { NodeContentProps } from './nodes/base'

export type WorkflowNodeUIComponent<T = any> = ComponentType<NodeContentProps<T>>

const uiNodeRegistry = new Map<string, WorkflowNodeUIComponent<any>>()

export function registerUINode<T = any>(type: string, renderer: WorkflowNodeUIComponent<T>) {
  if (uiNodeRegistry.has(type)) {
    throw new Error(`UI Node "${type}" 已经注册`)
  }

  uiNodeRegistry.set(type, renderer as WorkflowNodeUIComponent<any>)

  return renderer
}

export function getUINode(type: string) {
  const renderer = uiNodeRegistry.get(type)

  if (!renderer) {
    throw new Error(`UI Node "${type}" 未注册`)
  }

  return renderer
}
