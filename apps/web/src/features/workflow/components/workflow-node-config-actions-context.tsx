import type { SubWorkflowReference, SubWorkflowTargetContract } from '@ai-workflow/core'
import { createContext, use, type PropsWithChildren } from 'react'

export interface SubWorkflowSelectionPayload {
  workflow: SubWorkflowReference
  target: SubWorkflowTargetContract
}

interface WorkflowNodeConfigActionsContextValue {
  applySubWorkflowSelection: (payload: SubWorkflowSelectionPayload) => void
}

const WorkflowNodeConfigActionsContext =
  createContext<WorkflowNodeConfigActionsContextValue | null>(null)

export function WorkflowNodeConfigActionsProvider({
  children,
  applySubWorkflowSelection,
}: PropsWithChildren<WorkflowNodeConfigActionsContextValue>) {
  return (
    <WorkflowNodeConfigActionsContext value={{ applySubWorkflowSelection }}>
      {children}
    </WorkflowNodeConfigActionsContext>
  )
}

export function useWorkflowNodeConfigActions(): WorkflowNodeConfigActionsContextValue {
  const actions = use(WorkflowNodeConfigActionsContext)

  if (!actions) {
    throw new Error('useWorkflowNodeConfigActions 必须在 WorkflowNodeConfigActionsProvider 内使用')
  }

  return actions
}
