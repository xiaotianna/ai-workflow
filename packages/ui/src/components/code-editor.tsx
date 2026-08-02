// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- Vite exposes Worker query modules through ambient declarations.
/// <reference types="vite/client" />

import { Editor, loader, type EditorProps } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
/* eslint-disable import/default -- Vite 将 ?worker 模块转换为默认导出的 Worker 构造器。 */
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
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
    if (label === 'typescript' || label === 'javascript') {
      return new TsWorker()
    }

    if (label === 'json') {
      return new JsonWorker()
    }

    return new EditorWorker()
  },
}

loader.config({ monaco })

const CODE_EDITOR_THEMES = {
  dark: 'ai-workflow-code-dark',
  light: 'ai-workflow-code-light',
} as const

const transparentEditorColors = {
  'editor.background': '#00000000',
  'editorGutter.background': '#00000000',
  'editorStickyScroll.background': '#00000000',
  'editorStickyScrollGutter.background': '#00000000',
}

monaco.editor.defineTheme(CODE_EDITOR_THEMES.light, {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: transparentEditorColors,
})

monaco.editor.defineTheme(CODE_EDITOR_THEMES.dark, {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: transparentEditorColors,
})

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
    return CODE_EDITOR_THEMES.light
  }

  return document.documentElement.classList.contains('dark')
    ? CODE_EDITOR_THEMES.dark
    : CODE_EDITOR_THEMES.light
}

type CodeEditorLanguage = NonNullable<EditorProps['language']>

interface CodeEditorProps extends Omit<
  React.ComponentProps<'div'>,
  'children' | 'defaultValue' | 'onChange'
> {
  disabled?: boolean
  height?: EditorProps['height']
  language: CodeEditorLanguage
  loading?: React.ReactNode
  onChange?: (value: string) => void
  options?: EditorProps['options']
  theme?: EditorProps['theme']
  value?: string
}

const CodeEditor = React.forwardRef<HTMLDivElement, CodeEditorProps>(
  (
    {
      'aria-label': ariaLabel,
      className,
      disabled = false,
      height = '100%',
      language,
      loading,
      onChange,
      options,
      theme,
      value = '',
      ...props
    },
    ref,
  ) => {
    const lineNumberLayoutSubscriptionRef = React.useRef<monaco.IDisposable>(null)
    const [lineNumbersMinChars, setLineNumbersMinChars] = React.useState(3)
    const colorScheme = React.useSyncExternalStore(
      subscribeToColorScheme,
      getColorScheme,
      () => CODE_EDITOR_THEMES.light,
    )

    React.useEffect(
      () => () => {
        lineNumberLayoutSubscriptionRef.current?.dispose()
      },
      [],
    )

    function handleEditorMount(editor: monaco.editor.IStandaloneCodeEditor) {
      let lineNumberDigitCount = 0

      function updateLineNumberWidth() {
        const nextDigitCount = String(editor.getModel()?.getLineCount() ?? 1).length

        if (nextDigitCount === lineNumberDigitCount) return

        lineNumberDigitCount = nextDigitCount
        setLineNumbersMinChars(Math.max(3, nextDigitCount + 1))
      }

      lineNumberLayoutSubscriptionRef.current?.dispose()
      updateLineNumberWidth()
      lineNumberLayoutSubscriptionRef.current =
        editor.onDidChangeModelContent(updateLineNumberWidth)
    }

    return (
      <div
        {...props}
        ref={ref}
        data-slot="code-editor"
        data-disabled={disabled}
        data-language={language}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        className={cn('min-h-0', className)}
      >
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
            folding: false,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 12,
            glyphMargin: false,
            lineDecorationsWidth: 8,
            lineHeight: 20,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            padding: { top: 6, bottom: 8 },
            renderLineHighlight: 'none',
            scrollBeyondLastLine: false,
            scrollbar: {
              horizontalScrollbarSize: 6,
              useShadows: false,
              verticalScrollbarSize: 6,
            },
            stickyScroll: { enabled: false },
            wordWrap: 'on',
            ...options,
            ariaLabel: ariaLabel ?? options?.ariaLabel,
            domReadOnly: disabled || options?.domReadOnly,
            lineNumbersMinChars,
            readOnly: disabled || options?.readOnly,
            tabIndex: disabled ? -1 : options?.tabIndex,
          }}
          keepCurrentModel={false}
          theme={theme ?? colorScheme}
          value={value}
          onChange={(nextValue) => onChange?.(nextValue ?? '')}
          onMount={handleEditorMount}
        />
      </div>
    )
  },
)

CodeEditor.displayName = 'CodeEditor'

export { CodeEditor }
export type { CodeEditorLanguage, CodeEditorProps }
