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
import { useState, type FormEvent } from 'react'

import {
  CREATE_STUDIO_APP_INITIAL_VALUES,
  createStudioAppSchema,
  studioAppIcons,
  type CreateStudioAppFormInput,
  type CreateStudioAppInput,
} from '../schema'

interface CreateBlankAppDialogProps {
  open: boolean
  onCreate: (input: CreateStudioAppInput) => void
  onOpenChange: (open: boolean) => void
}

export function CreateBlankAppDialog({ open, onCreate, onOpenChange }: CreateBlankAppDialogProps) {
  const { form, updateFormField, resetForm } = useFormData<CreateStudioAppFormInput>(
    CREATE_STUDIO_APP_INITIAL_VALUES,
  )
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof CreateStudioAppFormInput, boolean>>
  >({})
  const validationResult = validateFormByZod(createStudioAppSchema, form)
  const formErrors = validationResult.errors

  function markFieldTouched(field: keyof CreateStudioAppFormInput) {
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

    const result = validateFormByZod(createStudioAppSchema, form)
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
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>创建空白应用</DialogTitle>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Form.Field
            required
            label="应用名称 & 图标"
            error={touchedFields.title ? formErrors.title : undefined}
          >
            <div className="flex items-center gap-2">
              <Select
                value={form.icon}
                onValueChange={(value) =>
                  updateFormField('icon', value as CreateStudioAppFormInput['icon'])
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="应用图标"
                  className="w-11 shrink-0 justify-center rounded-lg px-2 [&>svg]:hidden"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start" className="min-w-28">
                  {studioAppIcons.map((icon) => (
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
                aria-label="应用名称"
                aria-invalid={Boolean(touchedFields.title && formErrors.title)}
                autoComplete="off"
                maxLength={40}
                placeholder="输入应用名称"
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
              aria-label="应用描述（可选）"
              aria-invalid={Boolean(touchedFields.description && formErrors.description)}
              maxLength={200}
              placeholder="输入应用描述"
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
