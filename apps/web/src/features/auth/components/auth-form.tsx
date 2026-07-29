import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { useState, type FormEvent } from 'react'

import {
  AUTH_FORM_INITIAL_VALUES,
  authFormSchema,
  type AuthFormInput,
  type AuthFormValues,
} from '../schema'

interface AuthFormProps {
  isSubmitting?: boolean
  onSubmit?: (values: AuthFormValues) => void | Promise<void>
}

export function AuthForm({ isSubmitting = false, onSubmit }: AuthFormProps) {
  const { form, updateFormField } = useFormData<AuthFormInput>(AUTH_FORM_INITIAL_VALUES)
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof AuthFormInput, boolean>>>(
    {},
  )
  const validationResult = validateFormByZod(authFormSchema, form)
  const formErrors = validationResult.errors

  function markFieldTouched(field: keyof AuthFormInput) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const result = validateFormByZod(authFormSchema, form)
    if (!result.success) {
      setTouchedFields({
        phone: true,
        password: true,
      })
      return
    }

    onSubmit?.(result.data)
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Field
        required
        label="手机号"
        error={touchedFields.phone ? formErrors.phone : undefined}
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          disabled={isSubmitting}
          value={form.phone}
          onChange={(event) => updateFormField('phone', event.target.value)}
          onBlur={() => markFieldTouched('phone')}
          aria-label="手机号"
          aria-invalid={Boolean(touchedFields.phone && formErrors.phone)}
          placeholder="输入手机号"
          className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
        />
      </Form.Field>

      <Form.Field
        required
        label="密码"
        error={touchedFields.password ? formErrors.password : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          value={form.password}
          onChange={(event) => updateFormField('password', event.target.value)}
          onBlur={() => markFieldTouched('password')}
          aria-label="密码"
          aria-invalid={Boolean(touchedFields.password && formErrors.password)}
          placeholder="输入密码"
          className="bg-muted/80 focus-visible:bg-background h-8 rounded-lg border-transparent px-3 text-sm shadow-none"
        />
      </Form.Field>

      <Button
        type="submit"
        variant="confirm"
        size="sm"
        disabled={isSubmitting || !validationResult.success}
        aria-busy={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? '登录中…' : '登录'}
      </Button>
    </Form>
  )
}
