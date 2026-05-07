import {
  DATA_TYPE_OPTIONS,
  WorkflowDataTypeKind,
  WorkflowVariableDefinition,
} from '@ai-workflow/core'
import { FieldRendererProps } from '../registry'
import { Plus, Trash2 } from 'lucide-react'

export const SchemaEditorField = ({ field, value, onChange }: FieldRendererProps) => {
  const variables = (value as WorkflowVariableDefinition[]) ?? []

  function updateVariable(index: number, next: WorkflowVariableDefinition) {
    const nextVariables = [...variables]

    nextVariables[index] = next

    onChange(nextVariables)
  }

  function removeVariable(index: number) {
    const nextVariables = variables.filter((_, i) => i !== index)

    onChange(nextVariables)
  }

  function addVariable() {
    onChange([
      ...variables,
      {
        name: '',

        description: '',

        required: false,

        dataType: {
          kind: WorkflowDataTypeKind.STRING,
        },
      },
    ])
  }

  return (
    <div className="space-y-3">
      {/* Label */}
      <div>
        <div className="text-sm font-medium">{field.label}</div>

        {field.description && (
          <div className="text-muted-foreground mt-1 text-xs">{field.description}</div>
        )}
      </div>

      {/* Variables */}
      <div className="space-y-3">
        {variables.map((variable, index) => (
          <div key={index} className="rounded-lg border p-3">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">Variable #{index + 1}</div>

              <button
                type="button"
                onClick={() => removeVariable(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3">
              {/* Name */}
              <div>
                <div className="mb-1 text-xs font-medium">Name</div>

                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={variable.name}
                  onChange={(e) =>
                    updateVariable(index, {
                      ...variable,
                      name: e.target.value,
                    })
                  }
                  placeholder="question"
                />
              </div>

              {/* Description */}
              <div>
                <div className="mb-1 text-xs font-medium">Description</div>

                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={variable.description ?? ''}
                  onChange={(e) =>
                    updateVariable(index, {
                      ...variable,
                      description: e.target.value,
                    })
                  }
                  placeholder="用户输入的问题"
                />
              </div>

              {/* Type */}
              <div>
                <div className="mb-1 text-xs font-medium">Type</div>

                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={variable.dataType.kind}
                  onChange={(e) =>
                    updateVariable(index, {
                      ...variable,
                      dataType: {
                        kind: e.target.value as WorkflowDataTypeKind,
                      },
                    })
                  }
                >
                  {DATA_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={variable.required ?? false}
                  onChange={(e) =>
                    updateVariable(index, {
                      ...variable,
                      required: e.target.checked,
                    })
                  }
                />
                Required
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={addVariable}
        className="hover:bg-muted/50 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-sm"
      >
        <Plus className="size-4" />
        Add Variable
      </button>
    </div>
  )
}
