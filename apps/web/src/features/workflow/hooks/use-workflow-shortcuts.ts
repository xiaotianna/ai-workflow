import { useEffect } from 'react'

import type { useWorkflowEditor } from './use-workflow-editor'

interface UseWorkflowShortcutsOptions {
  editor: ReturnType<typeof useWorkflowEditor>
  addNodeOpen: boolean
  shortcutHelpOpen: boolean
  disabled?: boolean
  onAddNodeOpenChange: (open: boolean) => void
  onShortcutHelpOpenChange: (open: boolean) => void
}

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
    ),
  )
}

function getArrowOffset(key: string) {
  switch (key) {
    case 'ArrowUp': {
      return { x: 0, y: -1 }
    }
    case 'ArrowRight': {
      return { x: 1, y: 0 }
    }
    case 'ArrowDown': {
      return { x: 0, y: 1 }
    }
    case 'ArrowLeft': {
      return { x: -1, y: 0 }
    }
    default: {
      return undefined
    }
  }
}

export function useWorkflowShortcuts({
  editor,
  addNodeOpen,
  shortcutHelpOpen,
  disabled = false,
  onAddNodeOpenChange,
  onShortcutHelpOpenChange,
}: UseWorkflowShortcutsOptions) {
  useEffect(() => {
    if (disabled) {
      editor.finishNodeNudge()
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return

      const key = event.key.toLocaleLowerCase()
      const modifierPressed = event.metaKey || event.ctrlKey
      const arrowOffset = getArrowOffset(event.key)

      if (!arrowOffset) editor.finishNodeNudge()

      if (event.key === 'Escape') {
        if (shortcutHelpOpen) {
          event.preventDefault()
          onShortcutHelpOpenChange(false)
        } else if (addNodeOpen) {
          event.preventDefault()
          onAddNodeOpenChange(false)
        } else if (editor.cancelConnection()) {
          event.preventDefault()
        } else if (editor.clearSelection()) {
          event.preventDefault()
        }
        return
      }

      if (isTextEditingTarget(event.target)) return

      if (shortcutHelpOpen || addNodeOpen) return

      if (modifierPressed && !event.altKey) {
        if (key === 's' && !event.shiftKey) {
          event.preventDefault()
          void editor.saveWorkflow()
        } else if (key === 'z' && !event.shiftKey && editor.canUndo) {
          event.preventDefault()
          editor.undo()
        } else if (
          (key === 'z' && event.shiftKey && editor.canRedo) ||
          (key === 'y' && event.ctrlKey && editor.canRedo)
        ) {
          event.preventDefault()
          editor.redo()
        } else if (key === 'a' && !event.shiftKey) {
          event.preventDefault()
          editor.selectAllNodes()
        } else if (key === 'c' && !event.shiftKey && editor.copySelection()) {
          event.preventDefault()
        } else if (key === 'x' && !event.shiftKey && editor.cutSelection()) {
          event.preventDefault()
        } else if (key === 'v' && !event.shiftKey && editor.pasteSelection()) {
          event.preventDefault()
        } else if (key === 'd' && !event.shiftKey && editor.duplicateSelection()) {
          event.preventDefault()
        }
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (key === 'a' && event.shiftKey && !event.repeat) {
        event.preventDefault()
        onAddNodeOpenChange(true)
      } else if (key === 'l' && event.shiftKey && !event.repeat && editor.autoLayout()) {
        event.preventDefault()
      } else if (event.key === 'Enter' && !event.shiftKey && editor.openSelectedNodeConfig()) {
        event.preventDefault()
      } else if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !event.shiftKey &&
        editor.deleteSelection()
      ) {
        event.preventDefault()
      } else if (!event.shiftKey && arrowOffset && editor.nudgeSelectedNodes(arrowOffset)) {
        event.preventDefault()
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (getArrowOffset(event.key)) editor.finishNodeNudge()
    }

    function handleWindowBlur() {
      editor.finishNodeNudge()
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    globalThis.addEventListener('keyup', handleKeyUp)
    globalThis.addEventListener('blur', handleWindowBlur)

    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown)
      globalThis.removeEventListener('keyup', handleKeyUp)
      globalThis.removeEventListener('blur', handleWindowBlur)
    }
  }, [
    addNodeOpen,
    disabled,
    editor,
    onAddNodeOpenChange,
    onShortcutHelpOpenChange,
    shortcutHelpOpen,
  ])
}
