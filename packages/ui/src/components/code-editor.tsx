// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- Vite exposes Worker query modules through ambient declarations.
/// <reference types="vite/client" />

import { Editor, loader, type EditorProps } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
/* eslint-disable import/default -- Vite 将 ?worker 模块转换为默认导出的 Worker 构造器。 */
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import CssWorker from 'monaco-editor/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'
/* eslint-enable import/default */
import * as React from 'react'

import { cn } from '../lib/utils'

interface MonacoEnvironment {
  getWorker: (workerId: string, label: string) => Worker
}

const workerScope = globalThis as typeof globalThis & {
  MonacoEnvironment?: MonacoEnvironment
}

workerScope.MonacoEnvironment ??= {
  getWorker(_workerId, label) {
    if (label === 'json') {
      return new JsonWorker()
    }

    if (label === 'css' || label === 'scss' || label === 'less') {
      return new CssWorker()
    }

    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new HtmlWorker()
    }

    if (label === 'typescript' || label === 'javascript') {
      return new TsWorker()
    }

    return new EditorWorker()
  },
}

loader.config({ monaco })

function subscribeToColorScheme(onStoreChange: () => void) {
  if (typeof document === 'undefined') {
    return () => undefined
  }

  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  return () => observer.disconnect()
}

function getColorScheme() {
  if (typeof document === 'undefined') {
    return 'light' as const
  }

  return document.documentElement.classList.contains('dark')
    ? ('vs-dark' as const)
    : ('light' as const)
}

interface CodeEditorProps extends Omit<
  React.ComponentProps<'div'>,
  'children' | 'defaultValue' | 'onChange'
> {
  disabled?: boolean
  height?: EditorProps['height']
  language?: string
  loading?: React.ReactNode
  name?: string
  onChange?: (value: string) => void
  options?: EditorProps['options']
  required?: boolean
  theme?: EditorProps['theme']
  value?: string
}

const CodeEditor = React.forwardRef<HTMLDivElement, CodeEditorProps>(
  (
    {
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      className,
      disabled = false,
      height = '100%',
      language = 'plaintext',
      loading,
      name,
      onChange,
      options,
      required,
      theme,
      value = '',
      ...props
    },
    ref,
  ) => {
    const colorScheme = React.useSyncExternalStore(
      subscribeToColorScheme,
      getColorScheme,
      () => 'light',
    )

    return (
      <div
        {...props}
        ref={ref}
        data-slot="code-editor"
        data-disabled={disabled}
        data-language={language}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-required={required}
        className={cn(
          'bg-input hover:border-input-focus hover:bg-background focus-within:border-input-focus focus-within:bg-background aria-invalid:border-destructive dark:bg-input dark:hover:bg-background dark:focus-within:bg-background dark:aria-invalid:border-destructive/70 h-48 w-full overflow-hidden rounded-md border border-transparent shadow-none transition-[background-color,border-color] outline-none',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
        <Editor
          height={height}
          language={language}
          loading={
            loading ?? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                正在加载编辑器…
              </div>
            )
          }
          options={{
            automaticLayout: true,
            fixedOverflowWidgets: true,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            lineHeight: 20,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            padding: { top: 8, bottom: 8 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            ...options,
            ariaLabel: ariaLabel ?? options?.ariaLabel,
            domReadOnly: disabled || options?.domReadOnly,
            readOnly: disabled || options?.readOnly,
            tabIndex: disabled ? -1 : options?.tabIndex,
          }}
          theme={theme ?? colorScheme}
          value={value}
          onChange={(nextValue) => onChange?.(nextValue ?? '')}
        />
      </div>
    )
  },
)

CodeEditor.displayName = 'CodeEditor'

export { CodeEditor }
export type { CodeEditorProps }
