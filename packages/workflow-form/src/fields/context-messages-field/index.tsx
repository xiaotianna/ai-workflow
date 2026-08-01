import {
  LLM_CONTEXT_MESSAGE_ROLE_VALUES,
  SYSTEM_VARIABLE_NAMESPACE,
  llmNodeSchema,
  type ContextMessagesFieldSchema,
  type LlmContextMessageInput,
  type LlmContextMessageRole,
  type VariableReference,
} from '@ai-workflow/core'
import { generateUuid } from '@ai-workflow/shared/utils/uuid'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapEditorToken,
} from '@ai-workflow/ui/components/tiptap-editor'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useRef } from 'react'

import { NodeVariablePicker } from '../../variables/node-variable-picker'
import type { FieldRendererProps } from '../../contracts/field-renderer'
import { getFieldError } from '../../utils/get-field-error'

const CONTEXT_ROLE_LABELS = {
  system: 'SYSTEM',
  assistant: 'ASSISTANT',
  user: 'USER',
} satisfies Record<LlmContextMessageRole, string>

export type ContextMessagesFieldValue = LlmContextMessageInput[]

export type ContextMessagesFieldProps = FieldRendererProps<
  ContextMessagesFieldSchema,
  ContextMessagesFieldValue
>

function isContextMessage(value: unknown): value is LlmContextMessageInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const message = value as Record<string, unknown>

  return (
    typeof message.id === 'string' &&
    typeof message.content === 'string' &&
    typeof message.role === 'string' &&
    LLM_CONTEXT_MESSAGE_ROLE_VALUES.includes(message.role as LlmContextMessageRole)
  )
}

function getContextMessages(value: unknown): LlmContextMessageInput[] {
  if (Array.isArray(value)) return value.filter(isContextMessage)

  return llmNodeSchema.parse({}).messages
}

function serializeVariableReference(reference: VariableReference): string {
  const path = reference.path.length > 0 ? `.${reference.path.join('.')}` : ''

  if (reference.scope === 'node') {
    return `{{#${reference.nodeId}.${reference.outputKey}${path}#}}`
  }

  if (reference.scope === 'system') {
    return `{{#${SYSTEM_VARIABLE_NAMESPACE}.${reference.key}${path}#}}`
  }

  return `{{#env.${reference.variableId}${path}#}}`
}

function createEditorTokens(
  availableVariables: NonNullable<ContextMessagesFieldProps['availableVariables']>,
): TiptapEditorToken[] {
  return availableVariables.map((option) => ({
    id: option.id,
    label: `${option.sourceLabel}.${option.variableName}`,
    value: serializeVariableReference(option.reference),
  }))
}

function getContextMessagesFieldError(errors: ContextMessagesFieldProps['errors'], name: string) {
  const directError = errors?.[name]
  if (directError) return directError

  const fieldPrefix = `${name}.`
  const matchingEntry = Object.entries(errors ?? {}).find(([errorPath]) => {
    if (!errorPath.startsWith(fieldPrefix)) return false

    const [, nestedField] = errorPath.slice(fieldPrefix.length).split('.')

    return nestedField !== 'content'
  })

  return matchingEntry?.[1]
}

export function ContextMessagesField({
  name,
  field,
  value,
  errors,
  availableVariables = [],
  disabled = false,
  onChange,
}: ContextMessagesFieldProps) {
  const editorRefs = useRef(new Map<string, TiptapEditorHandle>())
  const messages = getContextMessages(value)
  const editorTokens = createEditorTokens(availableVariables)
  const fieldError = getContextMessagesFieldError(errors, name)

  function updateMessage(index: number, nextMessage: LlmContextMessageInput) {
    onChange(
      messages.map((message, messageIndex) => (messageIndex === index ? nextMessage : message)),
    )
  }

  function insertVariable(messageId: string, option: (typeof availableVariables)[number]) {
    editorRefs.current.get(messageId)?.insertToken({
      id: option.id,
      label: `${option.sourceLabel}.${option.variableName}`,
      value: serializeVariableReference(option.reference),
    })
  }

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={fieldError}
      required={field.required}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          disabled={disabled}
          aria-label={`添加${field.label}消息`}
          onClick={() =>
            onChange([
              ...messages,
              {
                id: generateUuid(),
                role: 'user',
                content: '',
              },
            ])
          }
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      }
    >
      <MotionConfig reducedMotion="user">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const contentError = getFieldError(errors, `${name}.${index}.content`)
              const messageLabel = `第 ${index + 1} 条${field.label}`

              return (
                <motion.div
                  layout="position"
                  key={message.id}
                  initial={{ height: 0, opacity: 0, y: -4 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div
                    className={cn(
                      'group/context-message bg-input relative isolate overflow-hidden rounded-lg p-px transition-colors duration-200',
                      contentError
                        ? 'bg-destructive'
                        : 'hover:bg-input-focus focus-within:bg-input-focus',
                    )}
                  >
                    {contentError ? null : (
                      <span
                        aria-hidden
                        className="animation-duration-[5s] pointer-events-none absolute top-1/2 left-1/2 z-0 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-focus-within/context-message:opacity-100 motion-safe:animate-spin motion-reduce:animate-none"
                        style={{
                          background:
                            'conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary) 55%, transparent) 55deg, var(--primary) 92deg, var(--info) 122deg, transparent 172deg)',
                        }}
                      />
                    )}

                    <div className="bg-input group-focus-within/context-message:bg-background relative z-10 min-h-32 rounded-[calc(var(--radius-lg)-1px)] transition-colors duration-200">
                      <div className="border-border/50 flex h-9 min-w-0 items-center justify-between gap-2 border-b px-3">
                        <Select
                          value={message.role}
                          disabled={disabled}
                          onValueChange={(role) =>
                            updateMessage(index, {
                              ...message,
                              role: role as LlmContextMessageRole,
                            })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={`${messageLabel}角色`}
                            className="text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground data-[state=open]:bg-muted/60 data-[state=open]:text-foreground dark:hover:bg-muted/60 dark:focus-visible:bg-muted/60 -ml-2 w-auto min-w-0 rounded-md border-transparent bg-transparent px-2 py-0 text-xs font-semibold tracking-wide shadow-none hover:border-transparent focus-visible:border-transparent data-[size=sm]:h-6 [&_svg]:size-3"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            align="start"
                            sideOffset={4}
                            className="w-(--radix-select-trigger-width) min-w-28 rounded-lg"
                          >
                            {LLM_CONTEXT_MESSAGE_ROLE_VALUES.map((role) => (
                              <SelectItem
                                key={role}
                                value={role}
                                className="text-muted-foreground hover:bg-muted/50 hover:text-foreground data-highlighted:bg-muted/50 data-highlighted:text-foreground data-[state=checked]:text-foreground h-7 rounded-md px-2 pr-7 text-xs font-medium"
                              >
                                {CONTEXT_ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <NodeVariablePicker
                            options={availableVariables}
                            disabled={disabled || availableVariables.length === 0}
                            matchTriggerWidth={false}
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={disabled || availableVariables.length === 0}
                                aria-label={`为${messageLabel}插入变量`}
                                className="text-muted-foreground hover:bg-button-secondary-bg-active hover:text-foreground focus-visible:bg-button-secondary-bg-active focus-visible:text-foreground"
                              >
                                <VariableIcon className="size-3" aria-hidden />
                              </Button>
                            }
                            onValueChange={(option) => insertVariable(message.id, option)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={disabled || messages.length <= 1}
                            aria-label={`删除${messageLabel}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                            onClick={() =>
                              onChange(messages.filter((_, messageIndex) => messageIndex !== index))
                            }
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </div>

                      <TiptapEditor
                        ref={(editor) => {
                          if (editor) editorRefs.current.set(message.id, editor)
                          else editorRefs.current.delete(message.id)
                        }}
                        value={message.content}
                        tokens={editorTokens}
                        disabled={disabled}
                        ariaLabel={`${messageLabel}内容`}
                        ariaInvalid={Boolean(contentError)}
                        placeholder="输入上下文内容，或插入上游变量"
                        className="px-3 py-2.5"
                        editorClassName="min-h-20"
                        onChange={(content) => updateMessage(index, { ...message, content })}
                      />
                    </div>
                  </div>

                  {contentError ? (
                    <p className="text-destructive mt-1.5 text-xs leading-4">{contentError}</p>
                  ) : null}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </Form.Field>
  )
}
