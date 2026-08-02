import {
  ERROR_HANDLING_MODES,
  ERROR_HANDLING_OPTIONS,
  type ErrorHandling,
  type ErrorHandlingFieldSchema,
  type ErrorHandlingMode,
} from '@ai-workflow/core'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { GitBranch } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { lazy, Suspense } from 'react'

import type { FieldRendererProps } from '../../contracts/field-renderer'

const JsonValueInput = lazy(async () => {
  const jsonValueInputModule = await import('./json-value-input')

  return { default: jsonValueInputModule.JsonValueInput }
})

function createErrorHandling(mode: ErrorHandlingMode, currentValue: ErrorHandling): ErrorHandling {
  if (mode === ERROR_HANDLING_MODES.DEFAULT_VALUE) {
    return currentValue.mode === mode ? currentValue : { mode, defaultValue: {} }
  }

  return { mode }
}

export function ErrorHandlingField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
}: FieldRendererProps<ErrorHandlingFieldSchema, ErrorHandling>) {
  const resolvedValue = value ?? { mode: ERROR_HANDLING_MODES.NONE }
  const selectedOption = ERROR_HANDLING_OPTIONS.find(
    (option) => option.value === resolvedValue.mode,
  )

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
      actions={
        <Select
          name={`${name}.mode`}
          value={resolvedValue.mode}
          disabled={disabled}
          required={field.required}
          onValueChange={(mode) =>
            onChange(createErrorHandling(mode as ErrorHandlingMode, resolvedValue))
          }
        >
          <SelectTrigger
            size="sm"
            className="min-w-20 gap-1 px-2 text-[13px] data-[size=sm]:h-7"
            aria-label={field.label}
            aria-invalid={Boolean(error)}
          >
            <SelectValue>{selectedOption?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" align="end" sideOffset={4} className="w-80">
            {ERROR_HANDLING_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                textValue={option.label}
                className="h-auto items-start py-2"
              >
                <span className="flex min-w-0 flex-col gap-0.5 pr-2">
                  <span className="text-foreground text-[13px] font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs leading-4 font-normal whitespace-normal">
                    {option.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <MotionConfig reducedMotion="user">
        <AnimatePresence initial={false} mode="popLayout">
          {resolvedValue.mode === ERROR_HANDLING_MODES.DEFAULT_VALUE ? (
            <motion.div
              key="default-value"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <Suspense
                fallback={
                  <div
                    role="status"
                    aria-live="polite"
                    aria-label="JSON 编辑器加载中"
                    className="bg-input text-muted-foreground flex h-52 w-full items-center justify-center rounded-lg border border-transparent text-xs"
                  >
                    正在加载编辑器…
                  </div>
                }
              >
                <JsonValueInput
                  name={`${name}.defaultValue`}
                  value={resolvedValue.defaultValue}
                  disabled={disabled}
                  onChange={(defaultValue) =>
                    onChange({
                      mode: ERROR_HANDLING_MODES.DEFAULT_VALUE,
                      defaultValue,
                    })
                  }
                />
              </Suspense>
            </motion.div>
          ) : resolvedValue.mode === ERROR_HANDLING_MODES.ERROR_BRANCH ? (
            <motion.div
              key="error-branch"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="bg-muted/40 rounded-[10px] p-4"
            >
              <div className="bg-background border-border mb-2 flex size-8 items-center justify-center rounded-[10px] border-[0.5px] shadow-lg">
                <GitBranch className="text-muted-foreground size-5" aria-hidden />
              </div>
              <p className="text-foreground mb-1 text-[13px] leading-5 font-medium">
                在画布自定义失败分支逻辑。
              </p>
              <p className="text-muted-foreground text-xs leading-4.5 font-normal">
                当节点发生异常时，将自动执行失败分支。失败分支允许您灵活地提供错误消息、报告、修复或跳过操作。{' '}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </Form.Field>
  )
}

export type { JsonValueInputProps } from './json-value-input'
