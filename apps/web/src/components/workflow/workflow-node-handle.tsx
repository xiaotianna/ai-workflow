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
      style={direction === 'input' ? { left: -2 } : { right: -2 }}
      className="bg-primary! h-3.5! min-h-0! w-1! min-w-0! rounded-[1.5px]! border-0! after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-['']"
    />
  )
}
