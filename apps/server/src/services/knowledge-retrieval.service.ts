import {
  KnowledgeSearchProjectionStore,
  type KnowledgeSearchHit,
} from '@/infra/knowledge/knowledge-search-projection.store'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import {
  KnowledgeRetrievalRepository,
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
    options: { workflowCommandId?: string; debug?: boolean } = {},
  ): Promise<KnowledgeRetrievalVo> {
    const startedAt = Date.now()
    const uniqueKnowledgeBaseIds = [...new Set(knowledgeBaseIds)]
    const indexes = await this.knowledgeRetrievalRepository.findActiveIndexes(
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
    const groups = groupIndexes(indexes)
    const profile = this.profileService.resolve(
      indexes.map((index) => index.knowledgeBase.settings?.retrievalProfile ?? 'HYBRID_ACCURATE'),
    )
    const channels = await Promise.all(
      groups.map(async (group) => {
        const queryVector = await this.knowledgeEmbeddingService.embedQuery(group[0], query)
        const result = await this.projectionStore.search({
          embeddingSpaceKey: group[0].embeddingSpaceKey as string,
          ownerId,
          knowledgeBaseIds: group.map(({ knowledgeBaseId }) => knowledgeBaseId),
          knowledgeBaseIndexIds: group.map(({ id }) => id),
          query,
          queryVector,
          candidateCount: profile.candidateCount,
        })
        return { ...result, distanceMetric: group[0].distanceMetric }
      }),
    )

    const candidateVersionIds = [
      ...new Set(
        channels.flatMap((channel) =>
          [...channel.bm25, ...channel.dense].map(({ documentVersionId }) => documentVersionId),
        ),
      ),
    ]
    const retrievableVersionIds = await this.knowledgeRetrievalRepository.findRetrievableVersionIds(
      ownerId,
      candidateVersionIds,
    )
    const enabledChunkIds = await this.knowledgeRetrievalRepository.findEnabledChunkIds(
      channels.flatMap((channel) =>
        [...channel.bm25, ...channel.dense].map(({ chunkId }) => chunkId),
      ),
    )

    const scores = new Map<string, FusionCandidate>()
    for (const channel of channels) {
      addRrfScores(
        scores,
        channel.bm25.filter(
          ({ chunkId, documentVersionId }) =>
            enabledChunkIds.has(chunkId) && retrievableVersionIds.has(documentVersionId),
        ),
        'bm25Rank',
        channel.distanceMetric,
      )
      addRrfScores(
        scores,
        channel.dense.filter(
          ({ chunkId, documentVersionId }) =>
            enabledChunkIds.has(chunkId) && retrievableVersionIds.has(documentVersionId),
        ),
        'denseRank',
        channel.distanceMetric,
      )
    }
    const fusedCandidates = [...scores.values()]
      .sort(
        (left, right) =>
          right.score - left.score || left.hit.chunkId.localeCompare(right.hit.chunkId),
      )
      .map(({ hit, score, distanceMetric, bm25Rank, denseRank, bm25Score, denseScore }, index) => ({
        ...hit,
        score,
        distanceMetric,
        rrfScore: score,
        rrfRank: index + 1,
        ...(bm25Rank ? { bm25Rank } : {}),
        ...(denseRank ? { denseRank } : {}),
        ...(bm25Score !== undefined ? { bm25Score } : {}),
        ...(denseScore !== undefined ? { denseScore } : {}),
      }))
    const rankedCandidates = profile.rerank
      ? this.rerankerService
          .rerank(
            query,
            fusedCandidates.slice(0, profile.rerankCandidateCount),
            profile.minimumRerankScore,
          )
          .map((candidate) => ({ ...candidate, score: candidate.rerankScore }))
      : fusedCandidates
    const selectedCandidates = selectDiverseCandidates(
      rankedCandidates,
      topK,
      profile.maxResultsPerDocument,
    )
    const documents = selectedCandidates.map((candidate) => ({
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
            ...('rerankScore' in candidate ? { rerankScore: candidate.rerankScore as number } : {}),
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
}

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
    const current = scores.get(hit.chunkId)
    const score = (current?.score ?? 0) + 1 / (RRF_RANK_CONSTANT + index + 1)
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
  const selected: T[] = []
  const deferred: T[] = []
  const documentCounts = new Map<string, number>()

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
