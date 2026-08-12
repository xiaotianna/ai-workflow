import type { StudioWorkflowTestRunDto } from '@/api/studio'
import {
  BuiltinNodeType,
  DATA_TYPE_KINDS,
  type NodeOutputDefinition,
  type WorkflowNode,
} from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import {
  validateFormByZod,
  type ZodFormErrors,
} from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { CodeEditor } from '@ai-workflow/ui/components/code-editor'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { Switch } from '@ai-workflow/ui/components/switch'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'

import { WorkflowRunTabs, type WorkflowRunPanelTab } from './workflow-run-tabs'

type TestRunInputForm = Record<string, unknown>

interface WorkflowTestRunPanelContentProps {
  nodes: readonly WorkflowNode[]
  pausing: boolean
  pending: boolean
  result?: StudioWorkflowTestRunDto
  onPause: () => void
  onRun: (input: Record<string, unknown>) => void
}

export function WorkflowTestRunPanelContent({
  nodes,
  pausing,
  pending,
  result,
  onPause,
  onRun,
}: WorkflowTestRunPanelContentProps) {
  const [activeTab, setActiveTab] = useState<WorkflowRunPanelTab>('input'),
    wasPendingRef = useRef(false),
    startNode = nodes.find((node) => node.type === BuiltinNodeType.START),
    inputDefinitions = startNode?.outputs ?? []

  useEffect(() => {
    const wasPending = wasPendingRef.current
    wasPendingRef.current = pending

    if (pending && !wasPending) {
      setActiveTab('trace')
      return
    }

    if (!pending && wasPending) setActiveTab(result ? 'result' : 'input')
  }, [pending, result])

  return (
    <WorkflowRunTabs
      ariaLabel="测试运行内容"
      nodes={nodes}
      pending={pending}
      run={result}
      value={activeTab}
      onValueChange={setActiveTab}
      input={
        <TestRunInputForm
          definitions={inputDefinitions}
          pausing={pausing}
          pending={pending}
          onPause={onPause}
          onRun={onRun}
        />
      }
    />
  )
}

interface TestRunInputFormProps {
  definitions: readonly NodeOutputDefinition[]
  pausing: boolean
  pending: boolean
  onPause: () => void
  onRun: (input: Record<string, unknown>) => void
}

function TestRunInputForm({
  definitions,
  pausing,
  pending,
  onPause,
  onRun,
}: TestRunInputFormProps) {
  const initialValues = useMemo(() => createInitialInputValues(definitions), [definitions]),
    inputSchema = useMemo(() => createTestRunInputSchema(definitions), [definitions]),
    [errors, setErrors] = useState<ZodFormErrors>({}),
    { form, updateFormField } = useFormData<TestRunInputForm>(initialValues)

  function updateField(key: string, value: unknown) {
    updateFormField(key, value)
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateFormByZod(inputSchema, form)
    setErrors(validation.errors)
    if (!validation.success) return
    onRun(validation.data)
  }

  return (
    <Form className="space-y-3 px-4 py-3" onSubmit={handleSubmit}>
      {definitions.length > 0 ? (
        definitions.map((definition) => (
          <TestRunInputField
            key={definition.key}
            definition={definition}
            error={errors[definition.key]}
            value={form[definition.key]}
            disabled={pending}
            onChange={(value) => updateField(definition.key, value)}
          />
        ))
      ) : (
        <div className="bg-muted/40 rounded-lg px-3 py-6 text-center">
          <p className="text-foreground text-[13px] font-medium">当前工作流无需输入参数</p>
          <p className="text-muted-foreground mt-1 text-xs">可以直接开始测试运行</p>
        </div>
      )}

      {pending ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={pausing}
          onClick={onPause}
        >
          {pausing ? '暂停中' : '暂停运行'}
        </Button>
      ) : (
        <Button type="submit" variant="confirm" size="sm" className="w-full">
          开始运行
        </Button>
      )}
    </Form>
  )
}

interface TestRunInputFieldProps {
  definition: NodeOutputDefinition
  disabled: boolean
  error?: string
  value: unknown
  onChange: (value: unknown) => void
}

function TestRunInputField({
  definition,
  disabled,
  error,
  value,
  onChange,
}: TestRunInputFieldProps) {
  const label = definition.label || definition.key,
    commonProps = {
      'aria-invalid': Boolean(error),
      disabled,
    }

  return (
    <Form.Field
      label={label}
      required={definition.required === true}
      description={definition.description}
      error={error}
    >
      {definition.dataType === DATA_TYPE_KINDS.BOOLEAN ? (
        <div className="bg-input flex h-9 items-center justify-between rounded-md px-2.5">
          <span className="text-muted-foreground text-[13px]">{value === true ? '是' : '否'}</span>
          <Switch
            {...commonProps}
            aria-label={label}
            checked={value === true}
            onCheckedChange={onChange}
          />
        </div>
      ) : definition.dataType === DATA_TYPE_KINDS.JSON ? (
        <div
          role="group"
          data-disabled={disabled}
          aria-disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-label={label}
          className={cn(
            'bg-input hover:border-input-focus focus-within:border-input-focus aria-invalid:border-destructive dark:aria-invalid:border-destructive/70 flex h-40 w-full flex-col overflow-hidden rounded-lg border border-transparent transition-[border-color] outline-none',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <div className="border-border/50 flex h-9 shrink-0 items-center border-b px-3">
            <span className="text-foreground text-xs font-semibold tracking-wide">JSON</span>
          </div>
          <CodeEditor
            aria-label={label}
            className="min-h-0 flex-1"
            disabled={disabled}
            language="json"
            value={typeof value === 'string' ? value : ''}
            options={{ formatOnPaste: false, formatOnType: false }}
            onChange={onChange}
          />
        </div>
      ) : (
        <Input
          {...commonProps}
          aria-label={label}
          type={definition.dataType === DATA_TYPE_KINDS.NUMBER ? 'number' : 'text'}
          value={typeof value === 'string' || typeof value === 'number' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Form.Field>
  )
}

function createInitialInputValues(definitions: readonly NodeOutputDefinition[]): TestRunInputForm {
  return Object.fromEntries(
    definitions.map((definition) => {
      if (definition.defaultValue !== undefined) {
        if (definition.dataType === DATA_TYPE_KINDS.JSON) {
          return [definition.key, JSON.stringify(definition.defaultValue, null, 2)]
        }
        return [definition.key, definition.defaultValue]
      }

      return [definition.key, definition.dataType === DATA_TYPE_KINDS.BOOLEAN ? false : '']
    }),
  )
}

function createTestRunInputSchema(definitions: readonly NodeOutputDefinition[]) {
  return z
    .record(z.string(), z.unknown())
    .superRefine((values, context) => {
      for (const definition of definitions) {
        const value = values[definition.key],
          empty = value === undefined || value === null || value === ''

        if (definition.required === true && empty) {
          context.addIssue({
            code: 'custom',
            message: `${definition.label || definition.key}不能为空`,
            path: [definition.key],
          })
          continue
        }

        if (empty) continue

        if (
          definition.dataType === DATA_TYPE_KINDS.NUMBER &&
          (typeof value !== 'number' || !Number.isFinite(value)) &&
          (typeof value !== 'string' || !Number.isFinite(Number(value)))
        ) {
          context.addIssue({
            code: 'custom',
            message: '请输入有效数字',
            path: [definition.key],
          })
        }

        if (definition.dataType === DATA_TYPE_KINDS.JSON && typeof value === 'string') {
          try {
            JSON.parse(value)
          } catch {
            context.addIssue({
              code: 'custom',
              message: '请输入有效 JSON',
              path: [definition.key],
            })
          }
        }
      }
    })
    .transform((values) => {
      const parsed: Record<string, unknown> = {}

      for (const definition of definitions) {
        const value = values[definition.key]
        if (value === undefined || value === null || value === '') continue

        parsed[definition.key] =
          definition.dataType === DATA_TYPE_KINDS.NUMBER
            ? Number(value)
            : definition.dataType === DATA_TYPE_KINDS.JSON && typeof value === 'string'
              ? JSON.parse(value)
              : value
      }

      return parsed
    })
}
