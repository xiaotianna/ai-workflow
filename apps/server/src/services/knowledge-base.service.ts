import {
  CreateKnowledgeDocumentsDto,
  CreateKnowledgeBaseDto,
  ListKnowledgeChunksDto,
  ListKnowledgeBasesDto,
  ListKnowledgeDocumentsDto,
  UpdateKnowledgeBaseSettingsDto,
  UpdateKnowledgeBaseDto,
  UpdateKnowledgeDocumentDto,
} from '@/dto/knowledge-base.dto'
import { KnowledgeSourceStore } from '@/infra/knowledge/knowledge-source-store'
import {
  KnowledgeBaseRepository,
  type KnowledgeBaseRecord,
  type KnowledgeBaseIndexRecord,
  type KnowledgeBaseSettingsRecord,
  type KnowledgeChunkRecord,
  type KnowledgeDocumentRecord,
} from '@/repositories/knowledge-base.repository'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import {
  KnowledgeChunkerService,
  type KnowledgeChunkConfig,
} from '@/services/knowledge-chunker.service'
import type { KnowledgeBaseListVo, KnowledgeBaseVo } from '@/vo/knowledge-base.vo'
import type {
  KnowledgeBaseIndexListVo,
  KnowledgeBaseIndexVo,
  KnowledgeBaseSettingsVo,
  KnowledgeChunkListVo,
  KnowledgeChunkVo,
  KnowledgeDocumentListVo,
  KnowledgeDocumentPreviewVo,
  KnowledgeDocumentVo,
} from '@/vo/knowledge-base.vo'
import { createHash } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly knowledgeSourceStore: KnowledgeSourceStore,
    private readonly knowledgeChunkerService: KnowledgeChunkerService,
    private readonly modelGroupRepository: ModelGroupRepository,
  ) {}

  async list(ownerId: string, query: ListKnowledgeBasesDto): Promise<KnowledgeBaseListVo> {
    const knowledgeBases = await this.knowledgeBaseRepository.list({
      ownerId,
      search: query.search || undefined,
      sort: query.sort,
    })

    return {
      items: knowledgeBases.map((knowledgeBase) => this.toVo(knowledgeBase)),
    }
  }

  async getById(ownerId: string, knowledgeBaseId: string): Promise<KnowledgeBaseVo> {
    const knowledgeBase = await this.knowledgeBaseRepository.findById(ownerId, knowledgeBaseId)

    if (!knowledgeBase) {
      throw new NotFoundException('知识库不存在')
    }

    return this.toVo(knowledgeBase)
  }

  async create(ownerId: string, dto: CreateKnowledgeBaseDto): Promise<KnowledgeBaseVo> {
    const knowledgeBase = await this.knowledgeBaseRepository.create({
      ownerId,
      title: dto.title,
      description: dto.description || undefined,
      icon: dto.icon,
    })

    return this.toVo(knowledgeBase)
  }

  async update(
    ownerId: string,
    knowledgeBaseId: string,
    dto: UpdateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseVo> {
    if (dto.title === undefined && dto.description === undefined && dto.icon === undefined) {
      throw new BadRequestException('至少需要提供一个待修改字段')
    }

    const existingKnowledgeBase = await this.knowledgeBaseRepository.findById(
      ownerId,
      knowledgeBaseId,
    )

    if (!existingKnowledgeBase) {
      throw new NotFoundException('知识库不存在')
    }

    const knowledgeBase = await this.knowledgeBaseRepository.update(knowledgeBaseId, {
      title: dto.title,
      description: dto.description === undefined ? undefined : dto.description || null,
      icon: dto.icon,
    })

    return this.toVo(knowledgeBase)
  }

  async remove(ownerId: string, knowledgeBaseId: string): Promise<void> {
    const existingKnowledgeBase = await this.knowledgeBaseRepository.findById(
      ownerId,
      knowledgeBaseId,
    )

    if (!existingKnowledgeBase) {
      throw new NotFoundException('知识库不存在')
    }

    if (await this.knowledgeBaseRepository.hasOwnedWorkflowReference(ownerId, knowledgeBaseId)) {
      throw new ConflictException('知识库正在被工作流使用，无法删除')
    }

    const sources = await this.knowledgeBaseRepository.listSourceStorageKeys(
      ownerId,
      knowledgeBaseId,
    )
    const removed = await this.knowledgeBaseRepository.remove(ownerId, knowledgeBaseId)

    if (!removed) {
      throw new NotFoundException('知识库不存在')
    }

    await Promise.all(
      sources.map((source) => this.knowledgeSourceStore.remove(source.sourceStorageKey)),
    )
  }

  async getSettings(ownerId: string, knowledgeBaseId: string): Promise<KnowledgeBaseSettingsVo> {
    const result = await this.knowledgeBaseRepository.getSettings(ownerId, knowledgeBaseId)
    if (!result) throw new NotFoundException('知识库不存在')
    return this.toSettingsVo(result.settings, result.staleDocumentCount)
  }

  async updateSettings(
    ownerId: string,
    knowledgeBaseId: string,
    dto: UpdateKnowledgeBaseSettingsDto,
  ): Promise<KnowledgeBaseSettingsVo> {
    if (dto.overlapLength >= dto.maxSegmentLength) {
      throw new BadRequestException('重叠长度必须小于分段最大长度')
    }

    const current = await this.knowledgeBaseRepository.getSettings(ownerId, knowledgeBaseId)
    if (!current) throw new NotFoundException('知识库不存在')

    const embeddingModelGroupId =
      dto.embeddingModelGroupId === undefined
        ? current.settings.embeddingModelGroupId
        : dto.embeddingModelGroupId
    const embeddingConfiguredModelId =
      dto.embeddingConfiguredModelId === undefined
        ? current.settings.embeddingConfiguredModelId
        : dto.embeddingConfiguredModelId
    if (Boolean(embeddingModelGroupId) !== Boolean(embeddingConfiguredModelId)) {
      throw new BadRequestException('嵌入模型组和模型必须同时选择或同时清空')
    }

    const embeddingModelChanged =
      current.settings.embeddingModelGroupId !== embeddingModelGroupId ||
      current.settings.embeddingConfiguredModelId !== embeddingConfiguredModelId

    const segmentationChanged =
      current.settings.segmentationMode !== dto.segmentationMode ||
      current.settings.maxSegmentLength !== dto.maxSegmentLength ||
      current.settings.overlapLength !== dto.overlapLength ||
      current.settings.normalizeWhitespace !== dto.normalizeWhitespace

    let indexSnapshot:
      | {
          configuredModelId: string
          embeddingProvider: string
          embeddingModelId: string
          defaultChunkConfig: {
            segmentationMode: string
            maxSegmentLength: number
            overlapLength: number
          }
          defaultCleaningConfig: {
            normalizeWhitespace: boolean
          }
          configHash: string
        }
      | undefined

    if (
      (embeddingModelChanged || segmentationChanged) &&
      embeddingModelGroupId &&
      embeddingConfiguredModelId
    ) {
      const group = await this.modelGroupRepository.findById(ownerId, embeddingModelGroupId)
      const model = group?.models.find(({ id }) => id === embeddingConfiguredModelId)

      if (!group || group.modelType !== 'EMBEDDING' || !model) {
        throw new BadRequestException('请选择当前账号下有效的嵌入模型')
      }
      if (!group.enabled || !model.enabled) {
        throw new BadRequestException('所选嵌入模型已停用，请先启用或选择其他模型')
      }

      const defaultChunkConfig = {
        segmentationMode: dto.segmentationMode,
        maxSegmentLength: dto.maxSegmentLength,
        overlapLength: dto.overlapLength,
      }
      const defaultCleaningConfig = {
        normalizeWhitespace: dto.normalizeWhitespace,
      }
      const indexConfig = {
        configuredModelId: model.id,
        embeddingProvider: group.providerType,
        embeddingModelId: model.modelId,
        distanceMetric: 'COSINE',
        defaultChunkConfig,
        defaultCleaningConfig,
        parserVersion: 'text-v1',
        cleanerVersion: 'conservative-v1',
        mappingVersion: 'opensearch-v1',
      }
      indexSnapshot = {
        configuredModelId: model.id,
        embeddingProvider: group.providerType,
        embeddingModelId: model.modelId,
        defaultChunkConfig,
        defaultCleaningConfig,
        configHash: createHash('sha256').update(JSON.stringify(indexConfig)).digest('hex'),
      }
    }

    const result = await this.knowledgeBaseRepository.updateSettings(ownerId, knowledgeBaseId, {
      ...dto,
      embeddingModelGroupId,
      embeddingConfiguredModelId,
      indexSnapshot,
    })
    if (!result) throw new NotFoundException('知识库不存在')
    return this.toSettingsVo(result.settings, result.staleDocumentCount)
  }

  async listIndexes(ownerId: string, knowledgeBaseId: string): Promise<KnowledgeBaseIndexListVo> {
    const result = await this.knowledgeBaseRepository.listIndexes(ownerId, knowledgeBaseId)
    if (!result) throw new NotFoundException('知识库不存在')

    return {
      items: result.items.map((index) => this.toIndexVo(index, result.activeIndexId)),
    }
  }

  async listDocuments(
    ownerId: string,
    knowledgeBaseId: string,
    query: ListKnowledgeDocumentsDto,
  ): Promise<KnowledgeDocumentListVo> {
    const result = await this.knowledgeBaseRepository.listDocuments({
      ownerId,
      knowledgeBaseId,
      search: query.search || undefined,
      fileType: query.fileType,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    })
    if (!result) throw new NotFoundException('知识库不存在')

    return {
      items: result.items.map((document) => this.toDocumentVo(document)),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async createDocuments(
    ownerId: string,
    knowledgeBaseId: string,
    files: UploadedKnowledgeDocument[],
    dto: CreateKnowledgeDocumentsDto,
  ): Promise<KnowledgeDocumentVo[]> {
    if (!files.length) throw new BadRequestException('请至少选择一个文件')
    if (dto.overlapLength >= dto.maxSegmentLength) {
      throw new BadRequestException('重叠长度必须小于分段最大长度')
    }
    await this.requireKnowledgeBase(ownerId, knowledgeBaseId)

    const config: KnowledgeChunkConfig = {
      segmentationMode: dto.segmentationMode,
      maxSegmentLength: dto.maxSegmentLength,
      overlapLength: dto.overlapLength,
      normalizeWhitespace: dto.normalizeWhitespace,
    }
    return Promise.all(
      files.map(async (file) => {
        const text = await this.knowledgeChunkerService.parseText(file.buffer, file.originalname)
        const chunks = this.knowledgeChunkerService.chunk(text, config)
        if (!chunks.length) throw new BadRequestException(`${file.originalname} 没有可用的分段内容`)

        const sourceStorageKey = await this.knowledgeSourceStore.store(
          knowledgeBaseId,
          file.originalname,
          file.buffer,
          file.mimetype || undefined,
        )

        try {
          const document = await this.knowledgeBaseRepository.createDocument({
            ownerId,
            knowledgeBaseId,
            name: file.originalname,
            fileType: this.resolveFileType(file.originalname),
            sourceStorageKey,
            sourceMimeType: file.mimetype || 'text/plain',
            sourceSize: BigInt(file.size),
            sourceChecksum: createHash('sha256').update(file.buffer).digest('hex'),
            ...config,
            characterCount: text.length,
            chunks: chunks.map((chunk) => ({
              content: chunk.content,
              tokenCount: 0,
              metadata: chunk.metadata,
            })),
          })
          return this.toDocumentVo(document)
        } catch (error) {
          await this.knowledgeSourceStore.remove(sourceStorageKey)
          throw error
        }
      }),
    )
  }

  async previewDocuments(
    ownerId: string,
    knowledgeBaseId: string,
    files: UploadedKnowledgeDocument[],
    dto: CreateKnowledgeDocumentsDto,
  ): Promise<KnowledgeDocumentPreviewVo> {
    if (!files.length) throw new BadRequestException('请至少选择一个文件')
    if (dto.overlapLength >= dto.maxSegmentLength) {
      throw new BadRequestException('重叠长度必须小于分段最大长度')
    }
    await this.requireKnowledgeBase(ownerId, knowledgeBaseId)

    const config: KnowledgeChunkConfig = {
      segmentationMode: dto.segmentationMode,
      maxSegmentLength: dto.maxSegmentLength,
      overlapLength: dto.overlapLength,
      normalizeWhitespace: dto.normalizeWhitespace,
    }

    return {
      files: await Promise.all(
        files.map(async (file) => {
          const text = await this.knowledgeChunkerService.parseText(file.buffer, file.originalname)
          const chunks = this.knowledgeChunkerService.chunk(text, config)
          return {
            name: file.originalname,
            total: chunks.length,
            truncated: chunks.length > 20,
            items: chunks.slice(0, 20).map((chunk, index) => ({
              sequence: index + 1,
              content: chunk.content,
              characterCount: chunk.content.length,
              metadata: chunk.metadata,
            })),
          }
        }),
      ),
    }
  }

  async getDocument(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
  ): Promise<KnowledgeDocumentVo> {
    const document = await this.knowledgeBaseRepository.findDocument(
      ownerId,
      knowledgeBaseId,
      documentId,
    )
    if (!document) throw new NotFoundException('文档不存在')
    return this.toDocumentVo(document)
  }

  async updateDocument(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
    dto: UpdateKnowledgeDocumentDto,
  ): Promise<KnowledgeDocumentVo> {
    if (dto.name === undefined && dto.enabled === undefined) {
      throw new BadRequestException('至少需要提供一个待修改字段')
    }
    const document = await this.knowledgeBaseRepository.updateDocument(
      ownerId,
      knowledgeBaseId,
      documentId,
      dto,
    )
    if (!document) throw new NotFoundException('文档不存在')
    return this.toDocumentVo(document)
  }

  async removeDocument(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
  ): Promise<void> {
    const sourceStorageKey = await this.knowledgeBaseRepository.removeDocument(
      ownerId,
      knowledgeBaseId,
      documentId,
    )
    if (!sourceStorageKey) throw new NotFoundException('文档不存在')
    await this.knowledgeSourceStore.remove(sourceStorageKey)
  }

  async reindexDocument(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
  ): Promise<KnowledgeDocumentVo> {
    const queued = await this.knowledgeBaseRepository.queueDocumentReindex(
      ownerId,
      knowledgeBaseId,
      documentId,
    )
    if (!queued) throw new NotFoundException('文档不存在')
    if (queued.queued) return this.toDocumentVo(queued.document)

    const [document, settingsResult] = await Promise.all([
      this.knowledgeBaseRepository.findDocument(ownerId, knowledgeBaseId, documentId),
      this.knowledgeBaseRepository.getSettings(ownerId, knowledgeBaseId),
    ])
    if (!document || !settingsResult) throw new NotFoundException('文档不存在')

    const source = await this.knowledgeSourceStore.read(document.sourceStorageKey)
    const sourceName =
      document.fileType === 'markdown'
        ? 'source.md'
        : document.fileType === 'pdf'
          ? 'source.pdf'
          : 'source.txt'
    const text = await this.knowledgeChunkerService.parseText(source, sourceName)
    const config: KnowledgeChunkConfig = {
      segmentationMode: settingsResult.settings.segmentationMode,
      maxSegmentLength: settingsResult.settings.maxSegmentLength,
      overlapLength: settingsResult.settings.overlapLength,
      normalizeWhitespace: settingsResult.settings.normalizeWhitespace,
    }
    const chunks = this.knowledgeChunkerService.chunk(text, config)
    if (!chunks.length) {
      throw new BadRequestException('原文中没有可用的分段内容')
    }
    const updated = await this.knowledgeBaseRepository.replaceDocumentChunks({
      ownerId,
      knowledgeBaseId,
      documentId,
      characterCount: text.length,
      chunks: chunks.map((chunk) => ({
        content: chunk.content,
        tokenCount: 0,
        metadata: chunk.metadata,
      })),
    })
    if (!updated) throw new NotFoundException('文档不存在')
    return this.toDocumentVo(updated)
  }

  async listChunks(
    ownerId: string,
    knowledgeBaseId: string,
    documentId: string,
    query: ListKnowledgeChunksDto,
  ): Promise<KnowledgeChunkListVo> {
    const result = await this.knowledgeBaseRepository.listChunks({
      ownerId,
      knowledgeBaseId,
      documentId,
      search: query.search || undefined,
      page: query.page,
      pageSize: query.pageSize,
    })
    if (!result) throw new NotFoundException('文档不存在')

    return {
      document: this.toDocumentVo(result.document),
      items: result.items.map((chunk) => this.toChunkVo(chunk)),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  private toVo(knowledgeBase: KnowledgeBaseRecord): KnowledgeBaseVo {
    return {
      id: knowledgeBase.id,
      title: knowledgeBase.name,
      author: knowledgeBase.owner.username,
      ...(knowledgeBase.description ? { description: knowledgeBase.description } : {}),
      ...(knowledgeBase.icon ? { icon: knowledgeBase.icon } : {}),
      createdAt: knowledgeBase.createdAt,
      updatedAt: knowledgeBase.updatedAt,
    }
  }

  private async requireKnowledgeBase(ownerId: string, knowledgeBaseId: string): Promise<void> {
    const knowledgeBase = await this.knowledgeBaseRepository.findById(ownerId, knowledgeBaseId)
    if (!knowledgeBase) throw new NotFoundException('知识库不存在')
  }

  private toSettingsVo(
    settings: KnowledgeBaseSettingsRecord,
    staleDocumentCount: number,
  ): KnowledgeBaseSettingsVo {
    return {
      segmentationMode: settings.segmentationMode,
      maxSegmentLength: settings.maxSegmentLength,
      overlapLength: settings.overlapLength,
      normalizeWhitespace: settings.normalizeWhitespace,
      segmentationRevision: settings.segmentationRevision,
      retrievalProfile: settings.retrievalProfile,
      retrievalTopK: settings.retrievalTopK,
      staleDocumentCount,
      updatedAt: settings.updatedAt,
      ...(settings.embeddingModelGroupId
        ? { embeddingModelGroupId: settings.embeddingModelGroupId }
        : {}),
      ...(settings.embeddingConfiguredModelId
        ? { embeddingConfiguredModelId: settings.embeddingConfiguredModelId }
        : {}),
    }
  }

  private toDocumentVo(document: KnowledgeDocumentRecord): KnowledgeDocumentVo {
    const currentRevision = document.knowledgeBase.settings?.segmentationRevision ?? 1
    return {
      id: document.id,
      knowledgeBaseId: document.knowledgeBaseId,
      name: document.name,
      fileType: document.fileType,
      sourceMimeType: document.sourceMimeType,
      sourceSize: document.sourceSize.toString(),
      segmentationMode: document.segmentationMode,
      maxSegmentLength: document.maxSegmentLength,
      overlapLength: document.overlapLength,
      normalizeWhitespace: document.normalizeWhitespace,
      status: document.status,
      enabled: document.enabled,
      characterCount: document.characterCount,
      chunkCount: document.chunkCount,
      recallCount: document._count.retrievalHits,
      needsReindex: document.indexedSegmentationRevision < currentRevision,
      ...(document.errorMessage ? { errorMessage: document.errorMessage } : {}),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }
  }

  private toIndexVo(
    index: KnowledgeBaseIndexRecord,
    activeIndexId: string | null,
  ): KnowledgeBaseIndexVo {
    return {
      id: index.id,
      generation: index.generation,
      configuredModelId: index.configuredModelId,
      embeddingProvider: index.embeddingProvider,
      embeddingModelId: index.embeddingModelId,
      distanceMetric: index.distanceMetric,
      configHash: index.configHash,
      status: index.status,
      active: activeIndexId === index.id,
      createdAt: index.createdAt,
      ...(index.embeddingDimension ? { embeddingDimension: index.embeddingDimension } : {}),
      ...(index.embeddingSpaceKey ? { embeddingSpaceKey: index.embeddingSpaceKey } : {}),
      ...(index.errorCode ? { errorCode: index.errorCode } : {}),
      ...(index.errorMessage ? { errorMessage: index.errorMessage } : {}),
      ...(index.readyAt ? { readyAt: index.readyAt } : {}),
      ...(index.activatedAt ? { activatedAt: index.activatedAt } : {}),
      ...(index.retiredAt ? { retiredAt: index.retiredAt } : {}),
    }
  }

  private toChunkVo(chunk: KnowledgeChunkRecord): KnowledgeChunkVo {
    return {
      id: chunk.id,
      sequence: chunk.sequence,
      content: chunk.content,
      characterCount: chunk.content.length,
      tokenCount: chunk.tokenCount,
      metadata: chunk.metadata as Record<string, unknown>,
      createdAt: chunk.createdAt,
    }
  }

  private resolveFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (extension === 'pdf') return 'pdf'
    return extension === 'md' || extension === 'markdown' ? 'markdown' : 'text'
  }
}

export interface UploadedKnowledgeDocument {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}
