import type { FieldSchema } from '@ai-workflow/core'
import { cn } from '@ai-workflow/ui/lib/utils'

import type { AnyFieldRenderer } from '../contracts/field-renderer'
import { builtinFields } from '../fields'

export type NodeConfigFieldMap = Readonly<Record<string, FieldSchema>>
export type NodeConfigFieldValues = Readonly<Record<string, unknown>>
export type NodeConfigFieldErrors = Readonly<Record<string, string | undefined>>

export interface NodeConfigFieldsProps {
  className?: string
  disabled?: boolean
  errors?: NodeConfigFieldErrors
  fields: NodeConfigFieldMap
  values: NodeConfigFieldValues
  onChange: (name: string, value: unknown) => void
}

export function NodeConfigFields({
  className,
  disabled,
  errors,
  fields,
  values,
  onChange,
}: NodeConfigFieldsProps) {
  return (
    <div data-slot="node-config-fields" className={cn('space-y-3', className)}>
      {Object.entries(fields).map(([name, field]) => {
        const Renderer = builtinFields[field.ui] as AnyFieldRenderer

        return (
          <Renderer
            key={name}
            name={name}
            field={field}
            value={values[name]}
            error={errors?.[name]}
            disabled={disabled}
            onChange={(value) => onChange(name, value)}
          />
        )
      })}
    </div>
  )
}
