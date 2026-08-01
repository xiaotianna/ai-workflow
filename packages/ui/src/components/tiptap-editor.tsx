import { mergeAttributes, Node as TiptapNode, type Editor, type JSONContent } from '@tiptap/core'
import { Placeholder } from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { forwardRef, useEffect, useImperativeHandle, useRef, type ComponentProps } from 'react'

import { cn } from '../lib/utils'
import {
  getVariableIconColorClass,
  getVariableIconMaskImage,
  type VariableIconVariant,
} from './variable-icon'

export interface TiptapEditorToken {
  id: string
  label: string
  value: string
  iconVariant?: VariableIconVariant
}

export interface TiptapEditorHandle {
  focus: () => void
  insertToken: (token: TiptapEditorToken) => void
}

export interface TiptapEditorProps extends Omit<ComponentProps<'div'>, 'children' | 'onChange'> {
  value: string
  tokens?: readonly TiptapEditorToken[]
  disabled?: boolean
  editorClassName?: string
  placeholder?: string
  ariaLabel: string
  ariaInvalid?: boolean
  onChange: (value: string) => void
}

function getInlineTokenIconVariant(value: unknown): VariableIconVariant {
  if (value === 'system' || value === 'environment') return value
  return 'default'
}

function getInlineTokenIconStyle(variant: VariableIconVariant) {
  const maskImage = getVariableIconMaskImage(variant)

  return [
    'background-color: currentColor',
    `-webkit-mask-image: ${maskImage}`,
    '-webkit-mask-position: center',
    '-webkit-mask-repeat: no-repeat',
    '-webkit-mask-size: contain',
    `mask-image: ${maskImage}`,
    'mask-position: center',
    'mask-repeat: no-repeat',
    'mask-size: contain',
  ].join(';')
}

const InlineToken = TiptapNode.create({
  name: 'inlineToken',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: '',
        rendered: false,
        parseHTML: (element) => element.getAttribute('data-token-id'),
      },
      label: {
        default: '',
        rendered: false,
        parseHTML: (element) => element.textContent,
      },
      value: {
        default: '',
        rendered: false,
        parseHTML: (element) => element.getAttribute('data-token-value'),
      },
      iconVariant: {
        default: 'default',
        rendered: false,
        parseHTML: (element) => element.getAttribute('data-token-icon-variant'),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-inline-token]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const iconVariant = getInlineTokenIconVariant(node.attrs.iconVariant)

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-inline-token': '',
        'data-token-id': node.attrs.id,
        'data-token-value': node.attrs.value,
        'data-token-icon-variant': iconVariant,
        contenteditable: 'false',
        title: node.attrs.label,
        class: cn(
          'border-border bg-background inline-flex items-center rounded-md border-[0.5px] px-1.5 py-0.5 align-baseline text-xs font-medium whitespace-nowrap shadow-xs',
          iconVariant === 'default' ? 'text-primary' : getVariableIconColorClass(iconVariant),
        ),
      }),
      [
        'span',
        {
          'data-token-icon': '',
          'aria-hidden': 'true',
          class: 'mr-1 inline-block size-3 shrink-0',
          style: getInlineTokenIconStyle(iconVariant),
        },
      ],
      node.attrs.label,
    ]
  },

  renderText({ node }) {
    return node.attrs.value
  },
})

function findNextToken(value: string, offset: number, tokens: readonly TiptapEditorToken[]) {
  let result: { index: number; token: TiptapEditorToken } | undefined = undefined

  for (const token of tokens) {
    if (!token.value) continue

    const index = value.indexOf(token.value, offset)
    if (index === -1 || (result && result.index <= index)) continue

    result = { index, token }
  }

  return result
}

function createParagraphContent(
  value: string,
  tokens: readonly TiptapEditorToken[],
): JSONContent[] | undefined {
  if (!value) return undefined

  const content: JSONContent[] = []
  let offset = 0

  while (offset < value.length) {
    const nextToken = findNextToken(value, offset, tokens)

    if (!nextToken) {
      content.push({ type: 'text', text: value.slice(offset) })
      break
    }

    if (nextToken.index > offset) {
      content.push({ type: 'text', text: value.slice(offset, nextToken.index) })
    }

    content.push({
      type: InlineToken.name,
      attrs: nextToken.token,
    })
    offset = nextToken.index + nextToken.token.value.length
  }

  return content.length > 0 ? content : undefined
}

function createEditorDocument(value: string, tokens: readonly TiptapEditorToken[]): JSONContent {
  return {
    type: 'doc',
    content: value.split('\n').map((line) => ({
      type: 'paragraph',
      content: createParagraphContent(line, tokens),
    })),
  }
}

function getEditorValue(editor: Editor): string {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', (node) => {
    if (node.type.name === InlineToken.name) return String(node.attrs.value ?? '')
    if (node.type.name === 'hardBreak') return '\n'
    return ''
  })
}

function getEditorClassName(disabled: boolean, editorClassName?: string) {
  return cn(
    'text-foreground min-h-20 cursor-text text-sm leading-5 outline-none',
    '[&_p]:m-0 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-input-placeholder [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
    disabled && 'cursor-not-allowed opacity-50',
    editorClassName,
  )
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(function TiptapEditor(
  {
    value,
    tokens = [],
    disabled = false,
    editorClassName,
    placeholder = '',
    ariaLabel,
    ariaInvalid = false,
    className,
    onChange,
    ...props
  },
  ref,
) {
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const tokenSignature = JSON.stringify(tokens)
  const syncedTokenSignatureRef = useRef(tokenSignature)

  valueRef.current = value
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder }), InlineToken],
    content: createEditorDocument(value, tokens),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        role: 'textbox',
        class: getEditorClassName(disabled, editorClassName),
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      const nextValue = getEditorValue(nextEditor)
      if (nextValue !== valueRef.current) onChangeRef.current(nextValue)
    },
  })

  useEffect(() => {
    if (!editor) return

    editor.setEditable(!disabled)
    editor.view.dom.className = getEditorClassName(disabled, editorClassName)
    editor.view.dom.setAttribute('aria-label', ariaLabel)
    editor.view.dom.setAttribute('aria-invalid', String(ariaInvalid))
    editor.view.dom.setAttribute('aria-disabled', String(disabled))
  }, [ariaInvalid, ariaLabel, disabled, editor, editorClassName])

  useEffect(() => {
    if (!editor) return

    const valueChanged = getEditorValue(editor) !== value
    const tokensChanged = syncedTokenSignatureRef.current !== tokenSignature

    if (valueChanged || tokensChanged) {
      editor.commands.setContent(createEditorDocument(value, tokens), { emitUpdate: false })
    }

    syncedTokenSignatureRef.current = tokenSignature
  }, [editor, tokenSignature, tokens, value])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editor?.commands.focus(),
      insertToken: (token) => {
        editor
          ?.chain()
          .focus()
          .insertContent([
            {
              type: InlineToken.name,
              attrs: token,
            },
            { type: 'text', text: ' ' },
          ])
          .run()
      },
    }),
    [editor],
  )

  return (
    <EditorContent
      editor={editor}
      data-slot="tiptap-editor"
      data-disabled={disabled || undefined}
      className={cn('min-w-0', className)}
      {...props}
    />
  )
})
