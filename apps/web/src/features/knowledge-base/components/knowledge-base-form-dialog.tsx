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
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { useEffect, useState, type FormEvent } from 'react'

import {
  createKnowledgeBaseSchema,
  knowledgeBaseIcons,
  type CreateKnowledgeBaseFormInput,
  type CreateKnowledgeBaseInput,
} from '../schema'

interface KnowledgeBaseFormDialogProps {
  initialValues: CreateKnowledgeBaseFormInput
  open: boolean
  submitLabel: string
  title: string
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CreateKnowledgeBaseInput) => unknown | Promise<unknown>
}

export function KnowledgeBaseFormDialog({
  initialValues,
  open,
  submitLabel,
  title,
  onOpenChange,
  onSubmit,
}: KnowledgeBaseFormDialogProps) {
  const { form, setForm, updateFormField, resetForm } =
    useFormData<CreateKnowledgeBaseFormInput>(initialValues)
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof CreateKnowledgeBaseFormInput, boolean>>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const validationResult = validateFormByZod(createKnowledgeBaseSchema, form)
  const formErrors = validationResult.errors

  useEffect(() => {
    if (!open) return

    setForm({
      title: initialValues.title,
      icon: initialValues.icon,
      description: initialValues.description,
    })
    setTouchedFields({})
  }, [initialValues.description, initialValues.icon, initialValues.title, open, setForm])

  function markFieldTouched(field: keyof CreateKnowledgeBaseFormInput) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  function resetDialogForm() {
    resetForm()
    setTouchedFields({})
  }

  function handleOpenChange(nextOpen: boolean) {
    if (submitting && !nextOpen) return
    if (!nextOpen) resetDialogForm()
    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = validateFormByZod(createKnowledgeBaseSchema, form)
    if (!result.success) {
      setTouchedFields({
        title: true,
        icon: true,
        description: true,
      })
      return
    }

    setSubmitting(true)

    try {
      await onSubmit(result.data)
      setSubmitting(false)
      resetDialogForm()
      onOpenChange(false)
    } catch {
      // 请求错误已由统一 API 客户端展示，保留弹窗内容供用户重试。
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field
            required
            label="知识库名称 & 图标"
            error={touchedFields.title ? formErrors.title : undefined}
          >
            <div className="flex items-center gap-2">
              <Select
                value={form.icon}
                onValueChange={(value) =>
                  updateFormField('icon', value as CreateKnowledgeBaseFormInput['icon'])
                }
                disabled={submitting}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="知识库图标"
                  className="w-11 shrink-0 justify-center rounded-lg px-2 [&>svg]:hidden"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start" className="min-w-28">
                  {knowledgeBaseIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <span className="text-base leading-none">{icon}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={form.title}
                onChange={(event) => updateFormField('title', event.target.value)}
                onBlur={() => markFieldTouched('title')}
                aria-label="知识库名称"
                aria-invalid={Boolean(touchedFields.title && formErrors.title)}
                autoComplete="off"
                disabled={submitting}
                maxLength={40}
                placeholder="输入知识库名称"
                className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
              />
            </div>
          </Form.Field>

          <Form.Field
            label="描述"
            error={touchedFields.description ? formErrors.description : undefined}
          >
            <Textarea
              value={form.description}
              onChange={(event) => updateFormField('description', event.target.value)}
              onBlur={() => markFieldTouched('description')}
              aria-label="知识库描述（可选）"
              aria-invalid={Boolean(touchedFields.description && formErrors.description)}
              disabled={submitting}
              maxLength={200}
              placeholder="输入知识库描述"
              className="bg-muted/80 focus-visible:bg-background min-h-24 resize-none rounded-lg border-transparent px-3 py-2 text-sm shadow-none"
            />
          </Form.Field>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={submitting}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="confirm"
              size="sm"
              disabled={!validationResult.success || submitting}
            >
              {submitting ? '提交中...' : submitLabel}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
