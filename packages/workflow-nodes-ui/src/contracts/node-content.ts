/*************************** nodes ui约定文件 ******************************/
import type {
  InferNodeConfig,
  NodeDefinition,
  PortDefinition,
  NodeType,
  VariableReference,
  WorkflowNode,
} from '@ai-workflow/core'
import type { ComponentType, ReactNode } from 'react'

// 节点进入 UI 渲染层后，config 已经过对应节点 schema 解析
export type ResolvedWorkflowNode<TConfig = unknown> = Readonly<
  Omit<WorkflowNode, 'config'> & {
    readonly config: Readonly<TConfig>
  }
>

export interface VariableReferenceDisplay {
  readonly sourceLabel: string
  readonly variableName: string
}

export type VariableReferenceDisplayResolver = (
  reference: VariableReference,
) => VariableReferenceDisplay | undefined

export interface ModelReference {
  readonly groupId: string
  readonly configuredModelId: string
  readonly groupName?: string
  readonly modelId?: string
  readonly modelName?: string
  readonly providerType?: string
}

export interface ModelReferenceDisplay {
  readonly groupName: string
  readonly modelName: string
  readonly providerIcon: ReactNode
}

export type ModelReferenceDisplayResolver = (
  reference: ModelReference,
) => ModelReferenceDisplay | undefined

// 统一节点内容组件的入参
export interface NodeContentProps<TConfig = unknown> {
  readonly node: ResolvedWorkflowNode<TConfig>
  readonly definition: NodeDefinition
  readonly ports: NodeDefinition['ports']
  readonly resolveVariableReferenceDisplay?: VariableReferenceDisplayResolver
  readonly resolveModelReferenceDisplay?: ModelReferenceDisplayResolver
}

// 组件children类型
export type NodeContentComponent<TConfig = unknown> = ComponentType<NodeContentProps<TConfig>>

// 渲染端口组件props
export interface NodePortRenderProps {
  readonly nodeId: string
  readonly portId: string
  // 端口方向
  readonly direction: 'input' | 'output'
  readonly port: PortDefinition
}

// 传递动态port组件时会使用
export type NodePortRender = (props: NodePortRenderProps) => ReactNode

export type NodeExecutionStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface NodeExecutionProgress {
  readonly current: number
  readonly total: number
}

// 向容器中添加子节点的操作，目前是仅loop节点有子容器
export interface AddChildNodeAction {
  // 允许添加的节点类型列表，用来渲染节点选择菜单
  readonly nodeTypes: readonly NodeType[]
  // 用户选中节点类型后的回调，parentNodeId父容器id，nodeType为添加的子节点类型
  readonly onAddNode: (parentNodeId: string, nodeType: string) => void
}

// 单个节点类型可以消费的画布能力集合
export interface NodeCapabilities {
  readonly addChildNode?: AddChildNodeAction
  // 由画布层注入的缩放控件，例如 React Flow NodeResizeControl
  readonly resizeControl?: ReactNode
  // ...后续的其他扩展
}

/**
 * 注入节点可以消费的画布能力集合，key为节点类型，value为该节点可使用的能力
 * 例如：
 * {
    loop: {
      addChildNode: {
        nodeTypes: [httpNode, codeNode],
        onAddNode: (parentNodeId, nodeType) => {
          // 将节点添加到 loop 容器中
        },
      },
    }
  这么设计主要是为了方便后续为不同节点类型扩展不同能力
 */
export type NodeEditorCapabilities = Readonly<Record<string, NodeCapabilities>>

/**
 * 完整节点渲染组件的props
 * 普通节点内容不需要这些，因为外面的 BaseNode 已经处理了选择、删除、端口和外壳
 * 不管是BaseNode普通节点，还是带有子容器的特殊节点，都是在web只能使用
 */
export interface NodeRendererProps<TConfig = unknown> extends NodeContentProps<TConfig> {
  readonly selected?: boolean
  readonly disabled?: boolean
  readonly onSelect?: () => void
  readonly onDelete?: () => void
  readonly renderPort?: NodePortRender
  readonly editorCapabilities?: NodeEditorCapabilities
  readonly dragHandleClassName?: string
  readonly executionStatus?: NodeExecutionStatus
  readonly executionProgress?: NodeExecutionProgress
}

export type NodeRendererComponent<TConfig = unknown> = ComponentType<NodeRendererProps<TConfig>>

// 普通节点注册的类型
export interface NodeContentUIRegistration {
  readonly kind: 'content'
  readonly type: string
  readonly component: NodeContentComponent<any>
}

// 完整节点渲染器类型（特殊节点）
export interface NodeRendererUIRegistration {
  readonly kind: 'renderer'
  readonly type: string
  readonly component: NodeRendererComponent<any>
}

export type NodeUIRegistration = NodeContentUIRegistration | NodeRendererUIRegistration

/**
 * defineNodeUI和defineNodeRendererUI是注册两种组件的，分别是：普通组件，完整自定义渲染的组件
 * 1、普通组件依赖于base-node.tsx，已经处理好头部icon、onSelect这些内容
 * 2、完整自定义组件是需要自己处理的
 * 会在render-node.tsx中判断kind类型，然后去分别渲染对应的内容，RenderNode在web中使用
 */
export const defineNodeUI = <TNode extends NodeType>(
  nodeType: TNode,
  component: NodeContentComponent<InferNodeConfig<TNode>>,
): NodeUIRegistration => {
  return {
    kind: 'content',
    type: nodeType.definition.type,
    component,
  }
}

export const defineNodeRendererUI = <TNode extends NodeType>(
  nodeType: TNode,
  component: NodeRendererComponent<InferNodeConfig<TNode>>,
): NodeUIRegistration => {
  return {
    kind: 'renderer',
    type: nodeType.definition.type,
    component,
  }
}
