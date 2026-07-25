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
}: NodeRendererProps<LoopNodeConfig>) {
  const addChildNodeAction = editorCapabilities?.[node.type]?.addChildNode

  return (
    <NodeWrapper
      ariaLabel="循环节点"
      variant="container"
      selected={selected}
      disabled={disabled}
      onSelect={onSelect}
    >
      <NodeHeader
        definition={definition}
        onDelete={onDelete}
        className={cn('h-16 items-center px-5 py-0', dragHandleClassName)}
      />

      <div className="bg-muted/30 mx-3 mb-3 h-[calc(100%-76px)] rounded-[22px]">
        {addChildNodeAction && addChildNodeAction.nodeTypes.length > 0 ? (
          <div className="nodrag nopan nowheel absolute top-20 right-5 z-10">
            <AddNode
              nodeTypes={addChildNodeAction.nodeTypes}
              onAddNode={(childType) => addChildNodeAction.onAddNode(node.id, childType)}
            />
          </div>
        ) : null}
      </div>

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
  )
}
