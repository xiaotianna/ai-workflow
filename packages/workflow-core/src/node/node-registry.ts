import type { NodeType } from './node-definition'

export interface NodeRegistryReader {
  has(type: string): boolean
  get(type: string): NodeType | undefined
  getOrThrow(type: string): NodeType
  list(): readonly NodeType[]
}

class ReadonlyNodeRegistry implements NodeRegistryReader {
  private readonly nodes: ReadonlyMap<string, NodeType>

  constructor(nodes: ReadonlyMap<string, NodeType>) {
    this.nodes = new Map(nodes)
    Object.freeze(this)
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
    return Object.freeze([...this.nodes.values()])
  }
}

export class NodeRegistryBuilder {
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

  build(): NodeRegistryReader {
    return new ReadonlyNodeRegistry(this.nodes)
  }
}

/** @deprecated 新代码应通过 NodeRegistryBuilder 构建并只暴露 NodeRegistryReader。 */
export class NodeRegistry extends NodeRegistryBuilder implements NodeRegistryReader {
  private reader: NodeRegistryReader

  constructor(initialNodes: Iterable<NodeType> = []) {
    super(initialNodes)
    this.reader = super.build()
  }

  override register(node: NodeType): this {
    super.register(node)
    this.reader = super.build()
    return this
  }

  override registerAll(nodes: Iterable<NodeType>): this {
    for (const node of nodes) {
      this.register(node)
    }
    return this
  }

  has(type: string): boolean {
    return this.reader.has(type)
  }

  get(type: string): NodeType | undefined {
    return this.reader.get(type)
  }

  getOrThrow(type: string): NodeType {
    return this.reader.getOrThrow(type)
  }

  list(): readonly NodeType[] {
    return this.reader.list()
  }
}
