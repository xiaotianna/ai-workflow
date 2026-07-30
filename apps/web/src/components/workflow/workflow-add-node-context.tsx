import { createContext, use, type PropsWithChildren } from 'react'
import type { XYPosition } from '@xyflow/react'

interface WorkflowAddNodeContextValue {
  disabled: boolean
  openInsertNode: (edgeId: string, center: XYPosition, anchorPosition: XYPosition) => void
}

const WorkflowAddNodeContext = createContext<WorkflowAddNodeContextValue | null>(null)

type WorkflowAddNodeProviderProps = PropsWithChildren<WorkflowAddNodeContextValue>

export function WorkflowAddNodeProvider({
  children,
  disabled,
  openInsertNode,
}: WorkflowAddNodeProviderProps) {
  return (
    <WorkflowAddNodeContext value={{ disabled, openInsertNode }}>{children}</WorkflowAddNodeContext>
  )
}

export function useWorkflowAddNode() {
  const context = use(WorkflowAddNodeContext)

  if (!context) {
    throw new Error('useWorkflowAddNode 必须在 WorkflowAddNodeProvider 内使用')
  }

  return context
}
