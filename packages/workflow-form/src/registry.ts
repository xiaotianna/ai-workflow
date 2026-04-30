import { WorkflowFieldUIType } from '@ai-workflow/core'
import type { NodeFieldDefinition } from '@ai-workflow/core'
import type { ComponentType } from 'react'
import { InputField } from './fields/input-field'
import { TextareaField } from './fields/textarea-field'

export interface FieldRendererProps {
  fieldKey: string
  field: NodeFieldDefinition
  value: unknown
  onChange: (value: unknown) => void
}

export const RenderFieldComponent: Partial<
  Record<WorkflowFieldUIType, ComponentType<FieldRendererProps>>
> = {
  [WorkflowFieldUIType.INPUT]: InputField,
  [WorkflowFieldUIType.TEXTAREA]: TextareaField,
}
