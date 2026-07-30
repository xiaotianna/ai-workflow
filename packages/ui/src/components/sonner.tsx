import { CircleAlert, CircleCheck, CircleX, InfoIcon, type LucideIcon } from 'lucide-react'
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
    <span className={cn('flex size-5 items-center justify-center', className)} aria-hidden>
      <Icon className="m-0! size-5" strokeWidth={2} />
    </span>
  )
}

const TOAST_ICON_MAP = {
  success: <ToastStatusIcon className="text-success" icon={CircleCheck} />,
  error: <ToastStatusIcon className="text-destructive" icon={CircleX} />,
  warning: <ToastStatusIcon className="text-warning" icon={CircleAlert} />,
  info: <ToastStatusIcon className="text-info" icon={InfoIcon} />,
} satisfies Record<ToastType, ReactNode>

const TOAST_COLOR_CLASS_MAP = {
  success: 'toast-status-gradient toast-success-gradient',
  error: 'toast-status-gradient toast-error-gradient',
  warning: 'toast-status-gradient toast-warning-gradient',
  info: 'toast-status-gradient toast-info-gradient',
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
            'toast-layout group toast !w-[min(22rem,calc(100vw-2rem))] !rounded-xl !border-0 !bg-background !text-foreground !shadow-lg',
          ...TOAST_COLOR_CLASS_MAP,
          icon: '!m-0 !size-5 !shrink-0 !p-0',
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
