import { getNodePorts } from '@ai-workflow/core'
import type { NodeDefinition, NodeRegistry, WorkflowNode } from '@ai-workflow/core'
import type { NodePortRender } from '../contracts/node-content'
import type { NodeUIRegistry } from '../registry'
import { BaseNode } from './base-node'
import { DefaultNodeContent } from './default-node-content'

export interface RenderNodeProps {
  node: Readonly<WorkflowNode>
  nodeRegistry: NodeRegistry
  uiRegistry: NodeUIRegistry
  selected?: boolean
  disabled?: boolean
  onSelect?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  renderPort?: NodePortRender
}

const EMPTY_PORTS = {
  inputs: {},
  outputs: {},
} as const

export const RenderNode = ({
  node,
  nodeRegistry,
  uiRegistry,
  selected,
  disabled,
  onSelect,
  onDelete,
  renderPort,
}: RenderNodeProps) => {
  const nodeType = nodeRegistry.get(node.type)

  if (!nodeType) {
    const unknownDefinition: NodeDefinition = {
      type: node.type,
      label: `未知节点：${node.type}`,
      description: '当前节点类型没有注册到 workflow-core',
      icon: 'unknown',
      ports: EMPTY_PORTS,
    }

    return (
      <BaseNode
        nodeId={node.id}
        definition={unknownDefinition}
        ports={EMPTY_PORTS}
        selected={selected}
        disabled={disabled}
        onSelect={onSelect ? () => onSelect(node.id) : undefined}
        onDelete={onDelete ? () => onDelete(node.id) : undefined}
        renderPort={renderPort}
      >
        <div className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
          请检查节点插件或注册配置
        </div>
      </BaseNode>
    )
  }

  const ports = getNodePorts(nodeType, node.config)
  const Content = uiRegistry.get(node.type) ?? DefaultNodeContent

  return (
    <BaseNode
      nodeId={node.id}
      definition={nodeType.definition}
      ports={ports}
      selected={selected}
      disabled={disabled}
      onSelect={onSelect ? () => onSelect(node.id) : undefined}
      onDelete={onDelete ? () => onDelete(node.id) : undefined}
      renderPort={renderPort}
    >
      <Content node={node} definition={nodeType.definition} ports={ports} config={node.config} />
    </BaseNode>
  )
}
