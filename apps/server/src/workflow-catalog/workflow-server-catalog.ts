import {
  BuiltinNodeType,
  createBuiltinWorkflowNodeCatalog,
  type NodeRegistryReader,
  type Workflow,
} from '@ai-workflow/core'
import {
  projectConditionNodeConfig,
  projectHttpNodeConfig,
  projectLlmNodeConfig,
  projectStaticJsonNodeConfig,
} from '@ai-workflow/runtime'
import { Injectable } from '@nestjs/common'

import {
  WORKFLOW_COMPUTE_COMMAND_ROUTING_KEY,
  WORKFLOW_HTTP_COMMAND_ROUTING_KEY,
  WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
  WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY,
} from '@/infra/workflow-mq/workflow-mq.constants'
import { RuntimeNodeConfigProjectorRegistry } from './runtime-node-config-projector.registry'
import {
  WORKFLOW_EXECUTION_CLASSES,
  WorkflowExecutionRegistry,
  type WorkflowNodeExecutionRegistration,
} from './workflow-execution.registry'

export interface WorkflowServerCatalog {
  readonly fingerprint: string
  readonly nodeRegistry: NodeRegistryReader
  readonly configProjectors: RuntimeNodeConfigProjectorRegistry
  readonly executionRegistry: WorkflowExecutionRegistry
}

const BUILTIN_CONFIG_PROJECTORS = new RuntimeNodeConfigProjectorRegistry([
  { nodeType: BuiltinNodeType.LLM, projector: projectLlmNodeConfig },
  { nodeType: BuiltinNodeType.HTTP, projector: projectHttpNodeConfig },
  {
    nodeType: BuiltinNodeType.CONDITION,
    projector: projectConditionNodeConfig,
  },
  { nodeType: BuiltinNodeType.RAG, projector: projectStaticJsonNodeConfig },
  { nodeType: BuiltinNodeType.CODE, projector: projectStaticJsonNodeConfig },
  {
    nodeType: BuiltinNodeType.SUB_WORKFLOW,
    projector: projectStaticJsonNodeConfig,
  },
])

const BUILTIN_EXECUTION_REGISTRATIONS: readonly WorkflowNodeExecutionRegistration[] = [
  { nodeType: BuiltinNodeType.START, kind: 'runtime-control' },
  { nodeType: BuiltinNodeType.END, kind: 'runtime-control' },
  { nodeType: BuiltinNodeType.LOOP, kind: 'runtime-control' },
  { nodeType: BuiltinNodeType.LOOP_START, kind: 'runtime-control' },
  { nodeType: BuiltinNodeType.LOOP_EXIT, kind: 'runtime-control' },
  {
    nodeType: BuiltinNodeType.SUB_WORKFLOW,
    kind: 'server-control',
    handler: 'sub-workflow',
    routingKey: 'server.execute.sub-workflow',
  },
  {
    nodeType: BuiltinNodeType.CONDITION,
    kind: 'executor',
    executionClass: WORKFLOW_EXECUTION_CLASSES.TRUSTED_COMPUTE,
    classifiedRoutingKey: WORKFLOW_COMPUTE_COMMAND_ROUTING_KEY,
  },
  {
    nodeType: BuiltinNodeType.LLM,
    kind: 'executor',
    executionClass: WORKFLOW_EXECUTION_CLASSES.CONTROLLED_MODEL,
    classifiedRoutingKey: WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
  },
  {
    nodeType: BuiltinNodeType.RAG,
    kind: 'executor',
    executionClass: WORKFLOW_EXECUTION_CLASSES.CONTROLLED_MODEL,
    classifiedRoutingKey: WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
  },
  {
    nodeType: BuiltinNodeType.HTTP,
    kind: 'executor',
    executionClass: WORKFLOW_EXECUTION_CLASSES.CONTROLLED_HTTP,
    classifiedRoutingKey: WORKFLOW_HTTP_COMMAND_ROUTING_KEY,
  },
  {
    nodeType: BuiltinNodeType.CODE,
    kind: 'executor',
    executionClass: WORKFLOW_EXECUTION_CLASSES.UNTRUSTED_SANDBOX,
    classifiedRoutingKey: WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY,
  },
]

export function createBuiltinWorkflowServerCatalog(): WorkflowServerCatalog {
  const coreCatalog = createBuiltinWorkflowNodeCatalog()
  const executionRegistry = new WorkflowExecutionRegistry(BUILTIN_EXECUTION_REGISTRATIONS)

  assertCatalogCompatible(coreCatalog.nodeRegistry, BUILTIN_CONFIG_PROJECTORS, executionRegistry)

  return Object.freeze({
    fingerprint: coreCatalog.fingerprint,
    nodeRegistry: coreCatalog.nodeRegistry,
    configProjectors: BUILTIN_CONFIG_PROJECTORS,
    executionRegistry,
  })
}

function assertCatalogCompatible(
  nodeRegistry: NodeRegistryReader,
  configProjectors: RuntimeNodeConfigProjectorRegistry,
  executionRegistry: WorkflowExecutionRegistry,
) {
  for (const nodeType of configProjectors.listNodeTypes()) {
    if (!nodeRegistry.has(nodeType)) {
      throw new Error(`Runtime Config projector 没有对应的 Core 节点：${nodeType}`)
    }
  }

  for (const registration of executionRegistry.list()) {
    if (!nodeRegistry.has(registration.nodeType)) {
      throw new Error(`执行能力没有对应的 Core 节点：${registration.nodeType}`)
    }
    if (
      (registration.kind === 'executor' || registration.kind === 'server-control') &&
      !configProjectors.has(registration.nodeType)
    ) {
      throw new Error(`可派发节点缺少 Runtime Config projector：${registration.nodeType}`)
    }
  }

  for (const nodeType of nodeRegistry.list()) {
    if (!executionRegistry.get(nodeType.definition.type)) {
      throw new Error(`Core 节点缺少执行能力登记：${nodeType.definition.type}`)
    }
  }
}

@Injectable()
export class WorkflowCatalogResolver {
  private readonly builtinCatalog = createBuiltinWorkflowServerCatalog()

  async resolveForWorkflow(ownerId: string, workflow: Workflow): Promise<WorkflowServerCatalog> {
    // 插件锁进入 Workflow schema 后，此处按 ownerId + lock 校验安装、摘要并缓存 Catalog。
    void ownerId
    void workflow
    return this.builtinCatalog
  }

  resolveBuiltin(): WorkflowServerCatalog {
    return this.builtinCatalog
  }
}
