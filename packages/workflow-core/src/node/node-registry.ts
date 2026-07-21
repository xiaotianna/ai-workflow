import { NodeType } from './node-definition'

export type RegisteredNodeType = NodeType<any>

export class NodeRegistry {
  private readonly nodes = new Map<string, RegisteredNodeType>()

  register(node: RegisteredNodeType): void {
    const { type } = node.definition

    if (this.nodes.has(type)) {
      throw new Error(`节点已注册：${type}`)
    }

    this.nodes.set(type, node)
  }

  registerAll(nodes: Iterable<RegisteredNodeType>): void {
    for (const node of nodes) {
      this.register(node)
    }
  }

  get(type: string): RegisteredNodeType | undefined {
    return this.nodes.get(type)
  }

  getOrThrow(type: string): RegisteredNodeType {
    const node = this.nodes.get(type)

    if (!node) {
      throw new Error(`未知节点类型：${type}`)
    }

    return node
  }

  list(): RegisteredNodeType[] {
    return [...this.nodes.values()]
  }
}
