import type { LoopNodeConfig } from '@ai-workflow/core'
import { cn } from '@ai-workflow/ui/lib/utils'

import { AddNode } from '../../components/add-node'
import { NodeHeader, NodePortsRender, NodeWrapper } from '../../components/base-node'
import type { NodeRendererProps } from '../../contracts/node-content'

export function LoopNode({
  node,
  definition,
  ports,
  selected = false,
  disabled = false,
  onSelect,
  onDelete,
  editorCapabilities,
  dragHandleClassName,
  renderPort,
  executionStatus,
  executionProgress,
}: NodeRendererProps<LoopNodeConfig>) {
  const nodeCapabilities = editorCapabilities?.[node.type]
  const addChildNodeAction = nodeCapabilities?.addChildNode
  const resizeControl = nodeCapabilities?.resizeControl

  return (
    <div className="group/loop relative size-full">
      <NodeWrapper
        ariaLabel={definition.label}
        selected={selected}
        disabled={disabled}
        onSelect={onSelect}
        wrapperClassName="size-full"
        className="flex size-full min-h-105 min-w-170 flex-col"
        executionStatus={executionStatus}
      >
        <NodeHeader
          definition={definition}
          onDelete={onDelete}
          executionStatus={executionStatus}
          executionDetail={
            executionStatus === 'RUNNING' && executionProgress ? (
              <span className="text-muted-foreground text-xs leading-4 font-medium tabular-nums">
                第 {executionProgress.current} / {executionProgress.total} 次
              </span>
            ) : null
          }
          className={cn('shrink-0', dragHandleClassName)}
          actions={
            addChildNodeAction && addChildNodeAction.nodeTypes.length > 0 ? (
              <div className="nodrag nopan nowheel">
                <AddNode
                  nodeTypes={addChildNodeAction.nodeTypes}
                  onAddNode={(childType) => addChildNodeAction.onAddNode(node.id, childType)}
                />
              </div>
            ) : null
          }
        />

        <div className="mx-3 mb-3 min-h-0 flex-1 rounded-xl bg-[#f2f4f7] bg-[radial-gradient(#e3e4ec_1px,transparent_1px)] bg-size-[20px_20px]" />

        <NodePortsRender
          nodeId={node.id}
          direction="input"
          ports={ports.inputs}
          renderPort={renderPort}
          layout="centered"
        />
        <NodePortsRender
          nodeId={node.id}
          direction="output"
          ports={ports.outputs}
          renderPort={renderPort}
          layout="centered"
        />
      </NodeWrapper>
      {resizeControl}
    </div>
  )
}
