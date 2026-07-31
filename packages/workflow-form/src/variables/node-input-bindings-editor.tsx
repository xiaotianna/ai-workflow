import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { Plus, Trash2 } from 'lucide-react'

import type { NodeVariableSectionRendererProps } from '../components/node-variable-section'
import { VariableValueEditor } from '../components/variable-value-editor'
import { getFieldError } from '../utils/get-field-error'
import { createUniqueKey } from '../utils/create-unique-key'

export function NodeInputBindingsEditor({
  section,
  inputs,
  availableVariables = [],
  inputErrors,
  disabled,
  onInputsChange,
}: NodeVariableSectionRendererProps) {
  const entries = Object.entries(inputs)

  function addInput() {
    const key = createUniqueKey(
      'input',
      entries.map(([inputKey]) => inputKey),
    )

    onInputsChange({
      ...inputs,
      [key]: {
        type: 'value',
        value: '',
      },
    })
  }

  function renameInput(index: number, previousKey: string, nextKey: string) {
    if (nextKey !== previousKey && Object.hasOwn(inputs, nextKey)) {
      return
    }

    onInputsChange(
      Object.fromEntries(
        entries.map(([key, value], entryIndex) =>
          entryIndex === index ? [nextKey, value] : [key, value],
        ),
      ),
    )
  }

  return (
    <Form.Field
      label={section.label}
      description={section.description}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          disabled={disabled}
          aria-label={`添加${section.label}`}
          onClick={addInput}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      }
    >
      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
          暂未配置{section.label}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value], index) => {
            const error = getFieldError(inputErrors, key)

            return (
              <div key={index} className="space-y-1">
                <div className="grid min-w-0 grid-cols-[minmax(96px,120px)_minmax(0,1fr)_24px] items-center gap-1.5">
                  <Input
                    className="h-8 text-[13px] md:text-[13px]"
                    value={key}
                    disabled={disabled}
                    aria-label={`${section.label}名称`}
                    aria-invalid={Boolean(error)}
                    placeholder="变量名"
                    onChange={(event) => renameInput(index, key, event.currentTarget.value)}
                  />
                  <VariableValueEditor
                    value={value}
                    availableVariables={availableVariables}
                    disabled={disabled}
                    error={error}
                    onChange={(nextValue) =>
                      onInputsChange({
                        ...inputs,
                        [key]: nextValue,
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                    disabled={disabled}
                    aria-label={`删除变量 ${key || index + 1}`}
                    onClick={() =>
                      onInputsChange(
                        Object.fromEntries(
                          entries.filter((_entry, entryIndex) => entryIndex !== index),
                        ),
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
      )}
    </Form.Field>
  )
}
