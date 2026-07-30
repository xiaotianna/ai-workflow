import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export function useWorkflowNavigationGuard(shouldBlock: boolean) {
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (!shouldBlock) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [shouldBlock])

  useEffect(() => {
    if (blocker.state === 'blocked' && !shouldBlock) {
      blocker.proceed()
    }
  }, [blocker, shouldBlock])

  return {
    blocked: blocker.state === 'blocked',
    leave() {
      if (blocker.state === 'blocked') {
        blocker.proceed()
      }
    },
    stay() {
      if (blocker.state === 'blocked') {
        blocker.reset()
      }
    },
  }
}
