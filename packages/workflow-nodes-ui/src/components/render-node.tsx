import { getNodePorts } from '@ai-workflow/core'
import type { NodeDefinition, NodeRegistry, WorkflowNode } from '@ai-workflow/core'
import type {
  ModelReferenceDisplayResolver,
  NodeEditorCapabilities,
  NodeExecutionStatus,
  NodePortRender,
  VariableReferenceDisplayResolver,
} from '../contracts/node-content'
import type { NodeUIRegistry } from '../registry'
import { BaseNode, NodeContentList } from './base-node'
import { DefaultNodeContent, hasDefaultNodeContent } from './default-node-content'

export interface RenderNodeProps {
  node: Readonly<WorkflowNode>
  nodeRegistry: NodeRegistry
  uiRegistry: NodeUIRegistry
  selected?: boolean
  disabled?: boolean
  onSelect?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  renderPort?: NodePortRender
  resolveVariableReferenceDisplay?: VariableReferenceDisplayResolver
  resolveModelReferenceDisplay?: ModelReferenceDisplayResolver
  // 提供给节点的操作能力（给完整自定义节点使用，非base-node基础组件）
  editorCapabilities?: NodeEditorCapabilities
  // 可拖拽区域类名，给react flow使用（给完整自定义节点使用，非base-node基础组件）
  dragHandleClassName?: string
  executionStatus?: NodeExecutionStatus
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
  resolveVariableReferenceDisplay,
  resolveModelReferenceDisplay,
  editorCapabilities,
  dragHandleClassName,
  executionStatus,
}: RenderNodeProps) => {
  const nodeType = nodeRegistry.get(node.type)

  if (!nodeType) {
    const unknownDefinition: NodeDefinition = {
      type: node.type,
      label: node.label?.trim() || `未知节点：${node.type}`,
      description: node.description ?? '当前节点类型没有注册到 workflow-core',
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
        executionStatus={executionStatus}
      >
        <NodeContentList>
          <div className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
            请检查节点插件或注册配置
          </div>
        </NodeContentList>
      </BaseNode>
    )
  }

  const config = nodeType.schema.parse(node.config)
  // 合并解析成功后的config参数
  const resolvedNode = {
    ...node,
    config,
  }
  const resolvedDefinition: NodeDefinition = {
    ...nodeType.definition,
    label: node.label?.trim() || nodeType.definition.label,
    description: node.description ?? nodeType.definition.description,
  }
  const ports = getNodePorts(nodeType, node.config)
  const registration = uiRegistry.get(node.type)
  const selectNode = onSelect ? () => onSelect(node.id) : undefined
  const deleteNode = onDelete ? () => onDelete(node.id) : undefined

  if (registration?.kind === 'renderer') {
    const Renderer = registration.component

    return (
      <Renderer
        node={resolvedNode}
        definition={resolvedDefinition}
        ports={ports}
        selected={selected}
        disabled={disabled}
        onSelect={selectNode}
        onDelete={deleteNode}
        renderPort={renderPort}
        resolveVariableReferenceDisplay={resolveVariableReferenceDisplay}
        resolveModelReferenceDisplay={resolveModelReferenceDisplay}
        editorCapabilities={editorCapabilities}
        dragHandleClassName={dragHandleClassName}
        executionStatus={executionStatus}
      />
    )
  }

  const Content = registration?.component
  const body = Content ? (
    <Content
      node={resolvedNode}
      definition={resolvedDefinition}
      ports={ports}
      resolveVariableReferenceDisplay={resolveVariableReferenceDisplay}
      resolveModelReferenceDisplay={resolveModelReferenceDisplay}
    />
  ) : hasDefaultNodeContent(resolvedDefinition) ? (
    <DefaultNodeContent
      node={resolvedNode}
      definition={resolvedDefinition}
      ports={ports}
      resolveVariableReferenceDisplay={resolveVariableReferenceDisplay}
      resolveModelReferenceDisplay={resolveModelReferenceDisplay}
    />
  ) : null

  return (
    <BaseNode
      nodeId={node.id}
      definition={resolvedDefinition}
      ports={ports}
      selected={selected}
      disabled={disabled}
      onSelect={selectNode}
      onDelete={deleteNode}
      renderPort={renderPort}
      executionStatus={executionStatus}
    >
      {body}
    </BaseNode>
  )
}
