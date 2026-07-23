import type { PortMap } from '@ai-workflow/core'
import type { NodePortRender } from '../../contracts/node-content'
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
            className={cn('absolute z-10', direction === 'input' ? 'left-0' : 'right-0')}
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
                className={cn(
                  'bg-primary block h-5 w-1 -translate-y-1/2 rounded-[1px]',
                  direction === 'input' ? '-translate-x-1/2' : 'translate-x-1/2',
                )}
              />
            )}
          </div>
        )
      })}
    </>
  )
}
