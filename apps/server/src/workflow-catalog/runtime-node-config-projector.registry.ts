import {
  createRuntimeNodeConfigResolver,
  type RuntimeNodeConfigProjector,
  type RuntimeNodeConfigResolver,
} from '@ai-workflow/runtime'

export interface RuntimeNodeConfigProjectorRegistration {
  readonly nodeType: string
  readonly projector: RuntimeNodeConfigProjector
}

export class RuntimeNodeConfigProjectorRegistry {
  private readonly projectors: ReadonlyMap<string, RuntimeNodeConfigProjector>

  constructor(registrations: Iterable<RuntimeNodeConfigProjectorRegistration>) {
    const projectors = new Map<string, RuntimeNodeConfigProjector>()

    for (const registration of registrations) {
      if (projectors.has(registration.nodeType)) {
        throw new Error(`Runtime Config projector 已注册：${registration.nodeType}`)
      }
      projectors.set(registration.nodeType, registration.projector)
    }

    this.projectors = projectors
    Object.freeze(this)
  }

  has(nodeType: string): boolean {
    return this.projectors.has(nodeType)
  }

  listNodeTypes(): readonly string[] {
    return Object.freeze([...this.projectors.keys()])
  }

  createResolver(): RuntimeNodeConfigResolver {
    return createRuntimeNodeConfigResolver(Object.fromEntries(this.projectors))
  }
}
