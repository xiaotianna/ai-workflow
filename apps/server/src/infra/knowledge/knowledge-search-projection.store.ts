import {
  OPENSEARCH_PASSWORD,
  OPENSEARCH_TLS_REJECT_UNAUTHORIZED,
  OPENSEARCH_URL,
  OPENSEARCH_USERNAME,
} from '@/constant/env'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from '@opensearch-project/opensearch'

interface ProjectionChunk {
  id: string
  sequence: number
  content: string
  contentHash: string
  metadata: Record<string, unknown>
  embedding: number[]
}

interface WriteProjectionInput {
  embeddingSpaceKey: string
  embeddingDimension: number
  distanceMetric: 'COSINE' | 'EUCLIDEAN' | 'INNER_PRODUCT'
  ownerId: string
  knowledgeBaseId: string
  knowledgeBaseIndexId: string
  documentId: string
  documentVersionId: string
  documentName: string
  documentEnabled: boolean
  projectionChecksum: string
  chunks: ProjectionChunk[]
}

export interface KnowledgeSearchHit {
  chunkId: string
  documentId: string
  documentVersionId: string
  documentName: string
  sequence: number
  content: string
  contentHash: string
  metadata: Record<string, unknown>
  score: number
}

@Injectable()
export class KnowledgeSearchProjectionStore {
  private readonly client: Client

  constructor(configService: ConfigService) {
    const username = configService.get<string>(OPENSEARCH_USERNAME) || undefined
    const password = configService.get<string>(OPENSEARCH_PASSWORD) || undefined
    this.client = new Client({
      node: configService.getOrThrow<string>(OPENSEARCH_URL),
      ...(username && password ? { auth: { username, password } } : {}),
      ssl: {
        rejectUnauthorized: configService.get<boolean>(OPENSEARCH_TLS_REJECT_UNAUTHORIZED) ?? true,
      },
    })
  }

  async writeVersion(input: WriteProjectionInput): Promise<{ count: number; checksum: string }> {
    const index = this.getPhysicalIndexName(input.embeddingSpaceKey)
    await this.ensureIndex(index, input.embeddingDimension, input.distanceMetric)

    const body = input.chunks.flatMap((chunk) => [
      { index: { _index: index, _id: chunk.id } },
      {
        owner_id: input.ownerId,
        knowledge_base_id: input.knowledgeBaseId,
        knowledge_base_index_id: input.knowledgeBaseIndexId,
        document_id: input.documentId,
        document_version_id: input.documentVersionId,
        document_name: input.documentName,
        document_enabled: input.documentEnabled,
        sequence: chunk.sequence,
        content: chunk.content,
        content_hash: chunk.contentHash,
        projection_checksum: input.projectionChecksum,
        metadata: chunk.metadata,
        content_vector: chunk.embedding,
      },
    ])
    const result = await this.client.bulk({ body, refresh: 'wait_for' })
    if (result.body.errors) {
      const failed = result.body.items.find((item) => {
        const operation = item.index ?? item.create ?? item.update ?? item.delete
        return Boolean(operation?.error)
      })
      const reason = failed ? JSON.stringify(failed).slice(0, 1000) : '未知 bulk 错误'
      throw new Error(`OpenSearch Bulk 写入失败：${reason}`)
    }

    const validation = await this.client.count({
      index,
      body: {
        query: {
          bool: {
            filter: [
              { term: { knowledge_base_index_id: input.knowledgeBaseIndexId } },
              { term: { document_version_id: input.documentVersionId } },
              { term: { projection_checksum: input.projectionChecksum } },
            ],
          },
        },
      },
    })
    return { count: validation.body.count, checksum: input.projectionChecksum }
  }

  ensureEmbeddingSpace(options: {
    embeddingSpaceKey: string
    embeddingDimension: number
    distanceMetric: WriteProjectionInput['distanceMetric']
  }): Promise<void> {
    return this.ensureIndex(
      this.getPhysicalIndexName(options.embeddingSpaceKey),
      options.embeddingDimension,
      options.distanceMetric,
    )
  }

  async search(options: {
    embeddingSpaceKey: string
    ownerId: string
    knowledgeBaseIds: string[]
    knowledgeBaseIndexIds: string[]
    query: string
    queryVector: number[]
    candidateCount: number
  }): Promise<{ bm25: KnowledgeSearchHit[]; dense: KnowledgeSearchHit[] }> {
    const index = this.getPhysicalIndexName(options.embeddingSpaceKey)
    const filter = [
      { term: { owner_id: options.ownerId } },
      { terms: { knowledge_base_id: options.knowledgeBaseIds } },
      { terms: { knowledge_base_index_id: options.knowledgeBaseIndexIds } },
      { term: { document_enabled: true } },
    ]
    const source = [
      'document_id',
      'document_version_id',
      'document_name',
      'sequence',
      'content',
      'content_hash',
      'metadata',
    ]
    const [bm25, dense] = await Promise.all([
      this.client.search({
        index,
        body: {
          size: options.candidateCount,
          _source: source,
          query: {
            bool: {
              must: [{ match: { content: { query: options.query } } }],
              filter,
            },
          },
        },
      }),
      this.client.search({
        index,
        body: {
          size: options.candidateCount,
          _source: source,
          query: {
            knn: {
              content_vector: {
                vector: options.queryVector,
                k: options.candidateCount,
                filter: { bool: { filter } },
              },
            },
          },
        },
      }),
    ])
    return {
      bm25: parseSearchHits(bm25.body.hits.hits),
      dense: parseSearchHits(dense.body.hits.hits),
    }
  }

  private async ensureIndex(
    index: string,
    dimension: number,
    distanceMetric: WriteProjectionInput['distanceMetric'],
  ): Promise<void> {
    const exists = await this.client.indices.exists({ index })
    if (exists.body) return

    try {
      await this.client.indices.create({
        index,
        body: {
          settings: {
            index: {
              knn: true,
            },
          },
          mappings: {
            dynamic: false,
            properties: {
              owner_id: { type: 'keyword' },
              knowledge_base_id: { type: 'keyword' },
              knowledge_base_index_id: { type: 'keyword' },
              document_id: { type: 'keyword' },
              document_version_id: { type: 'keyword' },
              document_name: { type: 'text', analyzer: 'cjk' },
              document_enabled: { type: 'boolean' },
              sequence: { type: 'integer' },
              content: { type: 'text', analyzer: 'cjk' },
              content_hash: { type: 'keyword' },
              projection_checksum: { type: 'keyword' },
              metadata: { type: 'flat_object' },
              content_vector: {
                type: 'knn_vector',
                dimension,
                space_type: toOpenSearchSpaceType(distanceMetric),
                method: {
                  name: 'hnsw',
                  engine: 'lucene',
                },
              },
            },
          },
        },
      })
    } catch (error) {
      const raced = await this.client.indices.exists({ index })
      if (!raced.body) throw error
    }
  }

  private getPhysicalIndexName(embeddingSpaceKey: string): string {
    if (!/^[a-f0-9]{64}$/.test(embeddingSpaceKey)) {
      throw new Error('Embedding Space Key 无效')
    }
    return `knowledge-chunks-${embeddingSpaceKey}-v1`
  }
}

function parseSearchHits(hits: Array<Record<string, unknown>>): KnowledgeSearchHit[] {
  return hits.map((hit) => {
    const source = hit._source
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      throw new Error('OpenSearch Hit 缺少 _source')
    }
    const value = source as Record<string, unknown>
    if (
      typeof hit._id !== 'string' ||
      typeof value.document_id !== 'string' ||
      typeof value.document_version_id !== 'string' ||
      typeof value.document_name !== 'string' ||
      typeof value.sequence !== 'number' ||
      typeof value.content !== 'string' ||
      typeof value.content_hash !== 'string'
    ) {
      throw new Error('OpenSearch Hit 结构无效')
    }
    return {
      chunkId: hit._id,
      documentId: value.document_id,
      documentVersionId: value.document_version_id,
      documentName: value.document_name,
      sequence: value.sequence,
      content: value.content,
      contentHash: value.content_hash,
      metadata:
        value.metadata && typeof value.metadata === 'object' && !Array.isArray(value.metadata)
          ? (value.metadata as Record<string, unknown>)
          : {},
      score: typeof hit._score === 'number' ? hit._score : 0,
    }
  })
}

function toOpenSearchSpaceType(
  distanceMetric: WriteProjectionInput['distanceMetric'],
): 'cosinesimil' | 'l2' | 'innerproduct' {
  if (distanceMetric === 'EUCLIDEAN') return 'l2'
  if (distanceMetric === 'INNER_PRODUCT') return 'innerproduct'
  return 'cosinesimil'
}
