-- pgvector stores the Dense retrieval projection in PostgreSQL. The vector column is intentionally
-- dimensionless because one deployment may host multiple embedding spaces with different dimensions.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "knowledge_chunks"
ADD COLUMN "embeddingDimension" INTEGER,
ADD COLUMN "embedding" vector,
ADD CONSTRAINT "knowledge_chunks_embedding_pair_check"
CHECK (
  ("embedding" IS NULL AND "embeddingDimension" IS NULL)
  OR
  ("embedding" IS NOT NULL AND "embeddingDimension" IS NOT NULL)
),
ADD CONSTRAINT "knowledge_chunks_embedding_dimension_check"
CHECK (
  "embedding" IS NULL
  OR (
    "embeddingDimension" > 0
    AND vector_dims("embedding") = "embeddingDimension"
  )
);

CREATE INDEX "knowledge_chunks_knowledgeBaseIndexId_enabled_idx"
ON "knowledge_chunks"("knowledgeBaseIndexId", "enabled");

CREATE INDEX "knowledge_documents_metadata_gin_idx"
ON "knowledge_documents" USING GIN ("metadata" jsonb_path_ops);

-- Existing READY generations were projected before pgvector existed. Keep them out of the new Dense
-- retrieval path until the existing rebuild endpoint creates a fresh immutable generation and embeds
-- every active Chunk.
UPDATE "knowledge_base_indexes" AS knowledge_index
SET
  "status" = 'FAILED',
  "errorCode" = 'PGVECTOR_BACKFILL_REQUIRED',
  "errorMessage" = '该索引创建于 pgvector 接入前，请重新构建以补齐 Chunk 向量'
WHERE knowledge_index."status" = 'READY'
  AND EXISTS (
    SELECT 1
    FROM "knowledge_chunks" AS chunk
    WHERE chunk."knowledgeBaseIndexId" = knowledge_index."id"
      AND chunk."embedding" IS NULL
  );

-- A dimensionless vector column supports every configured embedding model, but pgvector cannot build
-- one ANN index across mixed dimensions. Retrieval therefore starts with exact distance ordering after
-- owner, active-index, document-state and metadata filters. Add dimension-specific partial HNSW indexes
-- only after production dimensions and recall/capacity measurements are known.
