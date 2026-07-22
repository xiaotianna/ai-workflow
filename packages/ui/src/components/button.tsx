import * as React from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '../lib/utils'

const primaryButtonStyles =
  'bg-primary text-primary-foreground shadow-xs hover:bg-primary/85 focus-visible:bg-primary/85 active:bg-primary/70 active:shadow-none disabled:border-transparent disabled:bg-button-primary-disabled disabled:text-primary-foreground disabled:shadow-none disabled:opacity-100'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive dark:aria-invalid:border-destructive/70 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default:
          'h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-9',
        'icon-lg': 'size-10',
        'icon-sm':
          'size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        lg: 'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        sm: 'h-8 gap-1 rounded-lg px-3.5 text-[13px] leading-4 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      },
      variant: {
        confirm: primaryButtonStyles,
        default: primaryButtonStyles,
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:bg-destructive/30',
        ghost:
          'hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 dark:focus-visible:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline focus-visible:underline',
        outline:
          'border-border bg-background shadow-xs hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:focus-visible:bg-input/50',
        secondary:
          'border-[0.5px] border-button-secondary-border bg-button-secondary-bg text-button-secondary-foreground shadow-xs backdrop-blur-[5px] hover:border-button-secondary-border-hover hover:bg-button-secondary-bg-hover focus-visible:bg-button-secondary-bg-hover active:border-button-secondary-border-hover active:bg-button-secondary-bg-active active:shadow-none disabled:border-button-secondary-border-disabled disabled:bg-button-secondary-bg-disabled disabled:text-button-secondary-foreground-disabled disabled:shadow-none disabled:backdrop-blur-xs disabled:opacity-100 aria-expanded:border-button-secondary-border-hover aria-expanded:bg-button-secondary-bg-hover',
      },
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
