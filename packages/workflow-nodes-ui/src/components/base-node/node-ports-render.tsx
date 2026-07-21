import { PortMap } from '@ai-workflow/core'
import { NodePortRender } from '../../contracts/node-content'
import { cn } from '@ai-workflow/ui/lib/utils'

interface NodePortsRenderProps {
  nodeId: string
  direction: 'input' | 'output'
  ports: PortMap
  renderPort?: NodePortRender
}

export const NodePortsRender = ({ nodeId, direction, ports, renderPort }: NodePortsRenderProps) => {
  const entries = Object.entries(ports)
  return (
    <>
      {entries.map(([portId, port], index) => {
        return (
          <div
            key={`${direction}:${portId}`}
            className={cn('absolute z-10', direction === 'input' ? '-left-1.5' : '-right-1.5')}
            style={{ top: `${56 + index * 28}px` }}
          >
            {renderPort ? (
              renderPort({
                nodeId,
                portId,
                direction,
                port,
              })
            ) : (
              <span
                title={port.label ?? portId}
                className="block h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow"
              />
            )}
          </div>
        )
      })}
    </>
  )
}
