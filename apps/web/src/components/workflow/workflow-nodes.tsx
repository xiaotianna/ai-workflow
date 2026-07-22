import type { NodeProps, NodeTypes } from '@xyflow/react'
import type { WorkflowCanvasNode } from './types'
import { createBuiltinNodeUIRegistry, RenderNode } from '@ai-workflow/nodes-ui'
import { nodeRegistry } from '@ai-workflow/core'
import { WorkflowNodeHandle } from './workflow-node-handle'

const nodeUIRegistry = createBuiltinNodeUIRegistry(nodeRegistry)

const WorkflowNode = ({ data, id, selected, type }: NodeProps<WorkflowCanvasNode>) => {
  return (
    <RenderNode
      node={{ id, type, config: data }}
      nodeRegistry={nodeRegistry}
      uiRegistry={nodeUIRegistry}
      selected={selected}
      renderPort={(props) => <WorkflowNodeHandle {...props} />}
    />
  )
}

// 动态注册react flow需要的node节点（nodeTypes）
export const workflowNodeTypes = nodeRegistry.list().reduce<NodeTypes>((nodeTypes, nodeType) => {
  nodeTypes[nodeType.definition.type] = WorkflowNode
  return nodeTypes
}, {})
