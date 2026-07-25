import type { NodeProps, NodeTypes } from '@xyflow/react'
import type { WorkflowCanvasNode } from './types'
import { createBuiltinNodeUIRegistry, RenderNode } from '@ai-workflow/nodes-ui'
import { BuiltinNodeType, nodeRegistry } from '@ai-workflow/core'
import { WorkflowNodeHandle } from './workflow-node-handle'
import { useWorkflowEditorActions } from './workflow-editor-actions-context'
import { LOOP_UNAVAILABLE_NODE_TYPES } from '@/utils/workflow/node-type-visibility'

const nodeUIRegistry = createBuiltinNodeUIRegistry(nodeRegistry)
// loop子容器内可以使用的节点类型
const LOOP_AVAILABLE_NODE_TYPES = nodeRegistry
  .list()
  .filter((nodeType) => !LOOP_UNAVAILABLE_NODE_TYPES.has(nodeType.definition.type))

const WorkflowNode = (props: NodeProps<WorkflowCanvasNode>) => {
  const { data, id, parentId, selected, type } = props
  const { addNodeToLoop } = useWorkflowEditorActions()

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
      dragHandleClassName="drag-handle"
      // 给完整自定义节点使用的特殊属性
      editorCapabilities={{
        [BuiltinNodeType.LOOP]: {
          addChildNode: {
            nodeTypes: LOOP_AVAILABLE_NODE_TYPES,
            onAddNode: (parentNodeId, childType) => addNodeToLoop(childType, parentNodeId),
          },
        },
      }}
    />
  )
}

// 动态注册react flow需要的node节点（nodeTypes）
export const workflowNodeTypes = nodeRegistry.list().reduce<NodeTypes>((nodeTypes, nodeType) => {
  nodeTypes[nodeType.definition.type] = WorkflowNode
  return nodeTypes
}, {})
