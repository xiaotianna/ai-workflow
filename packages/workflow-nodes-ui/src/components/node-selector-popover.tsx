import type { NodeType } from '@ai-workflow/core'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Popover } from 'radix-ui'
import { useMemo } from 'react'

import { NodeSelectorPanel, type NodeSelectorTab } from './node-selector-panel'

export interface NodeSelectorAnchor {
  getBoundingClientRect: () => DOMRect
}

export interface NodeSelectorAnchorPosition {
  x: number
  y: number
}

interface NodeSelectorPopoverProps {
  anchor?: NodeSelectorAnchor | null
  anchorPosition?: NodeSelectorAnchorPosition
  nodeTypes: readonly NodeType[]
  disabledNodeTypes?: ReadonlySet<string>
  pluginGroupLabelByNodeType?: ReadonlyMap<string, string>
  activeTab?: NodeSelectorTab
  defaultActiveTab?: NodeSelectorTab
  onActiveTabChange?: (tab: NodeSelectorTab) => void
  open: boolean
  operationLabel?: string
  keepOpenOnFocusOutside?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  onOpenChange: (open: boolean) => void
  onSelectNode: (type: string) => void
}

const fallbackAnchor: NodeSelectorAnchor = {
  getBoundingClientRect: () => new DOMRect(),
}

function getNodeOperationErrorMessage(error: unknown, nodeLabel: string, operationLabel: string) {
  const prefix = `无法${operationLabel}「${nodeLabel}」节点`

  if (typeof error === 'object' && error !== null && 'issues' in error) {
    const issues = (error as { issues?: unknown }).issues
    if (Array.isArray(issues)) {
      const firstMessage = issues.find(
        (issue): issue is { message: string } =>
          typeof issue === 'object' &&
          issue !== null &&
          'message' in issue &&
          typeof issue.message === 'string',
      )?.message

      if (firstMessage) return `${prefix}：${firstMessage}`
    }
  }

  return error instanceof Error && error.message
    ? `${prefix}：${error.message}`
    : `${prefix}，请稍后重试`
}

export function NodeSelectorPopover({
  anchor,
  anchorPosition,
  nodeTypes,
  disabledNodeTypes,
  pluginGroupLabelByNodeType,
  activeTab,
  defaultActiveTab,
  onActiveTabChange,
  open,
  operationLabel = '添加',
  keepOpenOnFocusOutside = false,
  side = 'top',
  align = 'end',
  onOpenChange,
  onSelectNode,
}: NodeSelectorPopoverProps) {
  const virtualRef = useMemo(() => ({ current: anchor ?? fallbackAnchor }), [anchor])
  const hasAnchor = Boolean(anchorPosition || anchor)

  function handleSelect(type: string) {
    if (disabledNodeTypes?.has(type)) return

    const nodeLabel =
      nodeTypes.find(({ definition }) => definition.type === type)?.definition.label ?? type

    try {
      onSelectNode(type)
      onOpenChange(false)
    } catch (error) {
      onOpenChange(false)
      showToast('error', getNodeOperationErrorMessage(error, nodeLabel, operationLabel))
    }
  }

  return (
    <Popover.Root open={open && hasAnchor} onOpenChange={onOpenChange}>
      {anchorPosition ? (
        <Popover.Anchor
          aria-hidden
          className="pointer-events-none fixed size-0"
          style={{ left: anchorPosition.x, top: anchorPosition.y }}
        />
      ) : (
        <Popover.Anchor virtualRef={virtualRef} />
      )}
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          aria-label="节点选择"
          className="nodrag nopan nowheel border-border bg-popover/95 text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 origin-(--radix-popover-content-transform-origin) rounded-xl border-[0.5px] shadow-lg outline-hidden backdrop-blur-[5px] duration-100"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onFocusOutside={(event) => {
            if (keepOpenOnFocusOutside) event.preventDefault()
          }}
        >
          <NodeSelectorPanel
            key={open ? operationLabel : 'closed'}
            nodeTypes={nodeTypes}
            disabledNodeTypes={disabledNodeTypes}
            pluginGroupLabelByNodeType={pluginGroupLabelByNodeType}
            activeTab={activeTab}
            defaultActiveTab={defaultActiveTab}
            onActiveTabChange={onActiveTabChange}
            onSelectNode={handleSelect}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
