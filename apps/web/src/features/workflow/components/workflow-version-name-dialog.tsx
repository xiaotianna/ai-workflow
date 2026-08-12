import type { StudioWorkflowVersionDto } from '@/api/studio'
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
import { useEffect, useState, type FormEvent } from 'react'

import { getWorkflowVersionNameFormInitialValues, workflowVersionNameFormSchema } from '../schema'

interface WorkflowVersionNameDialogProps {
  open: boolean
  version?: StudioWorkflowVersionDto
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => Promise<void>
}

export function WorkflowVersionNameDialog({
  open,
  version,
  onOpenChange,
  onSubmit,
}: WorkflowVersionNameDialogProps) {
  const [submitting, setSubmitting] = useState(false),
    [touched, setTouched] = useState(false),
    { form, resetForm, updateFormField } = useFormData(
      getWorkflowVersionNameFormInitialValues(version?.name),
    ),
    validation = validateFormByZod(workflowVersionNameFormSchema, form),
    fieldError = validation.success ? undefined : validation.errors.name

  useEffect(() => {
    if (!open) return

    resetForm()
    setSubmitting(false)
    setTouched(false)
  }, [open, version?.id, version?.name, resetForm])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && submitting) return
    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)

    const result = validateFormByZod(workflowVersionNameFormSchema, form)
    if (!result.success) return

    setSubmitting(true)
    try {
      await onSubmit(result.data.name)
      setSubmitting(false)
      onOpenChange(false)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={!submitting}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>命名版本</DialogTitle>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field required label="版本名称" error={touched ? fieldError : undefined}>
            <Input
              aria-label="版本名称"
              aria-invalid={Boolean(touched && fieldError)}
              autoComplete="off"
              disabled={submitting}
              maxLength={40}
              placeholder="输入版本名称"
              value={form.name}
              onBlur={() => setTouched(true)}
              onChange={(event) => updateFormField('name', event.target.value)}
            />
          </Form.Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={submitting}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="confirm"
              size="sm"
              disabled={!validation.success || submitting}
            >
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
