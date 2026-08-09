import type { AvailableVariableOption } from '@ai-workflow/form/components/node-variable-section'
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

import type { PluginHostFieldSchema } from '../contracts/field'

export interface PluginHostFieldRendererProps<TValue = unknown> {
  readonly name: string
  readonly field: PluginHostFieldSchema
  readonly value: TValue | undefined
  readonly error?: string
  readonly errors?: Readonly<Record<string, string | undefined>>
  readonly availableVariables?: readonly AvailableVariableOption[]
  readonly disabled?: boolean
  readonly onChange: (value: TValue | undefined) => void
}

export type PluginHostFieldRenderer<TValue = unknown> = ComponentType<
  PluginHostFieldRendererProps<TValue>
>

export interface WorkflowHostFieldRegistry {
  has(type: string): boolean
  get(type: string): PluginHostFieldRenderer | undefined
}

const HostFieldRegistryContext = createContext<WorkflowHostFieldRegistry | undefined>(undefined)

export interface HostFieldProviderProps {
  readonly registry: WorkflowHostFieldRegistry
  readonly children: ReactNode
}

export function HostFieldProvider({ registry, children }: HostFieldProviderProps) {
  return (
    <HostFieldRegistryContext.Provider value={registry}>
      {children}
    </HostFieldRegistryContext.Provider>
  )
}

export interface HostFieldProps<TValue = unknown> {
  readonly type: string
  readonly name: string
  readonly label?: string
  readonly description?: string
  readonly required?: boolean
  readonly value: TValue | undefined
  readonly error?: string
  readonly errors?: Readonly<Record<string, string | undefined>>
  readonly availableVariables?: readonly AvailableVariableOption[]
  readonly disabled?: boolean
  readonly onChange: (value: TValue | undefined) => void
}

export function HostField<TValue = unknown>({
  type,
  name,
  label = name,
  description,
  required,
  value,
  error,
  errors,
  availableVariables,
  disabled,
  onChange,
}: HostFieldProps<TValue>) {
  const registry = useContext(HostFieldRegistryContext)
  const Renderer = registry?.get(type)

  if (!Renderer) {
    return (
      <p className="text-destructive text-xs leading-4" role="alert">
        未注册宿主字段 renderer：{type}
      </p>
    )
  }

  return (
    <Renderer
      name={name}
      field={{ ui: type, host: true, label, description, required }}
      value={value}
      error={error ?? errors?.[name]}
      errors={errors}
      availableVariables={availableVariables}
      disabled={disabled}
      onChange={onChange as (value: unknown) => void}
    />
  )
}

export function createWorkflowHostFieldRegistry(
  renderers: Readonly<Record<string, PluginHostFieldRenderer | undefined>>,
): WorkflowHostFieldRegistry {
  const entries = Object.freeze(
    Object.fromEntries(
      Object.entries(renderers).filter(
        (entry): entry is [string, PluginHostFieldRenderer] => entry[1] !== undefined,
      ),
    ),
  )

  return Object.freeze({
    has: (type: string) => entries[type] !== undefined,
    get: (type: string) => entries[type],
  })
}
