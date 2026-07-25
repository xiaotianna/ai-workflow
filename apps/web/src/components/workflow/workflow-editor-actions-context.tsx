import { createContext, use, type PropsWithChildren } from 'react'

interface WorkflowEditorActions {
  addNodeToLoop: (type: string, loopId: string) => void
}

const WorkflowEditorActionsContext = createContext<WorkflowEditorActions | null>(null)

type WorkflowEditorActionsProviderProps = PropsWithChildren<{
  value: WorkflowEditorActions
}>

export const WorkflowEditorActionsProvider = ({
  children,
  value,
}: WorkflowEditorActionsProviderProps) => {
  return <WorkflowEditorActionsContext value={value}>{children}</WorkflowEditorActionsContext>
}

export function useWorkflowEditorActions(): WorkflowEditorActions {
  // use 19新特性，等价于useContext
  const actions = use(WorkflowEditorActionsContext)

  if (!actions) {
    throw new Error('useWorkflowEditorActions 必须在 WorkflowEditorActionsProvider 内使用')
  }

  return actions
}
