import type { WorkflowEnvironmentVariable } from '@ai-workflow/core'
import { createContext, use, type PropsWithChildren } from 'react'

const WorkflowEnvironmentVariablesContext = createContext<
  readonly WorkflowEnvironmentVariable[] | null
>(null)

interface WorkflowEnvironmentVariablesProviderProps extends PropsWithChildren {
  variables: readonly WorkflowEnvironmentVariable[]
}

export function WorkflowEnvironmentVariablesProvider({
  children,
  variables,
}: WorkflowEnvironmentVariablesProviderProps) {
  return (
    <WorkflowEnvironmentVariablesContext value={variables}>
      {children}
    </WorkflowEnvironmentVariablesContext>
  )
}

export function useWorkflowEnvironmentVariables() {
  const variables = use(WorkflowEnvironmentVariablesContext)

  if (!variables) {
    throw new Error(
      'useWorkflowEnvironmentVariables 必须在 WorkflowEnvironmentVariablesProvider 内使用',
    )
  }

  return variables
}
