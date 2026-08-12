import type { WorkflowEnvironmentVariable } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Popover, PopoverTrigger } from '@ai-workflow/ui/components/popover'
import { Plus } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useRef, useState } from 'react'

import { WorkflowEnvironmentVariablePopover } from './workflow-environment-variable-popover'
import { WorkflowEnvironmentVariableItem } from './workflow-environment-variable-item'

interface WorkflowEnvironmentVariablesPanelProps {
  variables: readonly WorkflowEnvironmentVariable[]
  onAdd: (variable: WorkflowEnvironmentVariable) => void
  onDelete: (variableId: string) => boolean
  onUpdate: (variable: WorkflowEnvironmentVariable) => void
}

export function WorkflowEnvironmentVariablesPanel({
  variables,
  onAdd,
  onDelete,
  onUpdate,
}: WorkflowEnvironmentVariablesPanelProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null),
    [formOpen, setFormOpen] = useState(false),
    [formAlignOffset, setFormAlignOffset] = useState(0),
    [editingVariableId, setEditingVariableId] = useState<string>(),
    [deletingVariableId, setDeletingVariableId] = useState<string>(),
    editingVariable = variables.find((variable) => variable.id === editingVariableId),
    deletingVariable = variables.find((variable) => variable.id === deletingVariableId)

  function prepareAddForm() {
    setEditingVariableId(undefined)
  }

  function updateFormAlignOffset() {
    const trigger = addButtonRef.current,
      auxiliaryPanel = trigger?.closest('#workflow-auxiliary-panel')

    if (!trigger || !auxiliaryPanel) {
      setFormAlignOffset(0)
      return
    }

    setFormAlignOffset(
      auxiliaryPanel.getBoundingClientRect().top - trigger.getBoundingClientRect().top,
    )
  }

  function handleFormOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      updateFormAlignOffset()
    }

    setFormOpen(nextOpen)
  }

  function openEditPopover(variableId: string) {
    setEditingVariableId(variableId)
    updateFormAlignOffset()
    setFormOpen(true)
  }

  function handleSubmit(variable: WorkflowEnvironmentVariable) {
    if (editingVariable) {
      onUpdate(variable)
      return
    }

    onAdd(variable)
  }

  function handleDelete() {
    if (!deletingVariable || !onDelete(deletingVariable.id)) return

    setDeletingVariableId(undefined)
  }

  return (
    <>
      <div className="px-4 py-4">
        <Popover open={formOpen} onOpenChange={handleFormOpenChange}>
          <PopoverTrigger asChild>
            <Button ref={addButtonRef} type="button" size="sm" onClick={prepareAddForm}>
              <Plus className="size-3.5" aria-hidden />
              添加环境变量
            </Button>
          </PopoverTrigger>

          <WorkflowEnvironmentVariablePopover
            open={formOpen}
            variable={editingVariable}
            variables={variables}
            alignOffset={formAlignOffset}
            onOpenChange={handleFormOpenChange}
            onSubmit={handleSubmit}
          />
        </Popover>

        <MotionConfig reducedMotion="user">
          <ul className="mt-4 space-y-1">
            <AnimatePresence initial={false}>
              {variables.map((variable) => (
                <motion.li
                  layout="position"
                  key={variable.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <WorkflowEnvironmentVariableItem
                    variable={variable}
                    onEdit={() => openEditPopover(variable.id)}
                    onDelete={() => setDeletingVariableId(variable.id)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </MotionConfig>
      </div>

      <Dialog
        open={Boolean(deletingVariable)}
        onOpenChange={(open) => {
          if (!open) setDeletingVariableId(undefined)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除环境变量</DialogTitle>
            <DialogDescription>
              删除“{deletingVariable?.name}”后可通过撤销恢复；正在被节点引用的变量不能删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                取消
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
