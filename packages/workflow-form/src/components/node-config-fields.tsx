import type { FieldSchema } from '@ai-workflow/core'
import { cn } from '@ai-workflow/ui/lib/utils'

import type { AvailableVariableOption } from '../contracts/available-variable-option'
import type { AnyFieldRenderer, FieldRendererErrors } from '../contracts/field-renderer'
import { builtinFields } from '../fields'
import { getFieldError } from '../utils/get-field-error'

export type NodeConfigFieldMap = Readonly<Record<string, FieldSchema>>
export type NodeConfigFieldValues = Readonly<Record<string, unknown>>
export type NodeConfigFieldErrors = FieldRendererErrors
export type NodeConfigFieldRendererMap = Readonly<Record<string, AnyFieldRenderer | undefined>>

export interface NodeConfigFieldsProps {
  className?: string
  availableVariables?: readonly AvailableVariableOption[]
  disabled?: boolean
  errors?: NodeConfigFieldErrors
  fields: NodeConfigFieldMap
  renderers?: NodeConfigFieldRendererMap
  values: NodeConfigFieldValues
  onChange: (name: string, value: unknown) => void
}

export function NodeConfigFields({
  className,
  availableVariables,
  disabled,
  errors,
  fields,
  renderers,
  values,
  onChange,
}: NodeConfigFieldsProps) {
  return (
    <div data-slot="node-config-fields" className={cn('space-y-3', className)}>
      {Object.entries(fields).map(([name, field]) => {
        const Renderer = renderers?.[field.ui] ?? (builtinFields[field.ui] as AnyFieldRenderer)

        if (!Renderer) {
          return (
            <p key={name} className="text-destructive text-xs leading-4">
              未注册字段 renderer：{field.ui}
            </p>
          )
        }

        return (
          <Renderer
            key={name}
            name={name}
            field={field}
            value={values[name]}
            error={getFieldError(errors, name)}
            errors={errors}
            availableVariables={availableVariables}
            disabled={disabled}
            onChange={(value) => onChange(name, value)}
          />
        )
      })}
    </div>
  )
}
