import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { Check } from 'lucide-react'

import { cn } from '../lib/utils'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'border-input hover:border-input-focus focus-visible:border-input-focus data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:bg-input/30 peer aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 dark:data-checked:bg-primary relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border shadow-xs transition-[background-color,border-color] outline-none group-has-disabled/field:opacity-50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <Check aria-hidden className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
