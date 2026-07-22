import type { NodePortRenderProps } from '@ai-workflow/nodes-ui'
import { Handle, Position } from '@xyflow/react'

// 渲染工作流节点的端口
export const WorkflowNodeHandle = ({ direction, port, portId }: NodePortRenderProps) => {
  return (
    <Handle
      id={portId}
      type={direction === 'input' ? 'target' : 'source'}
      position={direction === 'input' ? Position.Left : Position.Right}
      title={port.label ?? portId}
      className="border-background bg-primary"
    />
  )
}
