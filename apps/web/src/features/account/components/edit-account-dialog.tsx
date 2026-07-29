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
import { showToast } from '@ai-workflow/ui/lib/toast'
import { useEffect, useState, type FormEvent } from 'react'

import { updateCurrentUser } from '@/api/auth'
import { UserAvatar } from '@/components/user-avatar'
import type { AuthUser } from '@/features/auth'

import { editAccountSchema, type EditAccountFormInput } from '../schema'

interface EditAccountDialogProps {
  open: boolean
  user: AuthUser
  onOpenChange: (open: boolean) => void
  onUpdated: (user: AuthUser) => void
}

export function EditAccountDialog({ open, user, onOpenChange, onUpdated }: EditAccountDialogProps) {
  const { form, setForm, updateFormField, resetForm } = useFormData<EditAccountFormInput>({
    username: user.username,
    oldPassword: '',
    newPassword: '',
  })
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof EditAccountFormInput, boolean>>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const validationResult = validateFormByZod(editAccountSchema, form)
  const formErrors = validationResult.errors
  const avatarUsername = form.username.trim() || user.username

  useEffect(() => {
    if (!open) {
      setForm({
        username: user.username,
        oldPassword: '',
        newPassword: '',
      })
      setTouchedFields({})
    }
  }, [open, setForm, user.username])

  function markFieldTouched(field: keyof EditAccountFormInput) {
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
    if (isSubmitting) {
      return
    }

    if (!nextOpen) {
      resetDialogForm()
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const result = validateFormByZod(editAccountSchema, form)

    if (!result.success) {
      setTouchedFields({
        username: true,
        oldPassword: true,
        newPassword: true,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const updatedUser = await updateCurrentUser(result.data)
      setForm({
        username: updatedUser.username,
        oldPassword: '',
        newPassword: '',
      })
      setTouchedFields({})
      onUpdated(updatedUser)
      showToast('success', '用户信息已更新')
      onOpenChange(false)
    } catch {
      return
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>编辑账户</DialogTitle>
        </DialogHeader>

        <div className="bg-muted/60 flex items-center gap-3 rounded-xl p-3">
          <UserAvatar username={avatarUsername} className="size-12" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs leading-4">手机号</p>
            <p className="truncate text-sm leading-5 font-medium">{user.phone}</p>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Field
            required
            label="用户名"
            error={touchedFields.username ? formErrors.username : undefined}
          >
            <Input
              value={form.username}
              onChange={(event) => updateFormField('username', event.target.value)}
              onBlur={() => markFieldTouched('username')}
              aria-label="用户名"
              aria-invalid={Boolean(touchedFields.username && formErrors.username)}
              autoComplete="username"
              maxLength={40}
              placeholder="输入用户名"
              className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
            />
          </Form.Field>

          <Form.Field
            label="旧密码"
            error={touchedFields.oldPassword ? formErrors.oldPassword : undefined}
          >
            <Input
              value={form.oldPassword}
              onChange={(event) => updateFormField('oldPassword', event.target.value)}
              onBlur={() => markFieldTouched('oldPassword')}
              aria-label="旧密码（可选）"
              aria-invalid={Boolean(touchedFields.oldPassword && formErrors.oldPassword)}
              autoComplete="current-password"
              type="password"
              placeholder="输入旧密码"
              className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
            />
          </Form.Field>

          <Form.Field
            label="新密码"
            error={touchedFields.newPassword ? formErrors.newPassword : undefined}
          >
            <Input
              value={form.newPassword}
              onChange={(event) => updateFormField('newPassword', event.target.value)}
              onBlur={() => markFieldTouched('newPassword')}
              aria-label="新密码（可选）"
              aria-invalid={Boolean(touchedFields.newPassword && formErrors.newPassword)}
              autoComplete="new-password"
              type="password"
              placeholder="输入新密码"
              className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
            />
          </Form.Field>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm" disabled={isSubmitting}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="confirm"
              size="sm"
              disabled={isSubmitting || !validationResult.success}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
