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
      // 覆盖React Flow的默认负偏移，使端口内侧贴住节点边界并整体向外突出
      style={{
        top: 0,
        left: direction === 'input' ? 0 : undefined,
        right: direction === 'output' ? 0 : undefined,
        transform: direction === 'input' ? 'translate(-100%, -50%)' : 'translate(100%, -50%)',
      }}
      className="bg-primary! h-2! min-h-0! w-0.75! min-w-0! rounded-[1px]! border-0! after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-['']"
    />
  )
}
