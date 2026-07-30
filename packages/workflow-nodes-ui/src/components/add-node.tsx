import type { NodeType } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Plus } from 'lucide-react'
import { type ComponentProps, useRef, useState } from 'react'

import { NodeSelectorPopover } from './node-selector-popover'

interface AddNodeProps {
  nodeTypes: readonly NodeType[]
  disabledNodeTypes?: ReadonlySet<string>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAddNode: (type: string) => void
  operationLabel?: string
}

export function AddNodeButton(props: Omit<ComponentProps<typeof Button>, 'children'>) {
  return (
    <Button type="button" size="sm" aria-haspopup="dialog" {...props}>
      <Plus className="size-3.5" aria-hidden />
      添加节点
    </Button>
  )
}

export const AddNode = ({
  nodeTypes,
  disabledNodeTypes,
  open: controlledOpen,
  onOpenChange,
  onAddNode,
  operationLabel = '添加',
}: AddNodeProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen

  function handleOpenChange(nextOpen: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  return (
    <>
      <AddNodeButton
        ref={triggerRef}
        aria-expanded={open}
        onClick={() => handleOpenChange(!open)}
      />
      <NodeSelectorPopover
        anchor={triggerRef.current}
        nodeTypes={nodeTypes}
        disabledNodeTypes={disabledNodeTypes}
        open={open}
        operationLabel={operationLabel}
        onOpenChange={handleOpenChange}
        onSelectNode={onAddNode}
      />
    </>
  )
}
