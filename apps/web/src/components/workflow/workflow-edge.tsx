import { AddNodeIconButton } from '@ai-workflow/nodes-ui'
import {
  BaseEdge,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
  type EdgeTypes,
} from '@xyflow/react'
import type { MouseEvent } from 'react'

import type { WorkflowCanvasNode } from './types'
import { useWorkflowAddNode } from './workflow-add-node-context'

const ADD_BUTTON_HIT_SIZE = 28

function WorkflowEdge({
  id,
  interactionWidth,
  markerEnd,
  markerStart,
  source,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  target,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps) {
  const { disabled, openInsertNode } = useWorkflowAddNode()
  const sourceNode = useInternalNode<WorkflowCanvasNode>(source)
  const targetNode = useInternalNode<WorkflowCanvasNode>(target)
  const insertable =
    !sourceNode?.internals.userNode.parentId && !targetNode?.internals.userNode.parentId
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  function handleAddNode(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const bounds = event.currentTarget.getBoundingClientRect()
    openInsertNode(
      id,
      { x: labelX, y: labelY },
      {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      },
    )
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={interactionWidth}
        style={style}
      />
      {!disabled && insertable ? (
        <foreignObject
          x={labelX - ADD_BUTTON_HIT_SIZE / 2}
          y={labelY - ADD_BUTTON_HIT_SIZE / 2}
          width={ADD_BUTTON_HIT_SIZE}
          height={ADD_BUTTON_HIT_SIZE}
          className="workflow-edge-add overflow-visible"
        >
          <div className="flex size-full items-center justify-center">
            <AddNodeIconButton
              tabIndex={-1}
              aria-label="在连线上添加节点"
              className="workflow-edge-add__button nodrag nopan"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={handleAddNode}
            />
          </div>
        </foreignObject>
      ) : null}
    </>
  )
}

export const workflowEdgeTypes = {
  default: WorkflowEdge,
} satisfies EdgeTypes
