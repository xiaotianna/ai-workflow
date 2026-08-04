import type { NodeOutputDefinition, VariableValueInput } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { Plus, Trash2 } from 'lucide-react'

import type { AvailableVariableOption } from '../contracts/available-variable-option'
import type { NodeVariableSectionRendererProps } from '../components/node-variable-section'
import { VariableValueEditor } from '../components/variable-value-editor'
import { getFieldError } from '../utils/get-field-error'
import { createUniqueKey } from '../utils/create-unique-key'

const EMPTY_OUTPUT_VALUE = {
  type: 'value',
  value: '',
} as const satisfies VariableValueInput

function referencesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function getReferencedVariable(
  value: VariableValueInput,
  availableVariables: readonly AvailableVariableOption[],
) {
  if (value.type !== 'reference') return undefined

  return availableVariables.find((option) => referencesEqual(option.reference, value.reference))
}

export function NodeOutputDefinitionsEditor({
  section,
  outputs,
  fixedOutputs = [],
  availableVariables = [],
  outputErrors,
  disabled,
  onOutputsChange,
}: NodeVariableSectionRendererProps) {
  const fixedOutputKeys = new Set(fixedOutputs.map((output) => output.key))

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

  function updateOutputDefinition(index: number, values: Partial<NodeOutputDefinition>) {
    if (fixedOutputKeys.has(outputs[index]?.key ?? '')) return

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

  function updateOutputValue(index: number, value: VariableValueInput) {
    const output = outputs[index]
    if (!output) return

    const isFixed = fixedOutputKeys.has(output.key)
    const isEmptyDirectValue = value.type === 'value' && value.value === ''
    const referencedVariable = getReferencedVariable(value, availableVariables)
    const nextOutput: NodeOutputDefinition = {
      ...output,
      ...(!isFixed
        ? {
            dataType: referencedVariable?.dataType ?? 'string',
            defaultValue: undefined,
          }
        : {}),
      ...(isEmptyDirectValue ? {} : { value }),
    }

    if (isEmptyDirectValue) delete nextOutput.value

    onOutputsChange(
      outputs.map((currentOutput, outputIndex) =>
        outputIndex === index ? nextOutput : currentOutput,
      ),
    )
  }

  return (
    <Form.Field
      label={section.label}
      description={section.description ?? '新增输出可直接填写或引用上游变量；内置输出由节点返回'}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          disabled={disabled}
          aria-label={`添加${section.label}`}
          onClick={addOutput}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      }
    >
      {outputs.length > 0 ? (
        <div className="space-y-2">
          {outputs.map((output, index) => {
            const isFixed = fixedOutputKeys.has(output.key)
            const keyError = getFieldError(outputErrors, `${index}.key`)
            const labelError = getFieldError(outputErrors, `${index}.label`)
            const dataTypeError = getFieldError(outputErrors, `${index}.dataType`)
            const valueError = getFieldError(outputErrors, `${index}.value`)
            const error = keyError ?? labelError ?? dataTypeError ?? valueError

            if (isFixed) {
              return (
                <div key={index} className="space-y-1">
                  <Input
                    className="h-8 w-full max-w-30 text-[13px] md:text-[13px]"
                    value={output.key}
                    disabled
                    aria-label={`${section.label}名称（内置）`}
                    aria-invalid={Boolean(error)}
                  />

                  {error ? <p className="text-destructive text-xs leading-4">{error}</p> : null}
                </div>
              )
            }

            return (
              <div key={index} className="space-y-1">
                <div className="grid min-w-0 grid-cols-[minmax(96px,120px)_minmax(0,1fr)_24px] items-center gap-1.5">
                  <Input
                    className="h-8 text-[13px] md:text-[13px]"
                    value={output.key}
                    disabled={disabled || isFixed}
                    aria-label={`${section.label}名称`}
                    aria-invalid={Boolean(keyError ?? labelError)}
                    placeholder="变量名"
                    onChange={(event) => {
                      const key = event.currentTarget.value

                      updateOutputDefinition(index, {
                        key,
                        label: key,
                      })
                    }}
                  />

                  <VariableValueEditor
                    value={output.value ?? EMPTY_OUTPUT_VALUE}
                    availableVariables={availableVariables}
                    disabled={disabled}
                    error={valueError ?? dataTypeError}
                    label={`输出变量 ${output.key || index + 1} 的值`}
                    placeholder="设置输出值"
                    onChange={(value) => updateOutputValue(index, value)}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                    disabled={disabled}
                    aria-label={`删除变量 ${output.key || index + 1}`}
                    onClick={() =>
                      onOutputsChange(
                        outputs.filter((_output, outputIndex) => outputIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>

                {error ? <p className="text-destructive text-xs leading-4">{error}</p> : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </Form.Field>
  )
}
