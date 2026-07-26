import { createContext, use, type PropsWithChildren } from 'react'

import type { WorkflowLoopEditor } from '@/features/workflow/hooks/use-workflow-loop-editor'

const WorkflowLoopEditorContext = createContext<WorkflowLoopEditor | null>(null)

type WorkflowLoopEditorProviderProps = PropsWithChildren<{
  value: WorkflowLoopEditor
}>

export const WorkflowLoopEditorProvider = ({
  children,
  value,
}: WorkflowLoopEditorProviderProps) => {
  return <WorkflowLoopEditorContext value={value}>{children}</WorkflowLoopEditorContext>
}

export function useWorkflowLoopEditorContext(): WorkflowLoopEditor {
  const loopEditor = use(WorkflowLoopEditorContext)

  if (!loopEditor) {
    throw new Error('useWorkflowLoopEditorContext 必须在 WorkflowLoopEditorProvider 内使用')
  }

  return loopEditor
}
