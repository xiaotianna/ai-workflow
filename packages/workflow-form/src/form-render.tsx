import type { NodeDefinition } from '@ai-workflow/core'
import { RenderFieldComponent } from './register-builtin-fields'

interface FormRenderProps {
  definition: NodeDefinition
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export const FormRender = ({ definition, value, onChange }: FormRenderProps) => (
  <div className="space-y-3">
    {Object.entries(definition.form ?? {}).map(([fieldKey, field]) => {
      const uiType = field.ui
      if (!uiType) {
        return (
          <div key={fieldKey} className="text-destructive text-sm">
            字段 {fieldKey} 缺少 ui 配置
          </div>
        )
      }

      const FieldComponent = RenderFieldComponent[uiType]
      if (!FieldComponent) {
        return (
          <div key={fieldKey} className="text-destructive text-sm">
            字段 {fieldKey} 未找到对应渲染组件: {String(uiType)}
          </div>
        )
      }

      return (
        <FieldComponent
          key={fieldKey}
          fieldKey={fieldKey}
          field={field}
          value={value[fieldKey]}
          onChange={(nextValue: unknown) =>
            onChange({
              ...value,
              [fieldKey]: nextValue,
            })
          }
        />
      )
    })}
  </div>
)
