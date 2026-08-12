import type { ModelProviderTypeValue, ModelTypeValue } from '@/constant/model'
import { CreateModelGroupDto, ListModelGroupsDto, UpdateModelGroupDto } from '@/dto/model.dto'
import { ModelType } from '@/generated/prisma/client'
import {
  ModelCredentialService,
  type EncryptedModelCredential,
} from '@/infra/model-provider/model-credential.service'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ModelGroupRepository, type ModelGroupRecord } from '@/repositories/model-group.repository'
import type { ModelEnabledVo, ModelGroupListVo, ModelGroupVo } from '@/vo/model.vo'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'

interface ModelWriteValue {
  id?: string
  modelId: string
  displayName?: string
  enabled: boolean
}

@Injectable()
export class ModelGroupService {
  constructor(
    private readonly repository: ModelGroupRepository,
    private readonly credentialService: ModelCredentialService,
    private readonly providerRegistry: ModelProviderRegistry,
  ) {}

  async list(ownerId: string, query: ListModelGroupsDto): Promise<ModelGroupListVo> {
    const groups = await this.repository.list(
      ownerId,
      query.modelType ? toPrismaModelType(query.modelType) : undefined,
    )

    return {
      items: groups.map((group) => this.toVo(group)),
    }
  }

  async getById(ownerId: string, groupId: string): Promise<ModelGroupVo> {
    return this.toVo(await this.getOwnedGroup(ownerId, groupId))
  }

  async create(ownerId: string, dto: CreateModelGroupDto): Promise<ModelGroupVo> {
    const provider = this.providerRegistry.get(dto.providerType)
    this.assertCredentialSupported(provider.supportsApiKey, dto.apiKey)
    this.assertValidModels(dto.models)

    const groupId = randomUUID(),
      credential = dto.apiKey ? this.credentialService.encrypt(dto.apiKey, groupId) : undefined,
      group = await this.repository.create({
        id: groupId,
        ownerId,
        modelType: toPrismaModelType(dto.modelType),
        name: dto.name,
        providerType: dto.providerType,
        baseUrl: dto.baseUrl || undefined,
        credential,
        models: toModelWrites(dto.models),
      })

    return this.toVo(group)
  }

  async update(ownerId: string, groupId: string, dto: UpdateModelGroupDto): Promise<ModelGroupVo> {
    const existingGroup = await this.getOwnedGroup(ownerId, groupId),
      provider = this.providerRegistry.get(dto.providerType)
    this.assertCredentialSupported(provider.supportsApiKey, dto.apiKey)
    this.assertValidModels(dto.models)
    this.assertOwnedModelIds(existingGroup, dto.models)
    await this.assertEmbeddingReferencesRemainStable(ownerId, existingGroup, dto)

    if (existingGroup.providerType !== dto.providerType && dto.apiKey === undefined) {
      throw new BadRequestException('修改模型供应商时必须明确设置或清除 Key')
    }

    let credential: EncryptedModelCredential | null | undefined

    if (typeof dto.apiKey === 'string') {
      credential = this.credentialService.encrypt(dto.apiKey, groupId)
    } else if (dto.apiKey === null) {
      credential = null
    }

    const updatedGroup = await this.repository.updateGraph(ownerId, groupId, {
      name: dto.name,
      providerType: dto.providerType,
      baseUrl: dto.baseUrl || undefined,
      credential,
      models: toModelWrites(dto.models),
    })

    if (!updatedGroup) {
      throw new NotFoundException('模型组不存在')
    }

    return this.toVo(updatedGroup)
  }

  async updateGroupEnabled(
    ownerId: string,
    groupId: string,
    enabled: boolean,
  ): Promise<ModelEnabledVo> {
    if (!(await this.repository.updateGroupEnabled(ownerId, groupId, enabled))) {
      throw new NotFoundException('模型组不存在')
    }

    return { id: groupId, enabled }
  }

  async updateModelEnabled(
    ownerId: string,
    groupId: string,
    modelId: string,
    enabled: boolean,
  ): Promise<ModelEnabledVo> {
    if (!(await this.repository.updateModelEnabled(ownerId, groupId, modelId, enabled))) {
      throw new NotFoundException('模型不存在')
    }

    return { id: modelId, enabled }
  }

  async remove(ownerId: string, groupId: string): Promise<void> {
    const referencedModelIds = await this.repository.listKnowledgeBaseEmbeddingModelReferences(
      ownerId,
      groupId,
    )
    if (referencedModelIds.length > 0) {
      throw new ConflictException('模型组正在被知识库使用，无法删除')
    }

    if (!(await this.repository.delete(ownerId, groupId))) {
      throw new NotFoundException('模型组不存在')
    }
  }

  private async getOwnedGroup(ownerId: string, groupId: string): Promise<ModelGroupRecord> {
    const group = await this.repository.findById(ownerId, groupId)

    if (!group) {
      throw new NotFoundException('模型组不存在')
    }

    return group
  }

  private assertCredentialSupported(supportsApiKey: boolean, apiKey?: string | null): void {
    if (!supportsApiKey && typeof apiKey === 'string') {
      throw new BadRequestException('当前模型供应商不需要 Key')
    }
  }

  private assertValidModels(models: readonly ModelWriteValue[]): void {
    const normalizedModelIds = new Set<string>(),
      configuredModelIds = new Set<string>()

    for (const model of models) {
      const normalizedModelId = normalizeModelId(model.modelId)

      if (normalizedModelIds.has(normalizedModelId)) {
        throw new BadRequestException('同一模型组内的模型 ID 不能重复')
      }
      normalizedModelIds.add(normalizedModelId)

      if (model.id) {
        if (configuredModelIds.has(model.id)) {
          throw new BadRequestException('模型配置 ID 不能重复')
        }
        configuredModelIds.add(model.id)
      }
    }
  }

  private assertOwnedModelIds(group: ModelGroupRecord, models: readonly ModelWriteValue[]): void {
    const existingModelIds = new Set(group.models.map(({ id }) => id))

    if (models.some(({ id }) => id && !existingModelIds.has(id))) {
      throw new BadRequestException('模型配置不属于当前模型组')
    }
  }

  private async assertEmbeddingReferencesRemainStable(
    ownerId: string,
    group: ModelGroupRecord,
    dto: UpdateModelGroupDto,
  ): Promise<void> {
    const referencedModelIds = new Set(
      await this.repository.listKnowledgeBaseEmbeddingModelReferences(ownerId, group.id),
    )
    if (referencedModelIds.size === 0) return

    if (group.providerType !== dto.providerType) {
      throw new ConflictException('模型组正在被知识库使用，无法修改供应商类型')
    }

    const nextModels = new Map(
        dto.models.flatMap((model) => (model.id ? [[model.id, model]] : [])),
      ),
      changedModelIds: string[] = []

    for (const currentModel of group.models) {
      if (!referencedModelIds.has(currentModel.id)) continue
      const nextModel = nextModels.get(currentModel.id)

      if (!nextModel) {
        throw new ConflictException('嵌入模型正在被知识库使用，无法删除')
      }
      if (normalizeModelId(nextModel.modelId) !== normalizeModelId(currentModel.modelId)) {
        changedModelIds.push(currentModel.id)
      }
    }

    if (changedModelIds.length === 0) return

    const activeModelIds = new Set(
      await this.repository.listActiveKnowledgeBaseEmbeddingModelReferences(ownerId, group.id),
    )
    if (changedModelIds.some((modelId) => activeModelIds.has(modelId))) {
      throw new ConflictException('嵌入模型正在执行知识库嵌入，暂时无法修改模型 ID')
    }
  }

  private toVo(group: ModelGroupRecord): ModelGroupVo {
    const apiKey = this.credentialService.decrypt(group, group.id)

    return {
      id: group.id,
      modelType: fromPrismaModelType(group.modelType),
      name: group.name,
      providerType: group.providerType as ModelProviderTypeValue,
      ...(group.baseUrl ? { baseUrl: group.baseUrl } : {}),
      ...(apiKey ? { maskedApiKey: maskApiKey(apiKey) } : {}),
      enabled: group.enabled,
      models: group.models.map((model) => ({
        id: model.id,
        modelId: model.modelId,
        ...(model.displayName ? { displayName: model.displayName } : {}),
        enabled: model.enabled,
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }
  }
}

function toModelWrites(models: readonly ModelWriteValue[]) {
  return models.map((model, sortOrder) => ({
    id: model.id,
    modelId: model.modelId,
    normalizedModelId: normalizeModelId(model.modelId),
    displayName: model.displayName || undefined,
    enabled: model.enabled,
    sortOrder,
  }))
}

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase()
}

function maskApiKey(apiKey: string): string {
  return `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}`
}

function toPrismaModelType(modelType: ModelTypeValue): ModelType {
  return modelType === 'chat' ? ModelType.CHAT : ModelType.EMBEDDING
}

function fromPrismaModelType(modelType: ModelType): ModelTypeValue {
  return modelType === ModelType.CHAT ? 'chat' : 'embedding'
}
