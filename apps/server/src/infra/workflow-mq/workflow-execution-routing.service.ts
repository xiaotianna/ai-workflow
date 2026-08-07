import { EXECUTOR_ENABLED_CLASSES, WORKFLOW_EXECUTOR_ROUTING_MODE } from '@/constant/env'
import {
  WORKFLOW_EXECUTION_CLASSES,
  type WorkflowExecutionClass,
  type WorkflowExecutionRegistry,
} from '@/workflow-catalog/workflow-execution.registry'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WORKFLOW_COMMAND_ROUTING_KEY } from './workflow-mq.constants'

export interface WorkflowExecutionRoute {
  executionClass: WorkflowExecutionClass
  routingKey: string
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

  resolve(nodeType: string, executionRegistry: WorkflowExecutionRegistry): WorkflowExecutionRoute {
    const registration = executionRegistry.getOrThrow(nodeType)

    if (registration.kind === 'unsupported') {
      throw new Error(registration.reason)
    }
    if (registration.kind === 'runtime-control') {
      throw new Error(`Runtime 控制节点 ${nodeType} 不应创建执行命令`)
    }
    if (registration.kind === 'server-control') {
      return {
        executionClass: WORKFLOW_EXECUTION_CLASSES.RUNTIME_CONTROL,
        routingKey: registration.routingKey,
      }
    }
    if (!this.enabledClasses.has(registration.executionClass)) {
      throw new Error(`执行类别 ${registration.executionClass} 当前未启用`)
    }

    return {
      executionClass: registration.executionClass,
      routingKey: this.classified
        ? registration.classifiedRoutingKey
        : WORKFLOW_COMMAND_ROUTING_KEY,
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
