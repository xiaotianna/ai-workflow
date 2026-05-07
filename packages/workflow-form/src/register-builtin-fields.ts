import { WorkflowFieldUIType } from '@ai-workflow/core'
import { FieldRendererProps, registerField } from './registry'
import { InputField } from './fields/input-field'
import { TextareaField } from './fields/textarea-field'
import { SelectField } from './fields/select-field'
import { SliderField } from './fields/slider-field'
import { ComponentType } from 'react'
import { SchemaEditorField } from './fields/schema-editor-field'

export const builtinFieldStrategies: Partial<
  Record<WorkflowFieldUIType, ComponentType<FieldRendererProps>>
> = {
  [WorkflowFieldUIType.INPUT]: InputField,
  [WorkflowFieldUIType.TEXTAREA]: TextareaField,
  [WorkflowFieldUIType.SELECT]: SelectField,
  [WorkflowFieldUIType.SLIDER]: SliderField,
  [WorkflowFieldUIType.SCHEMA_EDITOR]: SchemaEditorField,
}

export function registerBuiltinFields() {
  Object.entries(builtinFieldStrategies).forEach(([uiType, component]) => {
    if (!component) return
    registerField(uiType, component)
  })
}

registerBuiltinFields()

export const RenderFieldComponent: Partial<
  Record<WorkflowFieldUIType, ComponentType<FieldRendererProps>>
> = builtinFieldStrategies
