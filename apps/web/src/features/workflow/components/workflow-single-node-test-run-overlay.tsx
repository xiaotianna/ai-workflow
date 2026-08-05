import { DATA_TYPE_KINDS, type NodeOutputDefinition, type WorkflowNode } from '@ai-workflow/core'
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
import { LoaderCircle, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'

import { createSingleNodeTestRunInputDefinitions } from '../utils/single-node-test-run-inputs'

interface WorkflowSingleNodeTestRunOverlayProps {
  node: WorkflowNode
  nodeLabel: string
  pausing: boolean
  pending: boolean
  onClose: () => void
  onPause: () => void
  onRun: (input: Record<string, unknown>) => void
}

type SingleNodeTestRunForm = Record<string, unknown>

export function WorkflowSingleNodeTestRunOverlay({
  node,
  nodeLabel,
  pausing,
  pending,
  onClose,
  onPause,
  onRun,
}: WorkflowSingleNodeTestRunOverlayProps) {
  const definitions = useMemo(() => createSingleNodeTestRunInputDefinitions(node), [node])
  const initialValues = useMemo(() => createInitialInputValues(definitions), [definitions])
  const inputSchema = useMemo(() => createSingleNodeInputSchema(definitions), [definitions])
  const [errors, setErrors] = useState<ZodFormErrors>({})
  const { form, updateFormField } = useFormData<SingleNodeTestRunForm>(initialValues)

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
    if (pending) return

    const validation = validateFormByZod(inputSchema, form)
    setErrors(validation.errors)
    if (!validation.success) return
    onRun(validation.data)
  }

  return (
    <div className="bg-background absolute inset-0 z-20 flex flex-col overflow-hidden rounded-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="text-foreground truncate text-sm font-semibold">测试运行 {nodeLabel}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground shrink-0"
          aria-label="关闭单节点测试运行"
          onClick={onClose}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </header>

      <Form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {definitions.length > 0 ? (
            definitions.map((definition) => (
              <SingleNodeInputField
                key={definition.key}
                definition={definition}
                disabled={pending}
                error={errors[definition.key]}
                value={form[definition.key]}
                onChange={(value) => updateField(definition.key, value)}
              />
            ))
          ) : (
            <div className="bg-muted/40 rounded-lg px-3 py-6 text-center">
              <p className="text-foreground text-[13px] font-medium">当前节点无需输入参数</p>
              <p className="text-muted-foreground mt-1 text-xs">可以直接开始单节点运行</p>
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 pt-1 pb-4">
          {pending ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={pausing}
              onClick={onPause}
            >
              {pausing ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                  暂停中
                </>
              ) : (
                '暂停运行'
              )}
            </Button>
          ) : (
            <Button type="submit" variant="confirm" size="sm" className="w-full">
              开始运行
            </Button>
          )}
        </div>
      </Form>
    </div>
  )
}

interface SingleNodeInputFieldProps {
  definition: NodeOutputDefinition
  disabled: boolean
  error?: string
  value: unknown
  onChange: (value: unknown) => void
}

function SingleNodeInputField({
  definition,
  disabled,
  error,
  value,
  onChange,
}: SingleNodeInputFieldProps) {
  const label = definition.label || definition.key
  const commonProps = {
    'aria-invalid': Boolean(error),
    disabled,
  }

  return (
    <Form.Field label={label} required error={error}>
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

function createInitialInputValues(
  definitions: readonly NodeOutputDefinition[],
): SingleNodeTestRunForm {
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

function createSingleNodeInputSchema(definitions: readonly NodeOutputDefinition[]) {
  return z
    .record(z.string(), z.unknown())
    .superRefine((values, context) => {
      for (const definition of definitions) {
        const value = values[definition.key]
        const empty = value === undefined || value === null || value === ''

        if (empty) {
          context.addIssue({
            code: 'custom',
            message: `${definition.label || definition.key}不能为空`,
            path: [definition.key],
          })
          continue
        }

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
