import { NodeDefinition } from './types/node'

const nodeRegistry = new Map<string, NodeDefinition>()

export function registerNode(node: NodeDefinition) {
  if (nodeRegistry.has(node.type)) {
    throw new Error(`Node "${node.type}" 已经注册`)
  }

  nodeRegistry.set(node.type, node)

  return node
}

export function getNodeDefinition(type: string) {
  const node = nodeRegistry.get(type)

  if (!node) {
    throw new Error(`Node "${type}" 未注册`)
  }

  return node
}

export function getAllNodeDefinitions() {
  return Array.from(nodeRegistry.values())
}

export function hasNodeDefinition(type: string) {
  return nodeRegistry.has(type)
}
