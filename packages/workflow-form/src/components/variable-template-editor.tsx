import {
  ENVIRONMENT_VARIABLE_NAMESPACE,
  SYSTEM_VARIABLE_NAMESPACE,
  type VariableReference,
} from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import {
  TiptapEditor,
  type TiptapEditorHandle,
  type TiptapEditorToken,
} from '@ai-workflow/ui/components/tiptap-editor'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { cn } from '@ai-workflow/ui/lib/utils'
import { useRef, type ReactNode } from 'react'

import type { AvailableVariableOption } from '../contracts/available-variable-option'
import {
  getVariableReferenceIconVariant,
  NodeVariablePicker,
} from '../variables/node-variable-picker'

function serializeVariableReference(reference: VariableReference): string {
  const path = reference.path.length > 0 ? `.${reference.path.join('.')}` : ''

  if (reference.scope === 'node') {
    return `{{#${reference.nodeId}.${reference.outputKey}${path}#}}`
  }

  if (reference.scope === 'system') {
    return `{{#${SYSTEM_VARIABLE_NAMESPACE}.${reference.key}${path}#}}`
  }

  return `{{#${ENVIRONMENT_VARIABLE_NAMESPACE}.${reference.variableId}${path}#}}`
}

function createEditorToken(option: AvailableVariableOption): TiptapEditorToken {
  return {
    id: option.id,
    label: `${option.sourceLabel}.${option.variableName}`,
    value: serializeVariableReference(option.reference),
    iconVariant: getVariableReferenceIconVariant(option.reference),
  }
}

export interface VariableTemplateEditorProps {
  value: string
  availableVariables: readonly AvailableVariableOption[]
  header: ReactNode
  ariaLabel: string
  variableButtonAriaLabel: string
  placeholder: string
  disabled?: boolean
  error?: string
  endActions?: ReactNode
  onChange: (value: string) => void
}

export function VariableTemplateEditor({
  value,
  availableVariables,
  header,
  ariaLabel,
  variableButtonAriaLabel,
  placeholder,
  disabled,
  error,
  endActions,
  onChange,
}: VariableTemplateEditorProps) {
  const editorRef = useRef<TiptapEditorHandle>(null),
    editorTokens = availableVariables.map(createEditorToken)

  return (
    <div>
      <div
        className={cn(
          'group/variable-template bg-input relative isolate overflow-hidden rounded-lg p-px transition-colors duration-200',
          error ? 'bg-destructive' : 'hover:bg-input-focus focus-within:bg-input-focus',
        )}
      >
        {error ? null : (
          <span
            aria-hidden
            className="animation-duration-[5s] pointer-events-none absolute top-1/2 left-1/2 z-0 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-focus-within/variable-template:opacity-100 motion-safe:animate-spin motion-reduce:animate-none"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary) 55%, transparent) 55deg, var(--primary) 92deg, var(--info) 122deg, transparent 172deg)',
            }}
          />
        )}

        <div className="bg-input group-focus-within/variable-template:bg-background relative z-10 min-h-32 rounded-[calc(var(--radius-lg)-1px)] transition-colors duration-200">
          <div className="border-border/50 flex h-9 min-w-0 items-center justify-between gap-2 border-b px-3">
            {header}

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
                    aria-label={variableButtonAriaLabel}
                    className="text-muted-foreground hover:bg-button-secondary-bg-active hover:text-foreground focus-visible:bg-button-secondary-bg-active focus-visible:text-foreground"
                  >
                    <VariableIcon className="size-3" aria-hidden />
                  </Button>
                }
                onValueChange={(option) =>
                  editorRef.current?.insertToken(createEditorToken(option))
                }
              />
              {endActions}
            </div>
          </div>

          <TiptapEditor
            ref={editorRef}
            value={value}
            tokens={editorTokens}
            disabled={disabled}
            ariaLabel={ariaLabel}
            ariaInvalid={Boolean(error)}
            placeholder={placeholder}
            className="px-3 py-2.5"
            editorClassName="min-h-20"
            onChange={onChange}
          />
        </div>
      </div>

      {error ? <p className="text-destructive mt-1.5 text-xs leading-4">{error}</p> : null}
    </div>
  )
}
