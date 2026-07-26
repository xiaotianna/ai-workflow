import { NodeResizeControl } from '@xyflow/react'
import { DEFAULT_LOOP_SIZE } from '@/utils/workflow/editor-elements'
import { useWorkflowLoopEditorContext } from './workflow-loop-editor-context'

export function LoopNodeResizeControl() {
  const { syncChildExtents } = useWorkflowLoopEditorContext()

  return (
    <NodeResizeControl
      position="bottom-right"
      minWidth={DEFAULT_LOOP_SIZE.width}
      minHeight={DEFAULT_LOOP_SIZE.height}
      style={{ top: 'auto', right: 0, bottom: 0, left: 'auto', translate: 'none' }}
      className="size-7! cursor-nwse-resize! border-0! bg-transparent! opacity-0 transition-opacity group-hover/loop:opacity-100"
      onResize={syncChildExtents}
      onResizeEnd={syncChildExtents}
    >
      <span
        aria-hidden
        className="border-muted-foreground/25 group-hover/loop:border-muted-foreground/45 pointer-events-none absolute right-0.75 bottom-0.75 size-3 rounded-br-[12px] border-r-[1.5px] border-b-[1.5px] transition-colors"
      />
    </NodeResizeControl>
  )
}
