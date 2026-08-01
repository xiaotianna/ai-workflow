import {
  ragKnowledgeBaseIdsSchema,
  ragKnowledgeBaseReferencesSchema,
  type RagKnowledgeBaseReference,
} from '@ai-workflow/core'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Form } from '@ai-workflow/ui/components/form'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { FormEvent } from 'react'
import { z } from 'zod'

import type { KnowledgeBaseDto } from '@/api/knowledge-bases'

import { KnowledgeBaseReferenceIcon, KnowledgeBaseRetrievalBadge } from './knowledge-base-reference'

interface KnowledgeBaseSelectorDialogProps {
  knowledgeBases: readonly KnowledgeBaseDto[]
  loadError: boolean
  loading: boolean
  onOpenChange: (open: boolean) => void
  onSave: (knowledgeBases: RagKnowledgeBaseReference[]) => void
  open: boolean
  value: readonly RagKnowledgeBaseReference[]
}

interface KnowledgeBaseOption {
  icon?: string
  id: string
  title: string
}

const knowledgeBaseSelectionSchema = z.object({
  knowledgeBaseIds: ragKnowledgeBaseIdsSchema,
})

type KnowledgeBaseSelectionForm = z.input<typeof knowledgeBaseSelectionSchema>

export function KnowledgeBaseSelectorDialog({
  knowledgeBases,
  loadError,
  loading,
  onOpenChange,
  onSave,
  open,
  value,
}: KnowledgeBaseSelectorDialogProps) {
  const { form, updateFormField } = useFormData<KnowledgeBaseSelectionForm>({
    knowledgeBaseIds: value.map((knowledgeBase) => knowledgeBase.id),
  })
  const validationResult = validateFormByZod(knowledgeBaseSelectionSchema, form)
  const knowledgeBaseIds = form.knowledgeBaseIds ?? []
  const unavailableOptions = value.flatMap((reference) =>
    knowledgeBases.some((knowledgeBase) => knowledgeBase.id === reference.id)
      ? []
      : [
          {
            id: reference.id,
            title: reference.title ?? `不可用的知识库（${reference.id}）`,
            ...(reference.icon ? { icon: reference.icon } : {}),
          },
        ],
  )
  const options: KnowledgeBaseOption[] = [...unavailableOptions, ...knowledgeBases]

  function toggleKnowledgeBase(knowledgeBaseId: string) {
    updateFormField('knowledgeBaseIds', (currentKnowledgeBaseIds = []) =>
      currentKnowledgeBaseIds.includes(knowledgeBaseId)
        ? currentKnowledgeBaseIds.filter((currentId) => currentId !== knowledgeBaseId)
        : [...currentKnowledgeBaseIds, knowledgeBaseId],
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = validateFormByZod(knowledgeBaseSelectionSchema, form)
    if (!result.success) return

    const optionById = new Map(options.map((knowledgeBase) => [knowledgeBase.id, knowledgeBase]))
    const references = result.data.knowledgeBaseIds.map((knowledgeBaseId) => {
      const knowledgeBase = optionById.get(knowledgeBaseId)

      return {
        id: knowledgeBaseId,
        ...(knowledgeBase?.title ? { title: knowledgeBase.title } : {}),
        ...(knowledgeBase?.icon ? { icon: knowledgeBase.icon } : {}),
      }
    })
    const parsedReferences = validateFormByZod(ragKnowledgeBaseReferencesSchema, references)
    if (!parsedReferences.success) return

    onSave(parsedReferences.data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex min-h-72 max-w-md flex-col gap-5">
        <DialogHeader>
          <DialogTitle>选择引用知识库</DialogTitle>
        </DialogHeader>

        <Form className="flex min-h-0 flex-1 flex-col space-y-0" onSubmit={handleSubmit}>
          <div className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-0.5">
            {options.map((knowledgeBase) => {
              const selected = knowledgeBaseIds.includes(knowledgeBase.id)

              return (
                <button
                  key={knowledgeBase.id}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    'flex h-11 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border px-2 text-left shadow-xs transition-[background-color,border-color,box-shadow] duration-150 outline-none',
                    selected
                      ? 'border-primary bg-primary/10 hover:bg-primary/15 focus-visible:border-primary focus-visible:bg-primary/15'
                      : 'border-border/60 bg-background hover:border-input-focus hover:bg-muted/40 focus-visible:border-input-focus focus-visible:bg-muted/40',
                  )}
                  onClick={() => toggleKnowledgeBase(knowledgeBase.id)}
                >
                  <KnowledgeBaseReferenceIcon
                    icon={knowledgeBase.icon}
                    title={knowledgeBase.title}
                  />
                  <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                    {knowledgeBase.title}
                  </span>
                  <KnowledgeBaseRetrievalBadge />
                </button>
              )
            })}

            {options.length === 0 ? (
              <div
                role="status"
                className="text-muted-foreground bg-muted/40 flex min-h-24 items-center justify-center rounded-xl px-4 text-center text-sm"
              >
                {loading
                  ? '正在加载知识库列表'
                  : loadError
                    ? '知识库列表加载失败，请重新打开编辑器后重试'
                    : '暂无知识库，请先创建空白知识库'}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-5 items-center sm:justify-between">
            <p className="text-foreground mr-auto min-h-5 text-sm font-medium">
              {knowledgeBaseIds.length > 0 ? `${knowledgeBaseIds.length} 个知识库被选中` : null}
            </p>
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="sm">
                  取消
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="confirm"
                size="sm"
                disabled={!validationResult.success}
              >
                添加
              </Button>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
