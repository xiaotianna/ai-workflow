import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner'

import type { ToastType } from '../lib/toast'
import { cn } from '../lib/utils'

interface ToastStatusIconProps {
  className: string
  icon: LucideIcon
}

function ToastStatusIcon({ className, icon: Icon }: ToastStatusIconProps) {
  return (
    <span
      className={cn(
        'text-primary-foreground flex size-4 items-center justify-center rounded-full',
        className,
      )}
      aria-hidden
    >
      <Icon className="!m-0 size-3" strokeWidth={2.25} />
    </span>
  )
}

const TOAST_ICON_MAP = {
  success: <ToastStatusIcon className="bg-success" icon={CheckIcon} />,
  error: <ToastStatusIcon className="bg-destructive" icon={XIcon} />,
  warning: <ToastStatusIcon className="bg-warning" icon={TriangleAlertIcon} />,
  info: <ToastStatusIcon className="bg-info" icon={InfoIcon} />,
} satisfies Record<ToastType, ReactNode>

const TOAST_COLOR_CLASS_MAP = {
  success: 'toast-status-gradient toast-success-gradient !border-success/20',
  error: 'toast-status-gradient toast-error-gradient !border-destructive/20',
  warning: 'toast-status-gradient toast-warning-gradient !border-warning/20',
  info: 'toast-status-gradient toast-info-gradient !border-info/20',
} satisfies Record<ToastType, string>

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      closeButton
      icons={TOAST_ICON_MAP}
      toastOptions={{
        classNames: {
          toast:
            'toast-layout group toast !w-[min(22rem,calc(100vw-2rem))] !rounded-xl !border-[0.5px] !border-border !bg-background !text-foreground !shadow-lg',
          ...TOAST_COLOR_CLASS_MAP,
          icon: '!m-0 !size-5 !shrink-0 !p-0.5',
          content: '!min-w-0 !flex-1 !px-1 !py-0',
          title: '!break-words !text-sm !leading-5 !font-semibold',
          description: '!text-muted-foreground',
          closeButton:
            '!size-5 !transform-none !cursor-pointer !rounded-md !border-0 !bg-transparent !p-0 !text-muted-foreground !shadow-none hover:!bg-accent hover:!text-foreground focus-visible:!bg-accent focus-visible:!text-foreground [&>svg]:!size-4',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
