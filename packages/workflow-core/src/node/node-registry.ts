import type { NodeType } from './node-definition'

export class NodeRegistry {
  private readonly nodes = new Map<string, NodeType>()

  register(node: NodeType): void {
    const { type } = node.definition

    if (this.nodes.has(type)) {
      throw new Error(`节点已注册：${type}`)
    }

    this.nodes.set(type, node)
  }

  get(type: string): NodeType | undefined {
    return this.nodes.get(type)
  }

  getOrThrow(type: string): NodeType {
    const node = this.nodes.get(type)

    if (!node) {
      throw new Error(`未知节点类型：${type}`)
    }

    return node
  }

  list(): NodeType[] {
    return [...this.nodes.values()]
  }
}
