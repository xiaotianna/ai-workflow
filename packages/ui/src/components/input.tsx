import * as React from 'react'

import { cn } from '../lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'bg-input placeholder:text-input-placeholder hover:border-input-focus hover:bg-background focus-visible:border-input-focus focus-visible:bg-background aria-invalid:border-destructive dark:bg-input dark:hover:bg-background dark:focus-visible:bg-background dark:aria-invalid:border-destructive/70 h-9 w-full min-w-0 rounded-md border border-transparent px-2.5 py-1 text-base shadow-none transition-[background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
