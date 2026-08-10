import type { KnowledgeChunkDto } from '@/api/knowledge-bases'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { Grip, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { knowledgeChunkEditSchema, type KnowledgeChunkEditFormInput } from '../schema'

interface KnowledgeChunkEditPanelProps {
  chunk: KnowledgeChunkDto
  saving: boolean
  onClose: () => void
  onSave: (content: string) => Promise<void>
}

export function KnowledgeChunkEditPanel({
  chunk,
  saving,
  onClose,
  onSave,
}: KnowledgeChunkEditPanelProps) {
  const { form, setForm, updateFormField } = useFormData<KnowledgeChunkEditFormInput>({
    content: chunk.content,
  })
  const [touched, setTouched] = useState(false)
  const validation = validateFormByZod(knowledgeChunkEditSchema, form)
  const contentError = validation.success ? undefined : validation.errors.content
  const isUnchanged = form.content === chunk.content

  useEffect(() => {
    setForm({ content: chunk.content })
    setTouched(false)
  }, [chunk.content, chunk.id, setForm])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || saving) return
      event.preventDefault()
      onClose()
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [onClose, saving])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)

    const result = validateFormByZod(knowledgeChunkEditSchema, form)
    if (!result.success || result.data.content === chunk.content) return
    await onSave(result.data.content)
  }

  return (
    <aside
      aria-label={`编辑分段-${String(chunk.sequence).padStart(2, '0')}`}
      className="bg-background border-border/60 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-[0.5px] shadow-lg"
    >
      <header className="flex shrink-0 items-start gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm leading-5 font-semibold">编辑分段</h2>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px] leading-4 font-medium">
            <span className="flex items-center gap-1">
              <Grip aria-hidden className="size-3.5" />
              分段-{String(chunk.sequence).padStart(2, '0')}
            </span>
            <span className="text-muted-foreground/50 mx-0.5">·</span>
            <span>{form.content.length} 字符</span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground ml-auto shrink-0 rounded-lg"
          aria-label="关闭编辑分段面板"
          disabled={saving}
          onClick={onClose}
        >
          <X aria-hidden className="size-3.5" />
        </Button>
      </header>

      <Form className="flex min-h-0 flex-1 flex-col space-y-0" onSubmit={handleSubmit}>
        <div className="flex min-h-0 flex-1 px-4 pt-4 pb-4">
          <Form.Field
            required
            label="分段内容"
            error={touched ? contentError : undefined}
            className="flex min-h-0 flex-1 flex-col [&>[data-slot=form-control]]:flex [&>[data-slot=form-control]]:min-h-0 [&>[data-slot=form-control]]:flex-1 [&>[data-slot=form-label]]:sr-only"
          >
            <Textarea
              aria-label="分段内容"
              aria-invalid={Boolean(touched && contentError)}
              className="field-sizing-fixed h-full min-h-40 resize-none rounded-none border-0 bg-transparent p-0 text-sm leading-5 shadow-none transition-none hover:border-transparent hover:bg-transparent focus-visible:border-transparent focus-visible:bg-transparent md:text-[13px] dark:bg-transparent dark:hover:bg-transparent dark:focus-visible:bg-transparent"
              disabled={saving}
              maxLength={10_000}
              spellCheck={false}
              value={form.content}
              onBlur={() => setTouched(true)}
              onChange={(event) => updateFormField('content', event.target.value)}
            />
          </Form.Field>
        </div>

        <footer className="border-border/60 flex shrink-0 justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button
            type="submit"
            variant="confirm"
            size="sm"
            disabled={!validation.success || isUnchanged || saving}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </footer>
      </Form>
    </aside>
  )
}
