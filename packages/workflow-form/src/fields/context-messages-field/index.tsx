import {
  LLM_CONTEXT_MESSAGE_ROLE_VALUES,
  llmNodeSchema,
  type ContextMessagesFieldSchema,
  type LlmContextMessageInput,
  type LlmContextMessageRole,
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
import { Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'

import { VariableTemplateEditor } from '../../components/variable-template-editor'
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

function getContextMessagesFieldError(errors: ContextMessagesFieldProps['errors'], name: string) {
  const directError = errors?.[name]
  if (directError) return directError

  const fieldPrefix = `${name}.`,
    matchingEntry = Object.entries(errors ?? {}).find(([errorPath]) => {
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
  const messages = getContextMessages(value),
    fieldError = getContextMessagesFieldError(errors, name)

  function updateMessage(index: number, nextMessage: LlmContextMessageInput) {
    onChange(
      messages.map((message, messageIndex) => (messageIndex === index ? nextMessage : message)),
    )
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
              const contentError = getFieldError(errors, `${name}.${index}.content`),
                messageLabel = `第 ${index + 1} 条${field.label}`

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
                  <VariableTemplateEditor
                    value={message.content}
                    availableVariables={availableVariables}
                    header={
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
                    }
                    ariaLabel={`${messageLabel}内容`}
                    variableButtonAriaLabel={`为${messageLabel}插入变量`}
                    placeholder="输入上下文内容，或插入上游变量"
                    disabled={disabled}
                    error={contentError}
                    endActions={
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
                    }
                    onChange={(content) => updateMessage(index, { ...message, content })}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </Form.Field>
  )
}
