import { DATA_TYPE_VALUES, type DataType, type NodeOutputDefinition } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Trash2 } from 'lucide-react'

import type { NodeVariableSectionRendererProps } from '../components/node-variable-section'
import { VariableSectionHeader } from '../components/variable-section-header'
import { getFieldError } from '../utils/get-field-error'
import { createUniqueKey } from '../utils/create-unique-key'

const DATA_TYPE_LABELS = {
  string: '字符串',
  number: '数字',
  boolean: '布尔值',
  json: 'JSON',
} satisfies Record<DataType, string>

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

                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_104px] gap-2">
                  <Input
                    className="h-8"
                    value={output.label}
                    disabled={disabled}
                    aria-label={`${section.label}显示名称`}
                    aria-invalid={Boolean(labelError)}
                    placeholder="显示名称"
                    onChange={(event) => updateOutput(index, { label: event.currentTarget.value })}
                  />
                  <Select
                    value={output.dataType}
                    disabled={disabled}
                    onValueChange={(dataType) => {
                      const nextDataType = DATA_TYPE_VALUES.find(
                        (candidate) => candidate === dataType,
                      )

                      if (nextDataType) {
                        updateOutput(index, {
                          dataType: nextDataType,
                        })
                      }
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full"
                      aria-label={`${section.label}数据类型`}
                      aria-invalid={Boolean(dataTypeError)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      align="start"
                      sideOffset={4}
                      className="w-(--radix-select-trigger-width)"
                    >
                      {DATA_TYPE_VALUES.map((dataType) => (
                        <SelectItem key={dataType} value={dataType}>
                          {DATA_TYPE_LABELS[dataType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
