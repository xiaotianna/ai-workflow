import {
  KnowledgeSearchProjectionStore,
  type KnowledgeSearchHit,
} from '@/infra/knowledge/knowledge-search-projection.store'
import { KnowledgeVectorStore } from '@/infra/knowledge/knowledge-vector.store'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import {
  KnowledgeRetrievalRepository,
  type RetrievableKnowledgeChunk,
  type KnowledgeRetrievalIndex,
} from '@/repositories/knowledge-retrieval.repository'
import { KnowledgeEmbeddingService } from '@/services/knowledge-embedding.service'
import { KnowledgeRerankerService } from '@/services/knowledge-reranker.service'
import { KnowledgeRetrievalProfileService } from '@/services/knowledge-retrieval-profile.service'
import type { RetrieveExecutorKnowledgeDto } from '@/dto/executor-knowledge.dto'
import type {
  KnowledgeRetrievalDocumentVo,
  KnowledgeRetrievalVo,
} from '@/vo/knowledge-retrieval.vo'
import { ragNodeSchema, workflowSchema } from '@ai-workflow/core'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { createHash } from 'node:crypto'

const RRF_RANK_CONSTANT = 60

interface FusionCandidate {
  hit: KnowledgeSearchHit
  score: number
  distanceMetric: KnowledgeRetrievalIndex['distanceMetric']
  bm25Rank?: number
  denseRank?: number
  bm25Score?: number
  denseScore?: number
}

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly executorModelRepository: ExecutorModelRepository,
    private readonly knowledgeRetrievalRepository: KnowledgeRetrievalRepository,
    private readonly knowledgeEmbeddingService: KnowledgeEmbeddingService,
    private readonly projectionStore: KnowledgeSearchProjectionStore,
    private readonly vectorStore: KnowledgeVectorStore,
    private readonly profileService: KnowledgeRetrievalProfileService,
    private readonly rerankerService: KnowledgeRerankerService,
  ) {}

  async retrieveForExecutor(dto: RetrieveExecutorKnowledgeDto): Promise<KnowledgeRetrievalVo> {
    const context = await this.executorModelRepository.findResolutionContext(dto)
    if (!context) throw new NotFoundException('知识库检索上下文不存在或租约已失效')

    const workflow = workflowSchema.safeParse(context.run.version.definition)
    if (!workflow.success) throw new UnprocessableEntityException('运行绑定的工作流版本无效')
    const node = workflow.data.nodes.find((candidate) => candidate.id === dto.nodeId)
    if (!node || node.type !== 'rag') throw new NotFoundException('RAG 节点不存在')
    const config = ragNodeSchema.safeParse(node.config)
    if (!config.success) throw new UnprocessableEntityException('RAG 节点配置无效')
    const knowledgeBaseIds = config.data.knowledgeBases.map(({ id }) => id)
    if (!knowledgeBaseIds.length) throw new UnprocessableEntityException('RAG 节点尚未选择知识库')

    return this.retrieve(
      context.run.workflow.app.ownerId,
      knowledgeBaseIds,
      dto.query,
      config.data.topK,
      { workflowCommandId: dto.commandId },
    )
  }

  async retrieve(
    ownerId: string,
    knowledgeBaseIds: string[],
    query: string,
    topK: number,
    options: {
      workflowCommandId?: string
      debug?: boolean
      metadataFilter?: Record<string, unknown>
    } = {},
  ): Promise<KnowledgeRetrievalVo> {
    const startedAt = Date.now(),
      uniqueKnowledgeBaseIds = [...new Set(knowledgeBaseIds)],
      requestedMetadataFilter = normalizeMetadataFilter(options.metadataFilter),
      indexes = await this.knowledgeRetrievalRepository.findActiveIndexes(
        ownerId,
        uniqueKnowledgeBaseIds,
      )
    if (indexes.length !== uniqueKnowledgeBaseIds.length) {
      const states = await this.knowledgeRetrievalRepository.findRetrievalStates(
        ownerId,
        uniqueKnowledgeBaseIds,
      )
      if (states.length !== uniqueKnowledgeBaseIds.length) {
        throw new NotFoundException('部分知识库不存在')
      }
      if (states.some(({ embeddingModelConfigured }) => !embeddingModelConfigured)) {
        throw new ConflictException('请先在知识库设置中选择嵌入模型')
      }
      if (states.some(({ latestIndexStatus }) => latestIndexStatus === 'FAILED')) {
        throw new ConflictException('知识库索引构建失败，请检查索引服务和知识库设置')
      }
      if (states.some(({ latestIndexStatus }) => latestIndexStatus === 'BUILDING')) {
        throw new ConflictException('知识库索引正在构建，请稍后重试')
      }
      throw new ConflictException('知识库尚未完成索引')
    }
    const metadataFilter = await this.validateMetadataFilter(
        ownerId,
        uniqueKnowledgeBaseIds,
        requestedMetadataFilter,
      ),
      groups = groupIndexes(indexes),
      profile = this.profileService.resolve(
        indexes.map((index) => index.knowledgeBase.settings?.retrievalProfile ?? 'HYBRID_ACCURATE'),
      ),
      channels = await Promise.all(
        groups.map(async (group) => {
          const queryVector = await this.knowledgeEmbeddingService.embedQuery(group[0], query),
            groupKnowledgeBaseIds = group.map(({ knowledgeBaseId }) => knowledgeBaseId),
            knowledgeBaseIndexIds = group.map(({ id }) => id),
            [bm25, dense] = await Promise.all([
              this.projectionStore.searchBm25({
                embeddingSpaceKey: group[0].embeddingSpaceKey as string,
                ownerId,
                knowledgeBaseIds: groupKnowledgeBaseIds,
                knowledgeBaseIndexIds,
                query,
                candidateCount: profile.candidateCount,
              }),
              this.vectorStore.search({
                ownerId,
                knowledgeBaseIds: groupKnowledgeBaseIds,
                knowledgeBaseIndexIds,
                queryVector,
                embeddingDimension: group[0].embeddingDimension as number,
                distanceMetric: group[0].distanceMetric,
                candidateCount: profile.candidateCount,
                ...(metadataFilter ? { metadataFilter } : {}),
              }),
            ])
          return { bm25, dense, distanceMetric: group[0].distanceMetric }
        }),
      ),
      retrievableChunks = await this.knowledgeRetrievalRepository.findRetrievableChunks(
        ownerId,
        [
          ...new Set(
            channels.flatMap((channel) =>
              [...channel.bm25, ...channel.dense].map(({ chunkId }) => chunkId),
            ),
          ),
        ],
        metadataFilter,
      ),
      scores = new Map<string, FusionCandidate>()
    for (const channel of channels) {
      addRrfScores(
        scores,
        hydrateRetrievableHits(channel.bm25, retrievableChunks),
        'bm25Rank',
        channel.distanceMetric,
      )
      addRrfScores(
        scores,
        hydrateRetrievableHits(channel.dense, retrievableChunks),
        'denseRank',
        channel.distanceMetric,
      )
    }
    const fusedCandidates = [...scores.values()]
        .sort(
          (left, right) =>
            right.score - left.score || left.hit.chunkId.localeCompare(right.hit.chunkId),
        )
        .map(
          ({ hit, score, distanceMetric, bm25Rank, denseRank, bm25Score, denseScore }, index) => ({
            ...hit,
            score,
            distanceMetric,
            rrfScore: score,
            rrfRank: index + 1,
            ...(bm25Rank ? { bm25Rank } : {}),
            ...(denseRank ? { denseRank } : {}),
            ...(bm25Score !== undefined ? { bm25Score } : {}),
            ...(denseScore !== undefined ? { denseScore } : {}),
          }),
        ),
      rankedCandidates = profile.rerank
        ? this.rerankerService
            .rerank(
              query,
              fusedCandidates.slice(0, profile.rerankCandidateCount),
              profile.minimumRerankScore,
            )
            .map((candidate) => ({ ...candidate, score: candidate.rerankScore }))
        : fusedCandidates,
      selectedCandidates = selectDiverseCandidates(
        rankedCandidates,
        topK,
        profile.maxResultsPerDocument,
      ),
      documents = selectedCandidates.map((candidate) => ({
        chunkId: candidate.chunkId,
        documentId: candidate.documentId,
        documentVersionId: candidate.documentVersionId,
        documentName: candidate.documentName,
        sequence: candidate.sequence,
        content: candidate.content,
        metadata: candidate.metadata,
        score: candidate.score,
        ...(options.debug
          ? {
              ...(candidate.bm25Rank ? { bm25Rank: candidate.bm25Rank } : {}),
              ...(candidate.denseRank ? { denseRank: candidate.denseRank } : {}),
              ...(candidate.bm25Score !== undefined ? { bm25Score: candidate.bm25Score } : {}),
              ...(candidate.denseScore !== undefined ? { denseScore: candidate.denseScore } : {}),
              rrfRank: candidate.rrfRank,
              rrfScore: candidate.rrfScore,
              ...('rerankScore' in candidate
                ? { rerankScore: candidate.rerankScore as number }
                : {}),
            }
          : {}),
      })) satisfies KnowledgeRetrievalDocumentVo[]

    if (options.workflowCommandId) {
      await this.knowledgeRetrievalRepository.recordWorkflowRetrieval({
        ownerId,
        commandId: options.workflowCommandId,
        queryHash: createHash('sha256').update(query).digest('hex'),
        latencyMs: Date.now() - startedAt,
        hits: collapseDocumentHits(documents),
      })
    }

    return {
      profile: profile.id,
      profileVersion: profile.version,
      scoreType: profile.rerank ? 'rerank' : 'rrf',
      documents,
    }
  }

  private async validateMetadataFilter(
    ownerId: string,
    knowledgeBaseIds: string[],
    filter: Record<string, string | number> | undefined,
  ): Promise<Record<string, string | number> | undefined> {
    if (!filter) return undefined
    const fields = await this.knowledgeRetrievalRepository.findMetadataFields(
      ownerId,
      knowledgeBaseIds,
      Object.keys(filter),
    )
    if (fields.length !== Object.keys(filter).length) {
      throw new BadRequestException('元数据过滤字段不存在或不属于所选知识库')
    }
    const normalized = { ...filter }
    for (const field of fields) {
      const value = filter[field.id]
      if (field.type === 'number' && typeof value !== 'number') {
        throw new BadRequestException('数字元数据过滤值必须是数字')
      }
      if (
        field.type === 'time' &&
        (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
      ) {
        throw new BadRequestException('时间元数据过滤值必须是有效时间字符串')
      }
      if (field.type === 'time') normalized[field.id] = new Date(value as string).toISOString()
      if (field.type === 'string' && typeof value !== 'string') {
        throw new BadRequestException('文本元数据过滤值必须是字符串')
      }
    }
    return normalized
  }
}

function hydrateRetrievableHits(
  hits: KnowledgeSearchHit[],
  chunks: Map<string, RetrievableKnowledgeChunk>,
): KnowledgeSearchHit[] {
  return hits.flatMap((hit) => {
    const chunk = chunks.get(hit.chunkId)
    return chunk?.documentVersionId === hit.documentVersionId
      ? [{ ...hit, metadata: chunk.metadata }]
      : []
  })
}

function normalizeMetadataFilter(
  value: Record<string, unknown> | undefined,
): Record<string, string | number> | undefined {
  if (value === undefined) return undefined
  const entries = Object.entries(value)
  if (entries.length > 20) throw new BadRequestException('元数据过滤条件不能超过 20 个')
  if (!entries.length) return undefined

  const normalized: Record<string, string | number> = {}
  for (const [fieldId, fieldValue] of entries) {
    if (!UUID_V4_PATTERN.test(fieldId)) throw new BadRequestException('元数据过滤字段 ID 无效')
    if (typeof fieldValue === 'string') {
      const text = fieldValue.trim()
      if (!text || text.length > 1000) throw new BadRequestException('元数据过滤值无效')
      normalized[fieldId] = text
      continue
    }
    if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
      normalized[fieldId] = fieldValue
      continue
    }
    throw new BadRequestException('元数据过滤值只支持字符串、时间字符串或数字')
  }
  return normalized
}

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function collapseDocumentHits(documents: KnowledgeRetrievalDocumentVo[]): Array<{
  documentId: string
  firstChunkId: string
  documentVersionId: string
  rank: number
  scoreSnapshot: number
  matchedChunkCount: number
}> {
  const hits = new Map<
    string,
    {
      documentId: string
      firstChunkId: string
      documentVersionId: string
      rank: number
      scoreSnapshot: number
      matchedChunkCount: number
    }
  >()

  documents.forEach((document, index) => {
    const current = hits.get(document.documentId)
    if (current) {
      current.matchedChunkCount += 1
      return
    }
    hits.set(document.documentId, {
      documentId: document.documentId,
      firstChunkId: document.chunkId,
      documentVersionId: document.documentVersionId,
      rank: index + 1,
      scoreSnapshot: document.score,
      matchedChunkCount: 1,
    })
  })

  return [...hits.values()]
}

function groupIndexes(indexes: KnowledgeRetrievalIndex[]): KnowledgeRetrievalIndex[][] {
  const groups = new Map<string, KnowledgeRetrievalIndex[]>()
  for (const index of indexes) {
    if (!index.embeddingSpaceKey || !index.embeddingDimension) {
      throw new ConflictException('知识库活动索引缺少 Embedding 空间信息')
    }
    const group = groups.get(index.embeddingSpaceKey) ?? []
    group.push(index)
    groups.set(index.embeddingSpaceKey, group)
  }
  return [...groups.values()]
}

function addRrfScores(
  scores: Map<string, FusionCandidate>,
  hits: KnowledgeSearchHit[],
  rankKey: 'bm25Rank' | 'denseRank',
  distanceMetric: KnowledgeRetrievalIndex['distanceMetric'],
): void {
  hits.forEach((hit, index) => {
    const current = scores.get(hit.chunkId),
      score = (current?.score ?? 0) + 1 / (RRF_RANK_CONSTANT + index + 1)
    scores.set(hit.chunkId, {
      hit,
      score,
      distanceMetric,
      ...(current?.bm25Rank ? { bm25Rank: current.bm25Rank } : {}),
      ...(current?.denseRank ? { denseRank: current.denseRank } : {}),
      ...(current?.bm25Score !== undefined ? { bm25Score: current.bm25Score } : {}),
      ...(current?.denseScore !== undefined ? { denseScore: current.denseScore } : {}),
      [rankKey]: index + 1,
      [rankKey === 'bm25Rank' ? 'bm25Score' : 'denseScore']: hit.score,
    })
  })
}

function selectDiverseCandidates<T extends { chunkId: string; documentId: string }>(
  candidates: T[],
  topK: number,
  maxResultsPerDocument: number,
): T[] {
  const selected: T[] = [],
    deferred: T[] = [],
    documentCounts = new Map<string, number>()

  for (const candidate of candidates) {
    const documentCount = documentCounts.get(candidate.documentId) ?? 0
    if (documentCount >= maxResultsPerDocument) {
      deferred.push(candidate)
      continue
    }
    selected.push(candidate)
    documentCounts.set(candidate.documentId, documentCount + 1)
    if (selected.length === topK) return selected
  }

  for (const candidate of deferred) {
    selected.push(candidate)
    if (selected.length === topK) break
  }
  return selected
}
