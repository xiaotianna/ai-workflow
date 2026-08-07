export const WORKFLOW_EXECUTION_CLASSES = {
  RUNTIME_CONTROL: 'runtime-control',
  TRUSTED_COMPUTE: 'trusted-compute',
  CONTROLLED_MODEL: 'controlled-model',
  CONTROLLED_HTTP: 'controlled-http',
  UNTRUSTED_SANDBOX: 'untrusted-sandbox',
} as const

export type WorkflowExecutionClass =
  (typeof WORKFLOW_EXECUTION_CLASSES)[keyof typeof WORKFLOW_EXECUTION_CLASSES]

type ExecutorExecutionClass = Exclude<WorkflowExecutionClass, 'runtime-control'>

export type WorkflowNodeExecutionRegistration =
  | { readonly nodeType: string; readonly kind: 'runtime-control' }
  | {
      readonly nodeType: string
      readonly kind: 'server-control'
      readonly handler: 'sub-workflow'
      readonly routingKey: string
    }
  | {
      readonly nodeType: string
      readonly kind: 'executor'
      readonly executionClass: ExecutorExecutionClass
      readonly classifiedRoutingKey: string
    }
  | {
      readonly nodeType: string
      readonly kind: 'unsupported'
      readonly reason: string
    }

export class WorkflowExecutionRegistry {
  private readonly registrations: ReadonlyMap<string, WorkflowNodeExecutionRegistration>

  constructor(registrations: Iterable<WorkflowNodeExecutionRegistration>) {
    const registrationMap = new Map<string, WorkflowNodeExecutionRegistration>()

    for (const registration of registrations) {
      if (registrationMap.has(registration.nodeType)) {
        throw new Error(`节点执行能力已注册：${registration.nodeType}`)
      }
      registrationMap.set(registration.nodeType, Object.freeze({ ...registration }))
    }

    this.registrations = registrationMap
    Object.freeze(this)
  }

  get(nodeType: string): WorkflowNodeExecutionRegistration | undefined {
    return this.registrations.get(nodeType)
  }

  getOrThrow(nodeType: string): WorkflowNodeExecutionRegistration {
    const registration = this.get(nodeType)
    if (!registration) throw new Error(`节点类型 ${nodeType} 没有执行能力登记`)
    return registration
  }

  list(): readonly WorkflowNodeExecutionRegistration[] {
    return Object.freeze([...this.registrations.values()])
  }
}
