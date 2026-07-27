import type { CodeEditorFieldSchema } from '@ai-workflow/core'
import type { CodeEditorLanguage } from '@ai-workflow/ui/components/code-editor'
import { Form } from '@ai-workflow/ui/components/form'
import { lazy, Suspense } from 'react'

import type { FieldRendererProps } from '../../contracts/field-renderer'

const CodeFieldContent = lazy(async () => {
  const codeFieldContentModule = await import('./code-field-content')

  return { default: codeFieldContentModule.CodeFieldContent }
})

export interface CodeFieldProps extends FieldRendererProps<CodeEditorFieldSchema, string> {
  language?: CodeEditorLanguage
}

export function CodeField({
  name,
  field,
  value,
  error,
  disabled,
  onChange,
  language = 'javascript',
}: CodeFieldProps) {
  const languageLabel = language.toLocaleUpperCase()

  return (
    <Form.Field
      label={field.label}
      description={field.description}
      error={error}
      required={field.required}
    >
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            aria-label="代码编辑器加载中"
            className="bg-input flex h-52 w-full flex-col overflow-hidden rounded-lg border border-transparent"
          >
            <div className="border-border/50 flex h-9 shrink-0 items-center border-b px-3">
              <span className="text-foreground text-xs font-semibold tracking-wide">
                {languageLabel}
              </span>
            </div>
            <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center text-xs">
              正在加载编辑器…
            </div>
          </div>
        }
      >
        <CodeFieldContent
          ariaInvalid={Boolean(error)}
          ariaLabel={field.label}
          language={language}
          name={name}
          value={value ?? field.content}
          required={field.required}
          disabled={disabled}
          onChange={onChange}
        />
      </Suspense>
    </Form.Field>
  )
}
