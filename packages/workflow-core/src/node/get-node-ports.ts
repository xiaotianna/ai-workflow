import { NodeDefinition, NodeType } from './node-definition'

// 统一的节点端口解析方法，调用方不要自行判断节点是否存在动态端口
export const getNodePorts = <TSchema extends NodeType['schema']>(
  nodeTypeInstance: NodeType<TSchema>,
  rawConfig: unknown,
): NodeDefinition['ports'] => {
  const config = nodeTypeInstance.schema.parse(rawConfig)
  return nodeTypeInstance.resolvePorts?.(config) ?? nodeTypeInstance.definition.ports
}
