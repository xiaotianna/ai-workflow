import { cn } from '@ai-workflow/ui/lib/utils'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, type ReactNode } from 'react'

interface FloatingSidePanelProps {
  ariaLabel: string
  children: ReactNode
  className?: string
  closeDisabled?: boolean
  open: boolean
  onClose: () => void
}

export function FloatingSidePanel({
  ariaLabel,
  children,
  className,
  closeDisabled = false,
  open,
  onClose,
}: FloatingSidePanelProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || closeDisabled) return
      event.preventDefault()
      onClose()
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [closeDisabled, onClose, open])

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open ? (
          <motion.aside
            key="floating-side-panel"
            aria-label={ariaLabel}
            className={cn(
              'bg-background border-border/60 absolute inset-y-2 right-2 z-20 flex min-h-0 w-[min(34rem,calc(100%-1rem))] flex-col overflow-hidden rounded-xl border-[0.5px] shadow-lg',
              className,
            )}
            initial={{ x: 'calc(100% + 1rem)', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 'calc(100% + 1rem)', opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {children}
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  )
}
