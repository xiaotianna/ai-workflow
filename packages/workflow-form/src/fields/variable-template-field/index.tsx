import type { VariableTemplateFieldSchema } from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'

import { VariableTemplateEditor } from '../../components/variable-template-editor'
import type { FieldRendererProps } from '../../contracts/field-renderer'

export type VariableTemplateFieldProps = FieldRendererProps<VariableTemplateFieldSchema, string>

export function VariableTemplateField({
  field,
  value,
  error,
  availableVariables = [],
  disabled = false,
  onChange,
}: VariableTemplateFieldProps) {
  const content = typeof value === 'string' ? value : ''

  return (
    <Form.Field label={field.label} description={field.description} required={field.required}>
      <VariableTemplateEditor
        value={content}
        availableVariables={availableVariables}
        header={
          <span className="text-muted-foreground text-xs font-semibold tracking-wide">
            {field.headerLabel}
          </span>
        }
        ariaLabel={field.label}
        variableButtonAriaLabel={`为${field.label}插入变量`}
        placeholder={field.placeholder ?? `输入${field.label}，或插入上游变量`}
        disabled={disabled}
        error={error}
        onChange={(nextValue) => onChange(nextValue)}
      />
    </Form.Field>
  )
}
