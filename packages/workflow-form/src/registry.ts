import type { ComponentType } from 'react'

import type { NodeFieldDefinition, WorkflowFieldUIType } from '@ai-workflow/core'

export interface FieldRendererProps {
  fieldKey: string
  field: NodeFieldDefinition
  value: unknown
  onChange: (value: unknown) => void
}

const fieldRegistry = new Map<WorkflowFieldUIType | string, ComponentType<FieldRendererProps>>()

/**
 * 注册字段组件
 */
export function registerField(
  type: WorkflowFieldUIType | string,
  component: ComponentType<FieldRendererProps>,
) {
  fieldRegistry.set(type, component)
}

/**
 * 获取字段组件
 */
export function getFieldComponent(type: WorkflowFieldUIType | string) {
  const component = fieldRegistry.get(type)

  if (!component) {
    throw new Error(`Field "${type}" 未注册`)
  }

  return component
}
