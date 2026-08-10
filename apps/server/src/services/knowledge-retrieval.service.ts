import { KnowledgeSearchProjectionStore } from '@/infra/knowledge/knowledge-search-projection.store'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import {
  KnowledgeRetrievalRepository,
  type KnowledgeRetrievalIndex,
} from '@/repositories/knowledge-retrieval.repository'
import { KnowledgeEmbeddingService } from '@/services/knowledge-embedding.service'
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

const RRF_RANK_CONSTANT = 60
const MAX_CANDIDATES_PER_CHANNEL = 100

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly executorModelRepository: ExecutorModelRepository,
    private readonly knowledgeRetrievalRepository: KnowledgeRetrievalRepository,
    private readonly knowledgeEmbeddingService: KnowledgeEmbeddingService,
    private readonly projectionStore: KnowledgeSearchProjectionStore,
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
    )
  }

  async retrieve(
    ownerId: string,
    knowledgeBaseIds: string[],
    query: string,
    topK: number,
  ): Promise<KnowledgeRetrievalVo> {
    const indexes = await this.knowledgeRetrievalRepository.findActiveIndexes(
      ownerId,
      knowledgeBaseIds,
    )
    if (indexes.length !== knowledgeBaseIds.length) {
      throw new ConflictException('部分知识库不存在或尚未完成索引')
    }
    const groups = groupIndexes(indexes)
    const candidateCount = Math.min(MAX_CANDIDATES_PER_CHANNEL, Math.max(topK * 5, 20))
    const channels = await Promise.all(
      groups.map(async (group) => {
        const queryVector = await this.knowledgeEmbeddingService.embedQuery(group[0], query)
        return this.projectionStore.search({
          embeddingSpaceKey: group[0].embeddingSpaceKey as string,
          ownerId,
          knowledgeBaseIds: group.map(({ knowledgeBaseId }) => knowledgeBaseId),
          knowledgeBaseIndexIds: group.map(({ id }) => id),
          query,
          queryVector,
          candidateCount,
        })
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

    const scores = new Map<string, { hit: KnowledgeRetrievalDocumentVo; score: number }>()
    for (const channel of channels) {
      addRrfScores(
        scores,
        channel.bm25.filter(({ documentVersionId }) =>
          retrievableVersionIds.has(documentVersionId),
        ),
      )
      addRrfScores(
        scores,
        channel.dense.filter(({ documentVersionId }) =>
          retrievableVersionIds.has(documentVersionId),
        ),
      )
    }
    return {
      documents: [...scores.values()]
        .sort(
          (left, right) =>
            right.score - left.score || left.hit.chunkId.localeCompare(right.hit.chunkId),
        )
        .slice(0, topK)
        .map(({ hit, score }) => ({ ...hit, score })),
    }
  }
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
  scores: Map<string, { hit: KnowledgeRetrievalDocumentVo; score: number }>,
  hits: Array<{
    chunkId: string
    documentId: string
    documentVersionId: string
    documentName: string
    sequence: number
    content: string
    metadata: Record<string, unknown>
  }>,
): void {
  hits.forEach((hit, index) => {
    const current = scores.get(hit.chunkId)
    const score = (current?.score ?? 0) + 1 / (RRF_RANK_CONSTANT + index + 1)
    scores.set(hit.chunkId, { hit: { ...hit, score }, score })
  })
}
