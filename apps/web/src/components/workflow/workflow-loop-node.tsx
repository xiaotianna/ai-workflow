import { BuiltinNodeType, getNodePorts, loopNode, nodeRegistry } from '@ai-workflow/core'
import { NodeIcon } from '@ai-workflow/nodes-ui'
import { cn } from '@ai-workflow/ui/lib/utils'
import type { NodeProps } from '@xyflow/react'

import type { WorkflowCanvasNode } from '@/components/workflow/types'
import { WorkflowNodeHandle } from '@/components/workflow/workflow-node-handle'
import { useWorkflowEditorActions } from './workflow-editor-actions-context'
import { AddNode } from './add-node'
import { LOOP_UNAVAILABLE_NODE_TYPES } from '@/utils/workflow/node-type-visibility'

const LOOP_AVAILABLE_NODE_TYPES = nodeRegistry
  .list()
  .filter((nodeType) => !LOOP_UNAVAILABLE_NODE_TYPES.has(nodeType.definition.type))

function LoopAddNodeMenu({ loopId }: { loopId: string }) {
  const { addNodeToLoop } = useWorkflowEditorActions()

  return (
    <div className="nodrag nopan nowheel">
      <AddNode
        nodeTypes={LOOP_AVAILABLE_NODE_TYPES}
        onAddNode={(type) => addNodeToLoop(type, loopId)}
      />
    </div>
  )
}

export function WorkflowLoopNode({ id, data, selected }: NodeProps<WorkflowCanvasNode>) {
  const ports = getNodePorts(loopNode, data.config)
  const inputPort = ports.inputs.input
  const resultPort = ports.outputs.result

  return (
    <section
      aria-label="循环节点"
      className={cn(
        'relative size-full min-h-105 min-w-170',
        'bg-card/80 rounded-[28px] border shadow-xs',
        'transition-[border-color,box-shadow,background-color]',
        selected && 'border-primary shadow-lg',
      )}
    >
      <header className="drag-handle flex h-16 items-center gap-3 px-5">
        <NodeIcon icon={BuiltinNodeType.LOOP} />
        <div>
          <div className="text-sm font-semibold">循环</div>
          <div className="text-muted-foreground text-xs">
            最大循环次数：{String(data.config.maxIterations ?? 100)}
          </div>
        </div>
      </header>

      <div className="bg-muted/30 mx-3 mb-3 h-[calc(100%-76px)] rounded-[22px]">
        <div className="absolute top-20 right-5 z-10">
          <LoopAddNodeMenu loopId={id} />
        </div>
      </div>

      {inputPort ? (
        <WorkflowNodeHandle nodeId={id} portId="input" direction="input" port={inputPort} />
      ) : null}

      {resultPort ? (
        <WorkflowNodeHandle nodeId={id} portId="result" direction="output" port={resultPort} />
      ) : null}
    </section>
  )
}
