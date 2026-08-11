import { Button } from '@ai-workflow/ui/components/button'
import { cn } from '@ai-workflow/ui/lib/utils'
import { CircleCheck, CircleX, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'

const selectionActionButtonClassName =
  'hover:bg-[color-mix(in_oklab,var(--primary)_14%,var(--background))] focus-visible:bg-[color-mix(in_oklab,var(--primary)_14%,var(--background))] dark:hover:bg-[color-mix(in_oklab,var(--primary)_14%,var(--background))] dark:focus-visible:bg-[color-mix(in_oklab,var(--primary)_14%,var(--background))]'

const selectionDestructiveButtonClassName =
  'text-destructive hover:bg-[color-mix(in_oklab,var(--destructive)_12%,var(--background))] hover:text-destructive focus-visible:bg-[color-mix(in_oklab,var(--destructive)_12%,var(--background))] focus-visible:text-destructive dark:hover:bg-[color-mix(in_oklab,var(--destructive)_12%,var(--background))] dark:focus-visible:bg-[color-mix(in_oklab,var(--destructive)_12%,var(--background))]'

interface KnowledgeSelectionActionsProps {
  ariaLabel: string
  busy?: boolean
  count: number
  disableActions?: boolean
  onCancel: () => void
  onDelete: () => void
  onDisable: () => void
  onEnable: () => void
}

export function KnowledgeSelectionActions({
  ariaLabel,
  busy = false,
  count,
  disableActions = false,
  onCancel,
  onDelete,
  onDisable,
  onEnable,
}: KnowledgeSelectionActionsProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {count > 0 ? (
          <motion.div
            key="knowledge-selection-actions"
            className="pointer-events-none absolute bottom-16 left-0 z-20 flex w-full justify-center px-4"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div
              role="toolbar"
              aria-label={ariaLabel}
              aria-busy={busy}
              className="border-primary/40 pointer-events-auto flex items-center gap-x-1 rounded-[10px] border bg-[color-mix(in_oklab,var(--primary)_6%,var(--background))] p-1 shadow-xl"
            >
              <div className="inline-flex items-center gap-x-2 py-1 pr-3 pl-2">
                <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-md text-xs font-medium">
                  {count}
                </span>
                <span className="text-primary text-[13px] leading-4 font-semibold">已选择</span>
              </div>

              <div aria-hidden className="bg-border mx-0.5 h-3.5 w-px shrink-0" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(selectionActionButtonClassName, 'gap-x-0.5 px-3')}
                disabled={busy || disableActions}
                onClick={onEnable}
              >
                <CircleCheck aria-hidden className="size-4" />
                <span className="px-0.5">启用</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(selectionActionButtonClassName, 'gap-x-0.5 px-3')}
                disabled={busy || disableActions}
                onClick={onDisable}
              >
                <CircleX aria-hidden className="size-4" />
                <span className="px-0.5">禁用</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(selectionDestructiveButtonClassName, 'gap-x-0.5 px-3')}
                disabled={busy}
                onClick={onDelete}
              >
                <Trash2 aria-hidden className="size-4" />
                <span className="px-0.5">删除</span>
              </Button>

              <div aria-hidden className="bg-border mx-0.5 h-3.5 w-px shrink-0" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(selectionActionButtonClassName, 'px-3')}
                disabled={busy}
                onClick={onCancel}
              >
                <span className="px-0.5">取消</span>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  )
}
