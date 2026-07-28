import * as React from 'react'

import { cn } from '../lib/utils'

interface FormFieldProps extends Omit<React.ComponentProps<'fieldset'>, 'children'> {
  actions?: React.ReactNode
  children: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  label: React.ReactNode
  required?: boolean
}

function FormField({
  actions,
  children,
  className,
  description,
  error,
  label,
  required = false,
  ...props
}: FormFieldProps) {
  return (
    <fieldset data-slot="form-field" className={cn('min-w-0 border-0 p-0', className)} {...props}>
      <legend
        data-slot="form-label"
        className={cn('text-foreground text-sm font-medium', actions && 'w-full')}
      >
        {actions ? (
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0">
              {label}
              {!required && <span className="text-muted-foreground font-normal">（可选）</span>}
            </span>
            <span data-slot="form-actions" className="shrink-0">
              {actions}
            </span>
          </span>
        ) : (
          <>
            {label}
            {!required && <span className="text-muted-foreground font-normal">（可选）</span>}
          </>
        )}
      </legend>
      <div data-slot="form-control" className="mt-1">
        {children}
      </div>
      {error ? (
        <p data-slot="form-error" className="text-destructive mt-1.5 text-xs leading-4">
          {error}
        </p>
      ) : description ? (
        <p data-slot="form-description" className="text-muted-foreground mt-1.5 text-xs leading-4">
          {description}
        </p>
      ) : undefined}
    </fieldset>
  )
}

function FormRoot({ className, ...props }: React.ComponentProps<'form'>) {
  return <form data-slot="form" className={cn('space-y-3', className)} {...props} />
}

const Form = Object.assign(FormRoot, { Field: FormField })

export { Form, FormField }
export type { FormFieldProps }
