import type { NodeProps, NodeTypes } from '@xyflow/react'
import type { WorkflowCanvasNode } from './types'
import { createBuiltinNodeUIRegistry, RenderNode } from '@ai-workflow/nodes-ui'
import { BuiltinNodeType, nodeRegistry } from '@ai-workflow/core'
import { WorkflowNodeHandle } from './workflow-node-handle'
import { WorkflowLoopNode } from './workflow-loop-node'

const nodeUIRegistry = createBuiltinNodeUIRegistry(nodeRegistry)

const WorkflowNode = (props: NodeProps<WorkflowCanvasNode>) => {
  const { data, id, parentId, selected, type } = props
  if (type === BuiltinNodeType.LOOP) {
    return <WorkflowLoopNode {...props} />
  }

  return (
    <RenderNode
      node={{
        id,
        type,
        config: data.config,
        inputs: data.inputs,
        outputs: data.outputs,
        parentId,
      }}
      nodeRegistry={nodeRegistry}
      uiRegistry={nodeUIRegistry}
      selected={selected}
      renderPort={(portProps) => <WorkflowNodeHandle {...portProps} />}
    />
  )
}

// 动态注册react flow需要的node节点（nodeTypes）
export const workflowNodeTypes = nodeRegistry.list().reduce<NodeTypes>((nodeTypes, nodeType) => {
  nodeTypes[nodeType.definition.type] = WorkflowNode
  return nodeTypes
}, {})
