import {
  OPENSEARCH_PASSWORD,
  OPENSEARCH_TLS_REJECT_UNAUTHORIZED,
  OPENSEARCH_URL,
  OPENSEARCH_USERNAME,
} from '@/constant/env'
import {
  normalizeKnowledgeSearchText,
  readKnowledgeSearchMetadata,
} from '@/utils/knowledge-search-text'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from '@opensearch-project/opensearch'

interface ProjectionChunk {
  id: string
  sequence: number
  content: string
  contentHash: string
  metadata: Record<string, unknown>
}

interface WriteProjectionInput {
  embeddingSpaceKey: string
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
  private readonly searchSchemaReadyIndexes = new Set<string>()

  constructor(configService: ConfigService) {
    const username = configService.get<string>(OPENSEARCH_USERNAME) || undefined,
      password = configService.get<string>(OPENSEARCH_PASSWORD) || undefined
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
    await this.ensureIndex(index)

    const body = input.chunks.flatMap((chunk) => [
        { index: { _index: index, _id: chunk.id } },
        createProjectionDocument(input, chunk),
      ]),
      result = await this.client.bulk({ body, refresh: 'wait_for' })
    if (result.body.errors) {
      const failed = result.body.items.find((item) => {
          const operation = item.index ?? item.create ?? item.update ?? item.delete
          return Boolean(operation?.error)
        }),
        reason = failed ? JSON.stringify(failed).slice(0, 1000) : '未知 bulk 错误'
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

  ensureEmbeddingSpace(options: { embeddingSpaceKey: string }): Promise<void> {
    return this.ensureIndex(this.getPhysicalIndexName(options.embeddingSpaceKey))
  }

  async searchBm25(options: {
    embeddingSpaceKey: string
    ownerId: string
    knowledgeBaseIds: string[]
    knowledgeBaseIndexIds: string[]
    query: string
    candidateCount: number
  }): Promise<KnowledgeSearchHit[]> {
    const index = this.getPhysicalIndexName(options.embeddingSpaceKey)
    await this.ensureSearchFields(index)
    const filter = [
        { term: { owner_id: options.ownerId } },
        { terms: { knowledge_base_id: options.knowledgeBaseIds } },
        { terms: { knowledge_base_index_id: options.knowledgeBaseIndexIds } },
        { term: { document_enabled: true } },
      ],
      source = [
        'document_id',
        'document_version_id',
        'document_name',
        'sequence',
        'content',
        'content_hash',
        'metadata',
      ],
      bm25 = await this.client.search({
        index,
        body: {
          size: options.candidateCount,
          _source: source,
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: normalizeKnowledgeSearchText(options.query),
                    fields: [
                      'title^5',
                      'title_path^3',
                      'document_name^2',
                      'search_content^1.5',
                      'content',
                    ],
                    type: 'best_fields',
                  },
                },
              ],
              should: [
                { match_phrase: { title: { query: options.query, boost: 8 } } },
                {
                  match_phrase: {
                    title_path: { query: options.query, boost: 6 },
                  },
                },
                {
                  match_phrase: {
                    search_content: { query: options.query, boost: 4 },
                  },
                },
                { match_phrase: { content: { query: options.query, boost: 2 } } },
              ],
              filter,
            },
          },
        },
      })
    return parseSearchHits(bm25.body.hits.hits)
  }

  private async ensureIndex(index: string): Promise<void> {
    const exists = await this.client.indices.exists({ index })
    if (exists.body) {
      await this.ensureSearchFields(index)
      return
    }

    try {
      await this.client.indices.create({
        index,
        body: {
          mappings: {
            dynamic: false,
            properties: {
              owner_id: { type: 'keyword' },
              knowledge_base_id: { type: 'keyword' },
              knowledge_base_index_id: { type: 'keyword' },
              document_id: { type: 'keyword' },
              document_version_id: { type: 'keyword' },
              document_name: { type: 'text', analyzer: 'cjk' },
              title: { type: 'text', analyzer: 'cjk' },
              title_path: { type: 'text', analyzer: 'cjk' },
              document_enabled: { type: 'boolean' },
              sequence: { type: 'integer' },
              content: { type: 'text', analyzer: 'cjk' },
              search_content: { type: 'text', analyzer: 'cjk' },
              content_hash: { type: 'keyword' },
              projection_checksum: { type: 'keyword' },
              metadata: { type: 'flat_object' },
            },
          },
        },
      })
      this.searchSchemaReadyIndexes.add(index)
    } catch (error) {
      const raced = await this.client.indices.exists({ index })
      if (!raced.body) throw error
      await this.ensureSearchFields(index)
    }
  }

  private async ensureSearchFields(index: string): Promise<void> {
    if (this.searchSchemaReadyIndexes.has(index)) return
    await this.client.indices.putMapping({
      index,
      body: {
        properties: {
          title: { type: 'text', analyzer: 'cjk' },
          title_path: { type: 'text', analyzer: 'cjk' },
          search_content: { type: 'text', analyzer: 'cjk' },
        },
      },
    })
    this.searchSchemaReadyIndexes.add(index)
  }

  private getPhysicalIndexName(embeddingSpaceKey: string): string {
    if (!/^[a-f0-9]{64}$/.test(embeddingSpaceKey)) {
      throw new Error('Embedding Space Key 无效')
    }
    return `knowledge-chunks-${embeddingSpaceKey}-v1`
  }
}

function createProjectionDocument(input: WriteProjectionInput, chunk: ProjectionChunk) {
  const searchMetadata = readKnowledgeSearchMetadata(chunk.metadata, chunk.content)
  return {
    owner_id: input.ownerId,
    knowledge_base_id: input.knowledgeBaseId,
    knowledge_base_index_id: input.knowledgeBaseIndexId,
    document_id: input.documentId,
    document_version_id: input.documentVersionId,
    document_name: input.documentName,
    document_enabled: input.documentEnabled,
    sequence: chunk.sequence,
    title: searchMetadata.title ?? input.documentName,
    title_path: searchMetadata.titlePath ?? searchMetadata.title ?? input.documentName,
    content: chunk.content,
    search_content: normalizeKnowledgeSearchText(chunk.content),
    content_hash: chunk.contentHash,
    projection_checksum: input.projectionChecksum,
    metadata: chunk.metadata,
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
