import { Button } from '@ai-workflow/ui/components/button'
import { nodeRegistry } from '@ai-workflow/core'
import { getNodeThemeColor, NodeIcon } from '@ai-workflow/nodes-ui'
import {
  MiniMap,
  type MiniMapNodeProps,
  useInternalNode,
  useReactFlow,
  useStore,
} from '@xyflow/react'
import { Minus, Plus } from 'lucide-react'

import type { WorkflowCanvasNode } from '@/components/workflow/types'

const zoomSelector = (state: { transform: [number, number, number] }) => state.transform[2]

const WorkflowMiniMapNode = ({
  className,
  height,
  id,
  onClick,
  selected,
  width,
  x,
  y,
}: MiniMapNodeProps) => {
  const internalNode = useInternalNode<WorkflowCanvasNode>(id)
  const nodeType = internalNode?.internals.userNode.type
  const icon = nodeType ? nodeRegistry.get(nodeType)?.definition.icon : undefined
  const themeColor = getNodeThemeColor(nodeType)
  const radius = Math.min(width, height) * 0.18
  const iconSize = Math.min(width, height) * 0.5
  const iconX = x + (width - iconSize) / 2
  const iconY = y + (height - iconSize) / 2

  return (
    <g className={className} onClick={onClick ? (event) => onClick(event, id) : undefined}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        fill={themeColor}
        stroke={selected ? 'var(--primary-foreground)' : 'transparent'}
        strokeWidth={selected ? 3 : 0}
        shapeRendering="geometricPrecision"
      />
      <NodeIcon
        icon={icon}
        x={iconX}
        y={iconY}
        width={iconSize}
        height={iconSize}
        color="var(--primary-foreground)"
        fill={icon === 'play' ? 'var(--primary-foreground)' : 'none'}
        strokeWidth={2.25}
        pointerEvents="none"
        aria-hidden
      />
    </g>
  )
}

export const WorkflowCanvasViewer = () => {
  const { zoomIn, zoomOut } = useReactFlow()
  const zoom = useStore(zoomSelector)
  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="nodrag nopan nowheel border-border bg-background/95 overflow-hidden rounded-xl border-[0.5px] shadow-xs backdrop-blur-[5px]">
      <MiniMap
        className="relative! m-0! rounded-none! border-0! shadow-none!"
        style={{ width: 152, height: 88 }}
        bgColor="var(--background)"
        maskColor="color-mix(in oklab, var(--muted) 60%, transparent)"
        nodeComponent={WorkflowMiniMapNode}
        nodeStrokeWidth={0}
        pannable
        zoomable
      />
      <div className="border-border bg-background/95 flex h-8 items-center justify-center gap-1 border-t-[0.5px] px-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="缩小"
          className="text-muted-foreground"
          onClick={() => void zoomOut({ duration: 150 })}
        >
          <Minus className="size-3.5" aria-hidden />
        </Button>
        <output
          className="text-muted-foreground min-w-11 text-center text-xs font-medium tabular-nums"
          aria-live="polite"
        >
          {zoomPercent}%
        </output>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="放大"
          className="text-muted-foreground"
          onClick={() => void zoomIn({ duration: 150 })}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
