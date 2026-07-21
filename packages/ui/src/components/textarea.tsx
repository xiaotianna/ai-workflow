import * as React from 'react'

import { cn } from '../lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'bg-input placeholder:text-input-placeholder hover:border-input-focus hover:bg-background focus-visible:border-input-focus focus-visible:bg-background aria-invalid:border-destructive dark:bg-input dark:hover:bg-background dark:focus-visible:bg-background dark:aria-invalid:border-destructive/70 flex field-sizing-content min-h-16 w-full rounded-md border border-transparent px-2.5 py-2 text-base shadow-none transition-[background-color,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
