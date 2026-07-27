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
import { useRef, useState, type FormEvent } from 'react'

import {
  CREATE_KNOWLEDGE_BASE_INITIAL_VALUES,
  createKnowledgeBaseSchema,
  knowledgeBaseIcons,
  type CreateKnowledgeBaseFormInput,
  type CreateKnowledgeBaseInput,
} from '../schema'

interface CreateKnowledgeBaseDialogProps {
  open: boolean
  onCreate: (input: CreateKnowledgeBaseInput) => void
  onOpenChange: (open: boolean) => void
}

export function CreateKnowledgeBaseDialog({
  open,
  onCreate,
  onOpenChange,
}: CreateKnowledgeBaseDialogProps) {
  const { form, updateFormField, resetForm } = useFormData<CreateKnowledgeBaseFormInput>(
    CREATE_KNOWLEDGE_BASE_INITIAL_VALUES,
  )
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof CreateKnowledgeBaseFormInput, boolean>>
  >({})
  const knowledgeBaseNameInputRef = useRef<HTMLInputElement>(null)
  const validationResult = validateFormByZod(createKnowledgeBaseSchema, form)
  const formErrors = validationResult.errors

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
    if (!nextOpen) resetDialogForm()
    onOpenChange(nextOpen)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    onCreate(result.data)
    resetDialogForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          knowledgeBaseNameInputRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>创建知识库</DialogTitle>
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
                ref={knowledgeBaseNameInputRef}
                value={form.title}
                onChange={(event) => updateFormField('title', event.target.value)}
                onBlur={() => markFieldTouched('title')}
                aria-label="知识库名称"
                aria-invalid={Boolean(touchedFields.title && formErrors.title)}
                autoComplete="off"
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
              maxLength={200}
              placeholder="输入知识库描述"
              className="bg-muted/80 focus-visible:bg-background min-h-24 resize-none rounded-lg border-transparent px-3 py-2 text-sm shadow-none"
            />
          </Form.Field>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" variant="confirm" size="sm" disabled={!validationResult.success}>
              创建
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
