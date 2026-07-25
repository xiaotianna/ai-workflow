/*************************** nodes ui约定文件 ******************************/
import type {
  InferNodeConfig,
  NodeDefinition,
  PortDefinition,
  NodeType,
  WorkflowNode,
} from '@ai-workflow/core'
import type { ComponentType, ReactNode } from 'react'

// 统一节点内容组件的入参
export interface NodeContentProps<TConfig = unknown> {
  readonly node: Readonly<WorkflowNode>
  readonly definition: NodeDefinition
  readonly ports: NodeDefinition['ports']
  // config 只有校验通过才有值
  readonly config: Readonly<TConfig>
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

export interface NodeUIRegistration {
  readonly type: string
  readonly component: NodeContentComponent<any>
}

export const defineNodeUI = <TNode extends NodeType>(
  nodeType: TNode,
  component: NodeContentComponent<InferNodeConfig<TNode>>,
): NodeUIRegistration => {
  return {
    type: nodeType.definition.type,
    component,
  }
}
