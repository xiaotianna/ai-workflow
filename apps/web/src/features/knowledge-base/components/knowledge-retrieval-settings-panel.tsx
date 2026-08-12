import type { KnowledgeRetrievalProfile } from '@/api/knowledge-bases'
import { FloatingSidePanel } from '@/components/floating-side-panel'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { Slider } from '@ai-workflow/ui/components/slider'
import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import {
  knowledgeRetrievalSettingsSchema,
  type KnowledgeRetrievalSettingsFormInput,
} from '../schema'
import { KnowledgeRetrievalMethodIcon } from './knowledge-retrieval-method-icon'

interface KnowledgeRetrievalSettingsPanelProps {
  open: boolean
  profile: KnowledgeRetrievalProfile
  retrievalTopK: number
  saving: boolean
  onClose: () => void
  onSave: (retrievalTopK: number) => Promise<void>
}

const retrievalProfileLabels = {
  HYBRID_ACCURATE: '混合检索 · 高准确',
  HYBRID_FAST: '混合检索 · 低延迟',
} satisfies Record<KnowledgeRetrievalProfile, string>

export function KnowledgeRetrievalSettingsPanel({
  open,
  profile,
  retrievalTopK,
  saving,
  onClose,
  onSave,
}: KnowledgeRetrievalSettingsPanelProps) {
  const { form, setForm, updateFormField } = useFormData<KnowledgeRetrievalSettingsFormInput>({
      retrievalTopK,
    }),
    [touched, setTouched] = useState(false),
    validation = validateFormByZod(knowledgeRetrievalSettingsSchema, form),
    retrievalTopKError = validation.success ? undefined : validation.errors.retrievalTopK

  useEffect(() => {
    if (!open) return
    setForm({ retrievalTopK })
    setTouched(false)
  }, [open, retrievalTopK, setForm])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)

    const result = validateFormByZod(knowledgeRetrievalSettingsSchema, form)
    if (!result.success || result.data.retrievalTopK === retrievalTopK) return
    await onSave(result.data.retrievalTopK)
  }

  return (
    <FloatingSidePanel ariaLabel="检索设置" closeDisabled={saving} open={open} onClose={onClose}>
      <header className="flex shrink-0 items-start gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm leading-5 font-semibold">检索设置</h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-4">
            调整召回测试使用的检索参数。
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground ml-auto shrink-0 rounded-lg"
          aria-label="关闭检索设置面板"
          disabled={saving}
          onClick={onClose}
        >
          <X aria-hidden className="size-3.5" />
        </Button>
      </header>

      <Form className="flex min-h-0 flex-1 flex-col space-y-0" onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <h3 className="mb-2 text-xs leading-5 font-semibold">检索方法</h3>
          <section className="border-primary/60 overflow-hidden rounded-xl border shadow-xs">
            <header className="bg-input/70 flex items-start gap-3 px-4 py-3.5">
              <KnowledgeRetrievalMethodIcon className="mt-0.5 size-4" />
              <div className="min-w-0">
                <h4 className="text-sm leading-5 font-semibold">
                  {retrievalProfileLabels[profile]}
                </h4>
                <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                  同时使用关键词匹配和向量语义召回，并对结果进行融合排序。
                </p>
              </div>
            </header>

            <div className="px-4 py-4">
              <Form.Field required label="Top K" error={touched ? retrievalTopKError : undefined}>
                <div className="flex items-center gap-3">
                  <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={[Number(form.retrievalTopK) || 1]}
                    disabled={saving}
                    aria-label="Top K"
                    onValueChange={(value) => updateFormField('retrievalTopK', value[0] ?? 1)}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.retrievalTopK}
                    aria-label="Top K 数值"
                    className="w-20 shrink-0"
                    disabled={saving}
                    onBlur={() => setTouched(true)}
                    onChange={(event) =>
                      updateFormField(
                        'retrievalTopK',
                        Number.isNaN(event.currentTarget.valueAsNumber)
                          ? 0
                          : event.currentTarget.valueAsNumber,
                      )
                    }
                  />
                </div>
              </Form.Field>
            </div>
          </section>
        </div>

        <footer className="border-border/60 flex shrink-0 justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button
            type="submit"
            variant="confirm"
            size="sm"
            disabled={
              !validation.success || validation.data.retrievalTopK === retrievalTopK || saving
            }
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </footer>
      </Form>
    </FloatingSidePanel>
  )
}
