import type { NodeOutputDefinition } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ai-workflow/ui/components/dialog'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { cn } from '@ai-workflow/ui/lib/utils'
import { MessageSquareText, Plus, Trash2 } from 'lucide-react'

import { DataTypeSelect } from '../components/data-type-select'
import type { NodeVariableSectionRendererProps } from '../components/node-variable-section'
import { getFieldError } from '../utils/get-field-error'
import { createUniqueKey } from '../utils/create-unique-key'

export function NodeOutputDefinitionsEditor({
  section,
  outputs,
  fixedOutputs = [],
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

  function updateOutput(index: number, values: Partial<NodeOutputDefinition>) {
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
            const descriptionError = getFieldError(outputErrors, `${index}.description`)
            const error = keyError ?? labelError ?? dataTypeError ?? descriptionError

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

                      updateOutput(index, {
                        key,
                        label: key,
                      })
                    }}
                  />

                  <div className="bg-input flex min-w-0 rounded-md">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={cn(
                            'hover:border-input-focus hover:bg-background focus-visible:border-input-focus focus-visible:bg-background dark:hover:bg-background dark:focus-visible:bg-background h-8 w-9 shrink-0 rounded-r-none bg-transparent hover:z-10 focus-visible:z-10',
                            output.description ? 'text-primary' : 'text-muted-foreground',
                          )}
                          disabled={disabled || isFixed}
                          aria-label={`编辑变量 ${output.key || index + 1} 的说明`}
                          aria-invalid={Boolean(descriptionError)}
                        >
                          <MessageSquareText className="size-4" aria-hidden />
                        </Button>
                      </DialogTrigger>

                      <DialogContent aria-describedby={undefined}>
                        <DialogHeader>
                          <DialogTitle>编辑变量说明</DialogTitle>
                        </DialogHeader>

                        <Form.Field label="变量说明" error={descriptionError}>
                          <Textarea
                            value={output.description ?? ''}
                            disabled={disabled || isFixed}
                            aria-label={`${section.label}说明`}
                            aria-invalid={Boolean(descriptionError)}
                            placeholder="填写该变量的用途或返回内容"
                            className="min-h-24 resize-none"
                            onChange={(event) =>
                              updateOutput(index, {
                                description: event.currentTarget.value || undefined,
                              })
                            }
                          />
                        </Form.Field>

                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="secondary">
                              完成
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <DataTypeSelect
                      value={output.dataType}
                      disabled={disabled || isFixed}
                      size="sm"
                      className="min-w-0 flex-1 rounded-l-none bg-transparent text-[13px] hover:z-10 focus-visible:z-10"
                      contentAlign="end"
                      contentClassName="w-[calc(var(--radix-select-trigger-width)+2.25rem)]"
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

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive focus-visible:text-destructive"
                    disabled={disabled || isFixed}
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
