import type { DataType, VariableReference } from '@ai-workflow/core'

export interface AvailableVariableOption {
  id: string
  label: string
  sourceId: string
  sourceLabel: string
  variableName: string
  dataType: DataType
  reference: VariableReference
}
