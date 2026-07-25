import type { PortMap } from '@ai-workflow/core'
import type { NodePortRender } from '../../contracts/node-content'
import { cn } from '@ai-workflow/ui/lib/utils'

const STACKED_PORT_TOP_OFFSET = 20
const STACKED_PORT_GAP = 28

export interface NodePortsRenderProps {
  nodeId: string
  direction: 'input' | 'output'
  ports: PortMap
  renderPort?: NodePortRender
  // 普通节点从顶部依次排列，容器节点可以将单个端口放在垂直中线
  layout?: 'stacked' | 'centered'
}

export const NodePortsRender = ({
  nodeId,
  direction,
  ports,
  renderPort,
  layout = 'stacked',
}: NodePortsRenderProps) => {
  const entries = Object.entries(ports)
  return (
    <>
      {entries.map(([portId, port], index) => {
        return (
          <div
            key={`${direction}:${portId}`}
            className={cn('absolute z-10', direction === 'input' ? 'left-0' : 'right-0')}
            style={{
              top:
                layout === 'centered'
                  ? '50%'
                  : `${STACKED_PORT_TOP_OFFSET + index * STACKED_PORT_GAP}px`,
            }}
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
