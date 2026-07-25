import type { NodeRegistry } from '@ai-workflow/core'
import type { NodeUIRegistration } from '../contracts/node-content'

export class NodeUIRegistry {
  private readonly registrations = new Map<string, NodeUIRegistration>()

  constructor(registrations: Iterable<NodeUIRegistration> = []) {
    for (const registration of registrations) {
      this.register(registration)
    }
  }

  register(registration: NodeUIRegistration): this {
    if (this.registrations.has(registration.type)) {
      throw new Error(`节点 UI 已注册：${registration.type}`)
    }

    this.registrations.set(registration.type, registration)
    return this
  }

  get(type: string): NodeUIRegistration | undefined {
    return this.registrations.get(type)
  }

  has(type: string): boolean {
    return this.registrations.has(type)
  }

  /**
   * UI 注册了未知 Core 节点时快速失败
   * Core 节点没有专属 UI 是允许的，RenderNode 会使用默认内容组件
   */
  assertCompatible(nodeRegistry: NodeRegistry): this {
    for (const type of this.registrations.keys()) {
      if (!nodeRegistry.has(type)) {
        throw new Error(`节点 UI 没有对应的 Core 定义：${type}`)
      }
    }

    return this
  }
}
