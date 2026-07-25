import type { NodeType } from './node-definition'

export class NodeRegistry {
  private readonly nodes = new Map<string, NodeType>()

  constructor(initialNodes: Iterable<NodeType> = []) {
    this.registerAll(initialNodes)
  }

  register(node: NodeType): this {
    const { type } = node.definition

    if (this.nodes.has(type)) {
      throw new Error(`节点已注册：${type}`)
    }

    this.nodes.set(type, node)
    return this
  }

  registerAll(nodes: Iterable<NodeType>): this {
    for (const node of nodes) {
      this.register(node)
    }

    return this
  }

  has(type: string): boolean {
    return this.nodes.has(type)
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

  list(): readonly NodeType[] {
    return [...this.nodes.values()]
  }
}
