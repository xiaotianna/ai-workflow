import { ModelType } from '@/generated/prisma/client'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import { PluginCatalogService } from '@/services/plugin-catalog.service'
import { MODEL_PROVIDER_TYPES, type ModelProviderTypeValue } from '@/constant/model'
import type { ResolveExecutorModelDto } from '@/dto/executor-model.dto'
import type { ExecutorModelResolutionVo } from '@/vo/executor-model.vo'
import {
  BuiltinNodeType,
  llmNodeSchema,
  type LlmNodeConfig,
  type Workflow,
  workflowSchema,
} from '@ai-workflow/core'
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'

@Injectable()
export class ExecutorModelService {
  constructor(
    private readonly executorModelRepository: ExecutorModelRepository,
    private readonly modelGroupRepository: ModelGroupRepository,
    private readonly credentialService: ModelCredentialService,
    private readonly providerRegistry: ModelProviderRegistry,
    private readonly pluginCatalogService: PluginCatalogService,
  ) {}

  async resolve(dto: ResolveExecutorModelDto): Promise<ExecutorModelResolutionVo> {
    const context = await this.executorModelRepository.findResolutionContext(dto)
    if (!context) throw new NotFoundException('模型运行上下文不存在或租约已失效')

    const parsedWorkflow = workflowSchema.safeParse(context.run.version.definition)
    if (!parsedWorkflow.success) {
      throw new UnprocessableEntityException('运行绑定的工作流版本无效')
    }

    const node = parsedWorkflow.data.nodes.find((candidate) => candidate.id === dto.nodeId)
    if (
      !node ||
      !(await this.supportsLlmExecution(
        context.run.workflow.app.ownerId,
        parsedWorkflow.data,
        node.type,
      ))
    ) {
      throw new NotFoundException('LLM 节点不存在')
    }

    const parsedConfig = llmNodeSchema.safeParse(node.config)
    if (!parsedConfig.success) {
      throw new UnprocessableEntityException('LLM 节点配置无效')
    }

    return this.resolveConfiguredModel(context.run.workflow.app.ownerId, parsedConfig.data)
  }

  private async supportsLlmExecution(
    ownerId: string,
    workflow: Workflow,
    nodeType: string,
  ): Promise<boolean> {
    if (nodeType === BuiltinNodeType.LLM) return true

    const plugins = await this.pluginCatalogService.resolveWorkflowVersions(
      ownerId,
      workflow.plugins,
    )
    return plugins.some((plugin) =>
      plugin.manifest.nodes.some(
        (node) => node.type === nodeType && node.execution.kind === 'host-llm',
      ),
    )
  }

  private async resolveConfiguredModel(
    ownerId: string,
    config: LlmNodeConfig,
  ): Promise<ExecutorModelResolutionVo> {
    const { configuredModelId, groupId } = config.model
    if (!groupId || !configuredModelId) {
      throw new UnprocessableEntityException('LLM 节点尚未选择模型')
    }

    const group = await this.modelGroupRepository.findById(ownerId, groupId)
    if (!group || group.modelType !== ModelType.CHAT || !group.enabled) {
      throw new NotFoundException('模型组不存在或未启用')
    }

    const configuredModel = group.models.find((model) => model.id === configuredModelId)
    if (!configuredModel || !configuredModel.enabled) {
      throw new NotFoundException('模型不存在或未启用')
    }

    if (!isModelProviderType(group.providerType)) {
      throw new UnprocessableEntityException('模型供应商配置无效')
    }
    const provider = this.providerRegistry.get(group.providerType),
      baseUrl = group.baseUrl || provider.defaultBaseUrl,
      apiKey = this.credentialService.decrypt(group, group.id)
    if (provider.supportsApiKey && !apiKey) {
      throw new UnprocessableEntityException('模型组缺少 API Key')
    }

    return {
      providerType: provider.type,
      modelId: configuredModel.modelId,
      baseUrl,
      ...(apiKey ? { apiKey } : {}),
    }
  }
}

function isModelProviderType(value: string): value is ModelProviderTypeValue {
  return (MODEL_PROVIDER_TYPES as readonly string[]).includes(value)
}
