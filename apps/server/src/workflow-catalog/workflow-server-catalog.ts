import {
  BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
  BuiltinNodeType,
  builtinNodeStrategies,
  createBuiltinWorkflowNodeCatalog,
  createWorkflowNodeCatalog,
  type NodeRegistryReader,
  type Workflow,
  type WorkflowPluginLock,
} from '@ai-workflow/core'
import {
  createNodeTypesFromPluginManifest,
  getPluginErrorHandlingFieldName,
} from '@ai-workflow/plugin'
import {
  projectConditionNodeConfig,
  projectHttpNodeConfig,
  projectLlmNodeConfig,
  projectStaticJsonNodeConfig,
} from '@ai-workflow/runtime'
import { BadRequestException, Injectable } from '@nestjs/common'

import type { WorkflowPluginDependencyInput } from '@/common/interfaces/workflow-plugin-dependency.interface'
import { PluginCatalogService } from '@/services/plugin-catalog.service'

import {
  WORKFLOW_COMPUTE_COMMAND_ROUTING_KEY,
  WORKFLOW_HTTP_COMMAND_ROUTING_KEY,
  WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
  WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY,
} from '@/infra/workflow-mq/workflow-mq.constants'
import { RuntimeNodeConfigProjectorRegistry } from './runtime-node-config-projector.registry'
import type { RuntimeNodeConfigProjectorRegistration } from './runtime-node-config-projector.registry'
import {
  WORKFLOW_EXECUTION_CLASSES,
  WorkflowExecutionRegistry,
  type WorkflowNodeExecutionRegistration,
} from './workflow-execution.registry'

export interface WorkflowServerCatalog {
  readonly fingerprint: string
  readonly pluginLock: WorkflowPluginLock
  readonly pluginDependencies: readonly WorkflowPluginDependencyInput[]
  readonly nodeRegistry: NodeRegistryReader
  readonly configProjectors: RuntimeNodeConfigProjectorRegistry
  readonly executionRegistry: WorkflowExecutionRegistry
}

const BUILTIN_CONFIG_PROJECTOR_REGISTRATIONS: readonly RuntimeNodeConfigProjectorRegistration[] = [
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
]

const BUILTIN_CONFIG_PROJECTORS = new RuntimeNodeConfigProjectorRegistry(
  BUILTIN_CONFIG_PROJECTOR_REGISTRATIONS,
)

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
    pluginLock: coreCatalog.pluginLock,
    pluginDependencies: [],
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

  constructor(private readonly pluginCatalogService: PluginCatalogService) {}

  async resolveForWorkflow(ownerId: string, workflow: Workflow): Promise<WorkflowServerCatalog> {
    if (workflow.plugins.length === 0) return this.builtinCatalog

    const resolvedPlugins = await this.pluginCatalogService.resolveWorkflowVersions(
      ownerId,
      workflow.plugins,
    )
    const pluginNodeTypes = resolvedPlugins.flatMap((plugin) =>
      createNodeTypesFromPluginManifest(plugin.manifest),
    )
    const coreCatalog = createWorkflowNodeCatalog({
      hostVersion: BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
      nodes: [...Object.values(builtinNodeStrategies), ...pluginNodeTypes],
      pluginLock: workflow.plugins,
    })
    const pluginExecutionByNodeType = new Map(
      resolvedPlugins.flatMap((plugin) =>
        plugin.manifest.nodes.map((node) => [node.type, node.execution] as const),
      ),
    )
    const pluginProjectors = pluginNodeTypes.map((nodeType) => ({
      nodeType: nodeType.definition.type,
      projector:
        pluginExecutionByNodeType.get(nodeType.definition.type)?.kind === 'host-llm'
          ? projectLlmNodeConfig
          : projectStaticJsonNodeConfig,
    }))
    const configProjectors = new RuntimeNodeConfigProjectorRegistry([
      ...BUILTIN_CONFIG_PROJECTOR_REGISTRATIONS,
      ...pluginProjectors,
    ])
    const executionRegistry = new WorkflowExecutionRegistry([
      ...BUILTIN_EXECUTION_REGISTRATIONS,
      ...resolvedPlugins.flatMap((plugin) =>
        plugin.manifest.nodes.map((node): WorkflowNodeExecutionRegistration => {
          if (node.execution.kind === 'host-llm') {
            return {
              nodeType: node.type,
              kind: 'executor',
              executionClass: WORKFLOW_EXECUTION_CLASSES.CONTROLLED_MODEL,
              classifiedRoutingKey: WORKFLOW_MODEL_COMMAND_ROUTING_KEY,
              executorType: BuiltinNodeType.LLM,
            }
          }
          if (node.execution.kind !== 'sandbox-js') {
            return {
              nodeType: node.type,
              kind: 'unsupported',
              reason: `插件节点 ${node.label} 未声明服务端执行能力`,
            }
          }
          const missingPermissions = plugin.manifest.permissions.filter(
            (permission) => !plugin.grantedPermissions.includes(permission),
          )
          if (missingPermissions.length > 0) {
            return {
              nodeType: node.type,
              kind: 'unsupported',
              reason: `插件节点 ${node.label} 缺少执行授权：${missingPermissions.join('、')}`,
            }
          }
          if (plugin.manifest.permissions.includes('secrets:read')) {
            return {
              nodeType: node.type,
              kind: 'unsupported',
              reason: `插件节点 ${node.label} 的密钥代理尚未配置`,
            }
          }
          const requestsPublicNetwork = plugin.manifest.permissions.includes('network:public')
          return {
            nodeType: node.type,
            kind: 'executor',
            executionClass: WORKFLOW_EXECUTION_CLASSES.UNTRUSTED_SANDBOX,
            classifiedRoutingKey: WORKFLOW_SANDBOX_COMMAND_ROUTING_KEY,
            executorType: 'plugin-sandbox-js',
            sandboxArtifact: {
              pluginVersionId: plugin.versionId,
              artifactDigest: plugin.artifactDigest,
              artifactPath: node.execution.artifact,
              networkPolicy: requestsPublicNetwork ? 'public' : 'none',
              ...(getPluginErrorHandlingFieldName(node.form)
                ? {
                    errorHandlingField: getPluginErrorHandlingFieldName(node.form),
                  }
                : {}),
            },
          }
        }),
      ),
    ])

    assertCatalogCompatible(coreCatalog.nodeRegistry, configProjectors, executionRegistry)

    return Object.freeze({
      fingerprint: coreCatalog.fingerprint,
      pluginLock: coreCatalog.pluginLock,
      pluginDependencies: Object.freeze(resolvedPlugins.map((plugin) => plugin.dependency)),
      nodeRegistry: coreCatalog.nodeRegistry,
      configProjectors,
      executionRegistry,
    })
  }

  resolveBuiltin(): WorkflowServerCatalog {
    return this.builtinCatalog
  }
}

export function assertWorkflowExecutable(workflow: Workflow, catalog: WorkflowServerCatalog): void {
  for (const node of workflow.nodes) {
    const registration = catalog.executionRegistry.get(node.type)
    if (registration?.kind === 'unsupported') {
      throw new BadRequestException(registration.reason)
    }
  }
}
