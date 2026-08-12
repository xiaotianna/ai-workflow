import { Prisma } from '@/generated/prisma/client'
import type { KnowledgeSearchHit } from '@/infra/knowledge/knowledge-search-projection.store'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface StoredVectorChunk {
  id: string
}

interface PgVectorSearchRow {
  chunkId: string
  documentId: string
  documentVersionId: string
  documentName: string
  sequence: number
  content: string
  contentHash: string
  chunkMetadata: Prisma.JsonValue
  documentMetadata: Prisma.JsonValue
  score: number
}

@Injectable()
export class KnowledgeVectorStore {
  constructor(private readonly prisma: PrismaService) {}

  async writeVersion(options: {
    documentVersionId: string
    knowledgeBaseIndexId: string
    embeddingDimension: number
    chunks: StoredVectorChunk[]
    vectors: number[][]
  }): Promise<number> {
    if (!Number.isSafeInteger(options.embeddingDimension) || options.embeddingDimension <= 0) {
      throw new Error('Embedding 向量维度无效')
    }
    if (!options.chunks.length || options.chunks.length !== options.vectors.length) {
      throw new Error('Embedding 向量与分段数量不一致')
    }

    const values = options.chunks.map((chunk, index) => {
      const vector = options.vectors[index]
      assertVector(vector, options.embeddingDimension)
      return Prisma.sql`(${chunk.id}::uuid, ${toVectorLiteral(vector)}::vector)`
    })

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw(
        Prisma.sql`
          UPDATE "knowledge_chunks" AS chunk
          SET
            "embedding" = input."embedding",
            "embeddingDimension" = ${options.embeddingDimension}
          FROM (VALUES ${Prisma.join(values)}) AS input("id", "embedding")
          WHERE chunk."id" = input."id"
            AND chunk."documentVersionId" = ${options.documentVersionId}::uuid
            AND chunk."knowledgeBaseIndexId" = ${options.knowledgeBaseIndexId}::uuid
        `,
      )

      const rows = await transaction.$queryRaw<Array<{ count: number }>>(
        Prisma.sql`
          SELECT COUNT(*)::int AS "count"
          FROM "knowledge_chunks"
          WHERE "documentVersionId" = ${options.documentVersionId}::uuid
            AND "knowledgeBaseIndexId" = ${options.knowledgeBaseIndexId}::uuid
            AND "embedding" IS NOT NULL
            AND "embeddingDimension" = ${options.embeddingDimension}
            AND vector_dims("embedding") = ${options.embeddingDimension}
        `,
      )
      return rows[0]?.count ?? 0
    })
  }

  async search(options: {
    ownerId: string
    knowledgeBaseIds: string[]
    knowledgeBaseIndexIds: string[]
    queryVector: number[]
    embeddingDimension: number
    distanceMetric: 'COSINE' | 'EUCLIDEAN' | 'INNER_PRODUCT'
    candidateCount: number
    metadataFilter?: Record<string, string | number>
  }): Promise<KnowledgeSearchHit[]> {
    assertVector(options.queryVector, options.embeddingDimension)
    if (!options.knowledgeBaseIds.length || !options.knowledgeBaseIndexIds.length) return []

    const vector = Prisma.sql`${toVectorLiteral(options.queryVector)}::vector`,
      distance =
        options.distanceMetric === 'EUCLIDEAN'
          ? Prisma.sql`chunk."embedding" <-> ${vector}`
          : options.distanceMetric === 'INNER_PRODUCT'
            ? Prisma.sql`chunk."embedding" <#> ${vector}`
            : Prisma.sql`chunk."embedding" <=> ${vector}`,
      score =
        options.distanceMetric === 'EUCLIDEAN'
          ? Prisma.sql`1.0 / (1.0 + (${distance}))`
          : options.distanceMetric === 'INNER_PRODUCT'
            ? Prisma.sql`
              CASE
                WHEN -(${distance}) >= 0 THEN -(${distance}) + 1.0
                ELSE 1.0 / (1.0 - (-(${distance})))
              END
            `
            : Prisma.sql`1.0 - ((${distance}) / 2.0)`,
      metadataFilter = options.metadataFilter
        ? Prisma.sql`AND document."metadata" @> ${JSON.stringify(options.metadataFilter)}::jsonb`
        : Prisma.sql``,
      rows = await this.prisma.$queryRaw<PgVectorSearchRow[]>(
        Prisma.sql`
        SELECT
          chunk."id" AS "chunkId",
          document."id" AS "documentId",
          version."id" AS "documentVersionId",
          document."name" AS "documentName",
          chunk."sequence" AS "sequence",
          chunk."content" AS "content",
          chunk."contentHash" AS "contentHash",
          chunk."metadata" AS "chunkMetadata",
          document."metadata" AS "documentMetadata",
          (${score})::double precision AS "score"
        FROM "knowledge_chunks" AS chunk
        INNER JOIN "knowledge_documents" AS document
          ON document."id" = chunk."documentId"
        INNER JOIN "knowledge_document_versions" AS version
          ON version."id" = chunk."documentVersionId"
        INNER JOIN "knowledge_base_indexes" AS knowledge_index
          ON knowledge_index."id" = chunk."knowledgeBaseIndexId"
        INNER JOIN "knowledge_bases" AS knowledge_base
          ON knowledge_base."id" = knowledge_index."knowledgeBaseId"
        INNER JOIN "knowledge_document_index_heads" AS head
          ON head."documentId" = document."id"
          AND head."knowledgeBaseIndexId" = knowledge_index."id"
          AND head."currentVersionId" = version."id"
        INNER JOIN "knowledge_search_projections" AS projection
          ON projection."documentVersionId" = version."id"
          AND projection."knowledgeBaseIndexId" = knowledge_index."id"
        WHERE knowledge_base."ownerId" = ${options.ownerId}::uuid
          AND knowledge_base."id" IN (${uuidList(options.knowledgeBaseIds)})
          AND knowledge_index."id" IN (${uuidList(options.knowledgeBaseIndexIds)})
          AND knowledge_base."activeIndexId" = knowledge_index."id"
          AND knowledge_base."lifecycleStatus" = 'ACTIVE'
          AND knowledge_index."status" = 'READY'
          AND document."lifecycleStatus" = 'ACTIVE'
          AND document."status" = 'READY'
          AND document."enabled" = true
          AND version."status" = 'READY'
          AND projection."status" = 'READY'
          AND chunk."enabled" = true
          AND chunk."contentHash" IS NOT NULL
          AND chunk."embedding" IS NOT NULL
          AND chunk."embeddingDimension" = ${options.embeddingDimension}
          AND vector_dims(chunk."embedding") = ${options.embeddingDimension}
          ${metadataFilter}
        ORDER BY ${distance} ASC, chunk."id" ASC
        LIMIT ${options.candidateCount}
      `,
      )

    return rows.map((row) => ({
      chunkId: row.chunkId,
      documentId: row.documentId,
      documentVersionId: row.documentVersionId,
      documentName: row.documentName,
      sequence: row.sequence,
      content: row.content,
      contentHash: row.contentHash,
      metadata: mergeMetadata(row.documentMetadata, row.chunkMetadata),
      score: row.score,
    }))
  }
}

function assertVector(vector: number[] | undefined, dimension: number): asserts vector is number[] {
  if (!vector || vector.length !== dimension || vector.some((value) => !Number.isFinite(value))) {
    throw new Error('Embedding 向量维度或数值无效')
  }
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`
}

function uuidList(ids: string[]): Prisma.Sql {
  return Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))
}

function mergeMetadata(
  documentMetadata: Prisma.JsonValue,
  chunkMetadata: Prisma.JsonValue,
): Record<string, unknown> {
  return {
    ...asRecord(documentMetadata),
    ...asRecord(chunkMetadata),
  }
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
