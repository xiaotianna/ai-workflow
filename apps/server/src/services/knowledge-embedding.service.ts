import type { ModelProviderTypeValue } from '@/constant/model'
import { KnowledgeSearchProjectionStore } from '@/infra/knowledge/knowledge-search-projection.store'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import type { ModelProviderAdapter } from '@/infra/model-provider/model-provider.adapter'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { KnowledgeIngestionRepository } from '@/repositories/knowledge-ingestion.repository'
import type { KnowledgeRetrievalIndex } from '@/repositories/knowledge-retrieval.repository'
import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'

const EMBEDDING_BATCH_SIZE = 32
const EMBEDDING_TIMEOUT_MS = 60_000
const MAX_EMBEDDING_RESPONSE_BYTES = 32 * 1024 * 1024

@Injectable()
export class KnowledgeEmbeddingService {
  constructor(
    private readonly knowledgeIngestionRepository: KnowledgeIngestionRepository,
    private readonly modelCredentialService: ModelCredentialService,
    private readonly modelProviderRegistry: ModelProviderRegistry,
    private readonly projectionStore: KnowledgeSearchProjectionStore,
  ) {}

  async embedQuery(index: KnowledgeRetrievalIndex, query: string): Promise<number[]> {
    const provider = this.modelProviderRegistry.get(
      index.embeddingProvider as ModelProviderTypeValue,
    )
    const group = index.configuredModel.group
    const apiKey = this.modelCredentialService.decrypt(group, group.id)
    const vectors = await createEmbeddings({
      provider,
      modelId: index.embeddingModelId,
      baseUrl: group.baseUrl,
      apiKey,
      contents: [query],
    })
    const vector = vectors[0]
    if (!vector || vector.length !== index.embeddingDimension) {
      throw new Error('查询向量维度与活动索引不一致')
    }
    return vector
  }

  async initializeEmptyIndex(knowledgeBaseIndexId: string): Promise<'completed' | 'stale'> {
    const index = await this.knowledgeIngestionRepository.getEmptyIndexBuild(knowledgeBaseIndexId)
    if (!index) return 'stale'

    const provider = this.modelProviderRegistry.get(
      index.embeddingProvider as ModelProviderTypeValue,
    )
    const group = index.configuredModel.group
    const apiKey = this.modelCredentialService.decrypt(group, group.id)
    const vectors = await createEmbeddings({
      provider,
      modelId: index.embeddingModelId,
      baseUrl: group.baseUrl,
      apiKey,
      contents: ['knowledge index dimension probe'],
    })
    const dimension = vectors[0]?.length ?? 0
    if (!dimension) throw new Error('Embedding 探测未返回有效维度')
    const embeddingSpaceKey = createEmbeddingSpaceKey({
      provider: index.embeddingProvider,
      model: index.embeddingModelId,
      dimension,
      distanceMetric: index.distanceMetric,
    })
    await this.projectionStore.ensureEmbeddingSpace({
      embeddingSpaceKey,
      embeddingDimension: dimension,
      distanceMetric: index.distanceMetric,
    })
    return this.knowledgeIngestionRepository.activateEmptyIndex({
      knowledgeBaseIndexId: index.id,
      embeddingDimension: dimension,
      embeddingSpaceKey,
    })
  }

  async embedAndProjectVersion(
    documentVersionId: string,
    workerId: string,
    maxAttempts: number,
  ): Promise<'completed' | 'stale' | 'failed'> {
    const version = await this.knowledgeIngestionRepository.claimProjection(
      documentVersionId,
      workerId,
    )
    if (!version) return 'stale'

    try {
      const { knowledgeBaseIndex: index } = version
      const provider = this.modelProviderRegistry.get(
        index.embeddingProvider as ModelProviderTypeValue,
      )
      const group = index.configuredModel.group
      const apiKey = this.modelCredentialService.decrypt(group, group.id)
      const vectors = await createEmbeddings({
        provider,
        modelId: index.embeddingModelId,
        baseUrl: group.baseUrl,
        apiKey,
        contents: version.chunks.map(({ content }) => content),
      })

      const dimension = vectors[0]?.length ?? 0
      if (!dimension || vectors.some((vector) => vector.length !== dimension)) {
        throw new Error('Embedding 向量维度不一致')
      }
      const embeddingSpaceKey = createEmbeddingSpaceKey({
        provider: index.embeddingProvider,
        model: index.embeddingModelId,
        dimension,
        distanceMetric: index.distanceMetric,
      })
      const projected = await this.projectionStore.writeVersion({
        embeddingSpaceKey,
        embeddingDimension: dimension,
        distanceMetric: index.distanceMetric,
        ownerId: index.knowledgeBase.ownerId,
        knowledgeBaseId: index.knowledgeBaseId,
        knowledgeBaseIndexId: index.id,
        documentId: version.document.id,
        documentVersionId: version.id,
        documentName: version.document.name,
        documentEnabled: version.document.enabled,
        projectionChecksum: version.expectedChecksum,
        chunks: version.chunks.map((chunk, chunkIndex) => ({
          id: chunk.id,
          sequence: chunk.sequence,
          content: chunk.content,
          contentHash:
            chunk.contentHash ?? createHash('sha256').update(chunk.content).digest('hex'),
          metadata: chunk.metadata as Record<string, unknown>,
          embedding: vectors[chunkIndex],
        })),
      })
      if (
        projected.count !== version.chunks.length ||
        projected.checksum !== version.expectedChecksum
      ) {
        throw new Error('OpenSearch 投影完整性校验失败')
      }

      return this.knowledgeIngestionRepository.finishProjection({
        documentVersionId: version.id,
        attemptId: version.attemptId,
        embeddingDimension: dimension,
        embeddingSpaceKey,
        projectedChecksum: projected.checksum,
        projectedChunkCount: projected.count,
      })
    } catch (error) {
      const retryable = version.attempt < maxAttempts
      await this.knowledgeIngestionRepository.failProjection({
        documentVersionId: version.id,
        attemptId: version.attemptId,
        errorMessage: getErrorMessage(error),
        retryable,
      })
      if (retryable) throw error
      return 'failed'
    }
  }
}

function createEmbeddingSpaceKey(options: {
  provider: string
  model: string
  dimension: number
  distanceMetric: string
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        ...options,
        taskType: 'document',
        normalization: 'provider-default',
        mappingVersion: 'opensearch-v1',
      }),
    )
    .digest('hex')
}

async function createEmbeddings(options: {
  provider: ModelProviderAdapter
  modelId: string
  baseUrl: string | null
  apiKey?: string
  contents: string[]
}): Promise<number[][]> {
  const batches = Array.from(
    { length: Math.ceil(options.contents.length / EMBEDDING_BATCH_SIZE) },
    (_, index) =>
      options.contents.slice(index * EMBEDDING_BATCH_SIZE, (index + 1) * EMBEDDING_BATCH_SIZE),
  )

  return batches.reduce<Promise<number[][]>>(async (pendingVectors, batch) => {
    const vectors = await pendingVectors
    const request = options.provider.createEmbeddingRequest(options.modelId, batch, options.baseUrl)
    const response = await fetch(request.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify(request.body),
      redirect: 'manual',
      signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
    })
    const body = await readLimitedJson(response)
    if (!response.ok) {
      throw new Error(`Embedding 上游返回 HTTP ${response.status}：${readErrorMessage(body)}`)
    }
    const batchVectors = request.extractEmbeddings(body)
    if (batchVectors.length !== batch.length) {
      throw new Error('Embedding 返回数量与请求数量不一致')
    }
    return [...vectors, ...batchVectors]
  }, Promise.resolve([]))
}

async function readLimitedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_EMBEDDING_RESPONSE_BYTES) {
    await response.body?.cancel()
    throw new Error('Embedding 响应超过大小限制')
  }
  const text = await response.text()
  if (Buffer.byteLength(text) > MAX_EMBEDDING_RESPONSE_BYTES) {
    throw new Error('Embedding 响应超过大小限制')
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('Embedding 响应不是合法 JSON')
  }
}

function readErrorMessage(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '上游请求失败'
  const error = (value as Record<string, unknown>).error
  if (typeof error === 'string') return error.slice(0, 500)
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string') return message.slice(0, 500)
  }
  return '上游请求失败'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '未知错误'
}
