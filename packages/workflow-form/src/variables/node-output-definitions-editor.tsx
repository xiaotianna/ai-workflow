import type { NodeOutputDefinition } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Trash2 } from 'lucide-react'

import { DataTypeSelect } from '../components/data-type-select'
import type { NodeVariableSectionRendererProps } from '../components/node-variable-section'
import { VariableSectionHeader } from '../components/variable-section-header'
import { getFieldError } from '../utils/get-field-error'
import { createUniqueKey } from '../utils/create-unique-key'

export function NodeOutputDefinitionsEditor({
  section,
  outputs,
  outputErrors,
  disabled,
  onOutputsChange,
}: NodeVariableSectionRendererProps) {
  function addOutput() {
    const key = createUniqueKey(
      'output',
      outputs.map((output) => output.key),
    )

    onOutputsChange([
      ...outputs,
      {
        key,
        label: key,
        dataType: 'string',
      },
    ])
  }

  function updateOutput(index: number, values: Partial<NodeOutputDefinition>) {
    onOutputsChange(
      outputs.map((output, outputIndex) =>
        outputIndex === index
          ? {
              ...output,
              ...values,
            }
          : output,
      ),
    )
  }

  return (
    <section className="space-y-3">
      <VariableSectionHeader
        label={section.label}
        description={section.description}
        disabled={disabled}
        onAdd={addOutput}
      />

      {outputs.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
          暂未配置{section.label}
        </p>
      ) : (
        <div className="space-y-2">
          {outputs.map((output, index) => {
            const keyError = getFieldError(outputErrors, `${index}.key`)
            const labelError = getFieldError(outputErrors, `${index}.label`)
            const dataTypeError = getFieldError(outputErrors, `${index}.dataType`)
            const descriptionError = getFieldError(outputErrors, `${index}.description`)

            return (
              <div
                key={index}
                className="border-border/60 space-y-2 rounded-lg border-[0.5px] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8"
                    value={output.key}
                    disabled={disabled}
                    aria-label={`${section.label} Key`}
                    aria-invalid={Boolean(keyError)}
                    placeholder="变量 Key"
                    onChange={(event) => updateOutput(index, { key: event.currentTarget.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                    disabled={disabled}
                    aria-label={`删除变量 ${output.key || index + 1}`}
                    onClick={() =>
                      onOutputsChange(
                        outputs.filter((_output, outputIndex) => outputIndex !== index),
                      )
                    }
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <Input
                    className="h-8"
                    value={output.label}
                    disabled={disabled}
                    aria-label={`${section.label}显示名称`}
                    aria-invalid={Boolean(labelError)}
                    placeholder="显示名称"
                    onChange={(event) => updateOutput(index, { label: event.currentTarget.value })}
                  />
                  <DataTypeSelect
                    value={output.dataType}
                    disabled={disabled}
                    size="sm"
                    aria-label={`${section.label}数据类型`}
                    aria-invalid={Boolean(dataTypeError)}
                    onValueChange={(dataType) => {
                      updateOutput(index, {
                        dataType,
                        defaultValue: undefined,
                      })
                    }}
                  />
                </div>

                <Input
                  className="h-8"
                  value={output.description ?? ''}
                  disabled={disabled}
                  aria-label={`${section.label}说明`}
                  aria-invalid={Boolean(descriptionError)}
                  placeholder="变量说明（可选）"
                  onChange={(event) =>
                    updateOutput(index, {
                      description: event.currentTarget.value,
                    })
                  }
                />

                {keyError || labelError || dataTypeError || descriptionError ? (
                  <p className="text-destructive text-xs leading-4">
                    {keyError ?? labelError ?? dataTypeError ?? descriptionError}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
