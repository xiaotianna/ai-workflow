import { createContext, use, type PropsWithChildren } from 'react'

import type { WorkflowLoopEditor } from '@/features/workflow/hooks/use-workflow-loop-editor'

export type WorkflowLoopEditorContextValue = WorkflowLoopEditor & {
  disabled: boolean
}

const WorkflowLoopEditorContext = createContext<WorkflowLoopEditorContextValue | null>(null)

type WorkflowLoopEditorProviderProps = PropsWithChildren<{
  disabled?: boolean
  value: WorkflowLoopEditor
}>

export const WorkflowLoopEditorProvider = ({
  children,
  disabled = false,
  value,
}: WorkflowLoopEditorProviderProps) => {
  return (
    <WorkflowLoopEditorContext value={{ ...value, disabled }}>{children}</WorkflowLoopEditorContext>
  )
}

export function useWorkflowLoopEditorContext(): WorkflowLoopEditorContextValue {
  const loopEditor = use(WorkflowLoopEditorContext)

  if (!loopEditor) {
    throw new Error('useWorkflowLoopEditorContext 必须在 WorkflowLoopEditorProvider 内使用')
  }

  return loopEditor
}
