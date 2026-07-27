import type { ReactNode } from 'react'
import type { NodeDefinition } from '@ai-workflow/core'
import type { NodePortRender } from '../../contracts/node-content'
import { NodeHeader } from './node-header'
import { NodePortsRender } from './node-ports-render'
import { NodeWrapper } from './node-wrapper'

export interface BaseNodeProps {
  nodeId: string
  definition: NodeDefinition
  ports: NodeDefinition['ports']
  selected?: boolean
  disabled?: boolean
  onSelect?: () => void
  onDelete?: () => void
  // 渲染端口
  renderPort?: NodePortRender
  // 各节点组件ui
  children?: ReactNode
}

export function BaseNode({
  nodeId,
  definition,
  ports,
  selected = false,
  disabled = false,
  onSelect,
  onDelete,
  renderPort,
  children,
}: BaseNodeProps) {
  return (
    <NodeWrapper selected={selected} disabled={disabled} onSelect={onSelect}>
      {/* Header */}
      <NodeHeader definition={definition} onDelete={onDelete} />

      {/* Body */}
      {children}

      {/* 输入端口样式 */}
      <NodePortsRender
        nodeId={nodeId}
        direction="input"
        ports={ports.inputs}
        renderPort={renderPort}
      />
      {/* 输出端口样式 */}
      <NodePortsRender
        nodeId={nodeId}
        direction="output"
        ports={ports.outputs}
        renderPort={renderPort}
      />
    </NodeWrapper>
  )
}
