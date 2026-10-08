import { ModelType } from '@/generated/prisma/client'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import { MODEL_PROVIDER_TYPES, type ModelProviderTypeValue } from '@/constant/model'
import type { ExecutorModelResolutionVo } from '@/vo/executor-model.vo'
import type { LlmNodeConfig } from '@ai-workflow/core'
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'

@Injectable()
export class ChatModelResolverService {
  constructor(
    private readonly modelGroupRepository: ModelGroupRepository,
    private readonly credentialService: ModelCredentialService,
    private readonly providerRegistry: ModelProviderRegistry,
  ) {}

  async resolve(
    ownerId: string,
    model: Pick<LlmNodeConfig['model'], 'groupId' | 'configuredModelId'>,
  ): Promise<ExecutorModelResolutionVo> {
    const { configuredModelId, groupId } = model
    if (!groupId || !configuredModelId) {
      throw new UnprocessableEntityException('LLM 节点尚未选择模型')
    }

    const group = await this.modelGroupRepository.findById(ownerId, groupId)
    if (!group || group.modelType !== ModelType.CHAT || !group.enabled) {
      throw new NotFoundException('模型组不存在或未启用')
    }

    const configuredModel = group.models.find((item) => item.id === configuredModelId)
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
