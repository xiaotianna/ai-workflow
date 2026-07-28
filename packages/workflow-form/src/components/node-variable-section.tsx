import {
  DATA_TYPE_VALUES,
  NODE_VARIABLE_RENDERER_TYPES,
  type DataType,
  type NodeInputBindingsInput,
  type NodeOutputDefinition,
  type NodeVariableFormSection,
  type VariableReference,
  type VariableValueInput,
} from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Plus, Trash2 } from 'lucide-react'
import type { ComponentType } from 'react'

export interface AvailableVariableOption {
  id: string
  label: string
  reference: VariableReference
}

export type NodeVariableFieldErrors = Readonly<Record<string, string | undefined>>
export type NodeInputBindingsFormValue = Exclude<NodeInputBindingsInput, undefined>

export interface NodeVariableSectionRendererProps {
  section: NodeVariableFormSection
  inputs: NodeInputBindingsFormValue
  outputs: readonly NodeOutputDefinition[]
  availableVariables?: readonly AvailableVariableOption[]
  inputErrors?: NodeVariableFieldErrors
  outputErrors?: NodeVariableFieldErrors
  disabled?: boolean
  onInputsChange: (inputs: NodeInputBindingsFormValue) => void
  onOutputsChange: (outputs: NodeOutputDefinition[]) => void
}

export type NodeVariableSectionRenderer = ComponentType<NodeVariableSectionRendererProps>
export type NodeVariableRendererMap = Readonly<Record<string, NodeVariableSectionRenderer>>

export interface NodeVariableSectionProps extends NodeVariableSectionRendererProps {
  renderers?: NodeVariableRendererMap
}

const DATA_TYPE_LABELS = {
  string: '字符串',
  number: '数字',
  boolean: '布尔值',
  json: 'JSON',
} satisfies Record<DataType, string>

function createUniqueKey(prefix: string, keys: readonly string[]) {
  const usedKeys = new Set(keys)
  let index = 1
  let key = prefix

  while (usedKeys.has(key)) {
    index += 1
    key = `${prefix}${index}`
  }

  return key
}

function getFieldError(errors: NodeVariableFieldErrors | undefined, path: string) {
  if (!errors) return undefined

  const matchingEntry = Object.entries(errors).find(
    ([errorPath]) => errorPath === path || errorPath.startsWith(`${path}.`),
  )

  return matchingEntry?.[1]
}

function stringifyDirectValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function referencesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function VariableSectionHeader({
  label,
  description,
  disabled,
  onAdd,
}: {
  label: string
  description?: string
  disabled?: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-medium">{label}</h3>
        {description ? (
          <p className="text-muted-foreground mt-1 text-xs leading-4">{description}</p>
        ) : null}
      </div>
      <Button type="button" variant="secondary" size="xs" disabled={disabled} onClick={onAdd}>
        <Plus aria-hidden />
        添加变量
      </Button>
    </div>
  )
}

function VariableValueEditor({
  value,
  availableVariables,
  disabled,
  error,
  onChange,
}: {
  value: VariableValueInput
  availableVariables: readonly AvailableVariableOption[]
  disabled?: boolean
  error?: string
  onChange: (value: VariableValueInput) => void
}) {
  const selectedVariable = availableVariables.find(
    (option) => value.type === 'reference' && referencesEqual(option.reference, value.reference),
  )

  return (
    <div className="grid min-w-0 grid-cols-[104px_minmax(0,1fr)] gap-2">
      <Select
        value={value.type}
        disabled={disabled}
        onValueChange={(nextType) => {
          if (nextType === 'value') {
            onChange({ type: 'value', value: '' })
            return
          }

          const firstVariable = availableVariables[0]
          if (firstVariable) {
            onChange({
              type: 'reference',
              reference: firstVariable.reference,
            })
          }
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-full"
          aria-label="变量取值方式"
          aria-invalid={Boolean(error)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={4}
          className="w-(--radix-select-trigger-width)"
        >
          <SelectItem value="value">直接值</SelectItem>
          <SelectItem value="reference" disabled={availableVariables.length === 0}>
            变量引用
          </SelectItem>
        </SelectContent>
      </Select>

      {value.type === 'value' ? (
        <Input
          className="h-8"
          value={stringifyDirectValue(value.value)}
          disabled={disabled}
          aria-label="变量直接值"
          aria-invalid={Boolean(error)}
          onChange={(event) =>
            onChange({
              type: 'value',
              value: event.currentTarget.value,
            })
          }
        />
      ) : (
        <Select
          value={selectedVariable?.id}
          disabled={disabled || availableVariables.length === 0}
          onValueChange={(optionId) => {
            const option = availableVariables.find((candidate) => candidate.id === optionId)
            if (!option) return

            onChange({
              type: 'reference',
              reference: option.reference,
            })
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-full"
            aria-label="上游变量"
            aria-invalid={Boolean(error)}
          >
            <SelectValue
              placeholder={availableVariables.length > 0 ? '请选择上游变量' : '无可用上游变量'}
            />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="start"
            sideOffset={4}
            className="w-(--radix-select-trigger-width)"
          >
            {availableVariables.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

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
    <section className="space-y-3">
      <VariableSectionHeader
        label={section.label}
        description={section.description}
        disabled={disabled}
        onAdd={addInput}
      />

      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
          暂未配置{section.label}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value], index) => {
            const error = getFieldError(inputErrors, key)

            return (
              <div
                key={index}
                className="border-border/60 space-y-2 rounded-lg border-[0.5px] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8"
                    value={key}
                    disabled={disabled}
                    aria-label={`${section.label}名称`}
                    aria-invalid={Boolean(error)}
                    placeholder="变量 Key"
                    onChange={(event) => renameInput(index, key, event.currentTarget.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
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
                    <Trash2 aria-hidden />
                  </Button>
                </div>

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

                {error ? <p className="text-destructive text-xs leading-4">{error}</p> : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

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

export const builtinNodeVariableRenderers: NodeVariableRendererMap = {
  [NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS]: NodeInputBindingsEditor,
  [NODE_VARIABLE_RENDERER_TYPES.OUTPUT_DEFINITIONS]: NodeOutputDefinitionsEditor,
}

export function NodeVariableSection({ section, renderers, ...props }: NodeVariableSectionProps) {
  const Renderer = renderers?.[section.renderer] ?? builtinNodeVariableRenderers[section.renderer]

  if (!Renderer) {
    return (
      <p className="text-destructive text-xs leading-4">
        未注册节点变量 renderer：{section.renderer}
      </p>
    )
  }

  return <Renderer section={section} {...props} />
}
