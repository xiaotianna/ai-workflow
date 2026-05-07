import type { ComponentType } from 'react'

export interface FieldComponentProps {
  field: any

  value: any

  onChange: (value: any) => void
}

const fieldRegistry = new Map<string, ComponentType<FieldComponentProps>>()

export function registerField(type: string, component: ComponentType<FieldComponentProps>) {
  fieldRegistry.set(type, component)
}

export function getField(type: string) {
  const field = fieldRegistry.get(type)

  if (!field) {
    throw new Error(`Field "${type}" 未注册`)
  }

  return field
}
