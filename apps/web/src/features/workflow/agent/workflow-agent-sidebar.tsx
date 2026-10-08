import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react'
import { WorkflowAgentPanel } from './workflow-agent-panel'

export function WorkflowAgentSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reducedMotion = useReducedMotion()

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="workflow-agent-sidebar"
            className="bg-workspace-background absolute inset-y-0 right-0 z-30 min-h-0 max-w-full shrink-0 overflow-hidden lg:relative lg:inset-auto lg:z-0"
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing)
                return
              event.preventDefault()
              event.stopPropagation()
              onClose()
            }}
            initial={{ width: '0rem' }}
            animate={{ width: '25rem' }}
            exit={{ width: '0rem' }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="h-full w-[min(25rem,100cqw)] pl-1"
              initial={{ x: reducedMotion ? 0 : 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reducedMotion ? 0 : 24, opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.2, ease: 'easeOut' }}
            >
              <WorkflowAgentPanel onClose={onClose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
