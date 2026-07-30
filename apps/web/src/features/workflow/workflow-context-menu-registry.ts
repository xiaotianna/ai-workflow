import type { XYPosition } from '@xyflow/react'

import type { useWorkflowEditor } from './hooks/use-workflow-editor'
import type { useWorkflowNodePicker } from './hooks/use-workflow-node-picker'
import type { useWorkflowOperations } from './hooks/use-workflow-operations'

export type WorkflowContextMenuScope = 'canvas' | 'node'

export type WorkflowContextMenuTarget =
  | { scope: 'canvas'; position: XYPosition; screenPosition: XYPosition }
  | { scope: 'node'; nodeId: string; screenPosition: XYPosition }

export interface WorkflowContextMenuStrategyContext {
  target: WorkflowContextMenuTarget
  actionAnchorPosition?: XYPosition
  editor: ReturnType<typeof useWorkflowEditor>
  nodePicker: ReturnType<typeof useWorkflowNodePicker>
  operations: ReturnType<typeof useWorkflowOperations>
}

export interface WorkflowContextMenuActionStrategy {
  id: string
  scope: WorkflowContextMenuScope
  label: string
  order: number
  shortcutId?: string
  destructive?: boolean
  separatorBefore?: boolean
  keepMenuOpenAfterSelect?: boolean
  isVisible?: (context: WorkflowContextMenuStrategyContext) => boolean
  isDisabled?: (context: WorkflowContextMenuStrategyContext) => boolean
  execute: (context: WorkflowContextMenuStrategyContext) => void
}

export class WorkflowContextMenuActionRegistry {
  private readonly strategies = new Map<string, WorkflowContextMenuActionStrategy>()
  private readonly listeners = new Set<() => void>()
  private version = 0

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getSnapshot = () => this.version

  register(strategy: WorkflowContextMenuActionStrategy) {
    if (this.strategies.has(strategy.id)) {
      throw new Error(`右键操作已注册：${strategy.id}`)
    }

    this.strategies.set(strategy.id, strategy)
    this.emitChange()

    return () => {
      if (this.strategies.delete(strategy.id)) {
        this.emitChange()
      }
    }
  }

  registerAll(strategies: Iterable<WorkflowContextMenuActionStrategy>) {
    for (const strategy of strategies) {
      this.register(strategy)
    }
    return this
  }

  resolve(
    scope: WorkflowContextMenuScope,
    context: WorkflowContextMenuStrategyContext,
  ): readonly WorkflowContextMenuActionStrategy[] {
    return [...this.strategies.values()]
      .filter((strategy) => strategy.scope === scope && (strategy.isVisible?.(context) ?? true))
      .sort((left, right) => left.order - right.order)
  }

  private emitChange() {
    this.version += 1
    this.listeners.forEach((listener) => listener())
  }
}
