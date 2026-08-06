import { EXECUTOR_ENABLED_CLASSES, WORKFLOW_EXECUTOR_ROUTING_MODE } from '@/constant/env'
import { BuiltinNodeType } from '@ai-workflow/core'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  WORKFLOW_COMMAND_ROUTING_KEY,
  WORKFLOW_COMPUTE_COMMAND_ROUTING_KEY,
  WORKFLOW_HTTP_COMMAND_ROUTING_KEY,
  WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
  WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY,
} from './workflow-mq.constants'

export const WORKFLOW_EXECUTION_CLASSES = {
  RUNTIME_CONTROL: 'runtime-control',
  TRUSTED_COMPUTE: 'trusted-compute',
  CONTROLLED_MODEL: 'controlled-model',
  CONTROLLED_HTTP: 'controlled-http',
  UNTRUSTED_SANDBOX: 'untrusted-sandbox',
} as const

export type WorkflowExecutionClass =
  (typeof WORKFLOW_EXECUTION_CLASSES)[keyof typeof WORKFLOW_EXECUTION_CLASSES]

export interface WorkflowExecutionRoute {
  executionClass: WorkflowExecutionClass
  routingKey: string
}

const classifiedRoutes: Readonly<Record<string, WorkflowExecutionRoute>> = {
  [BuiltinNodeType.CONDITION]: {
    executionClass: WORKFLOW_EXECUTION_CLASSES.TRUSTED_COMPUTE,
    routingKey: WORKFLOW_COMPUTE_COMMAND_ROUTING_KEY,
  },
  [BuiltinNodeType.LLM]: {
    executionClass: WORKFLOW_EXECUTION_CLASSES.CONTROLLED_MODEL,
    routingKey: WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
  },
  [BuiltinNodeType.RAG]: {
    executionClass: WORKFLOW_EXECUTION_CLASSES.CONTROLLED_MODEL,
    routingKey: WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
  },
  [BuiltinNodeType.HTTP]: {
    executionClass: WORKFLOW_EXECUTION_CLASSES.CONTROLLED_HTTP,
    routingKey: WORKFLOW_HTTP_COMMAND_ROUTING_KEY,
  },
  [BuiltinNodeType.CODE]: {
    executionClass: WORKFLOW_EXECUTION_CLASSES.UNTRUSTED_SANDBOX,
    routingKey: WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY,
  },
  [BuiltinNodeType.SUB_WORKFLOW]: {
    executionClass: WORKFLOW_EXECUTION_CLASSES.RUNTIME_CONTROL,
    routingKey: 'server.execute.sub-workflow',
  },
}

@Injectable()
export class WorkflowExecutionRoutingService {
  private readonly classified: boolean
  private readonly enabledClasses: ReadonlySet<WorkflowExecutionClass>

  constructor(configService: ConfigService) {
    this.classified = configService.get<string>(WORKFLOW_EXECUTOR_ROUTING_MODE) === 'classified'
    this.enabledClasses = parseEnabledClasses(
      configService.get<string>(EXECUTOR_ENABLED_CLASSES) ?? '',
    )
  }

  resolve(nodeType: string): WorkflowExecutionRoute {
    const route = classifiedRoutes[nodeType]
    if (!route) throw new Error(`节点类型 ${nodeType} 没有执行路由`)
    if (route.executionClass === WORKFLOW_EXECUTION_CLASSES.RUNTIME_CONTROL) return route
    if (!this.enabledClasses.has(route.executionClass)) {
      throw new Error(`执行类别 ${route.executionClass} 当前未启用`)
    }

    return {
      executionClass: route.executionClass,
      routingKey: this.classified ? route.routingKey : WORKFLOW_COMMAND_ROUTING_KEY,
    }
  }
}

function parseEnabledClasses(value: string): ReadonlySet<WorkflowExecutionClass> {
  const allowed = new Set<WorkflowExecutionClass>(Object.values(WORKFLOW_EXECUTION_CLASSES))
  allowed.delete(WORKFLOW_EXECUTION_CLASSES.RUNTIME_CONTROL)

  const enabled = new Set<WorkflowExecutionClass>()
  for (const item of value.split(',')) {
    const executionClass = item.trim() as WorkflowExecutionClass
    if (!executionClass) continue
    if (!allowed.has(executionClass)) {
      throw new Error(`EXECUTOR_ENABLED_CLASSES 包含未知执行类别：${executionClass}`)
    }
    enabled.add(executionClass)
  }
  return enabled
}
