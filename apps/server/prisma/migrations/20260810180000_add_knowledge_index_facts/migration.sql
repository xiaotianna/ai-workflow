-- CreateEnum
CREATE TYPE "KnowledgeLifecycleStatus" AS ENUM ('ACTIVE', 'DELETING', 'DELETE_FAILED');
CREATE TYPE "KnowledgeIndexStatus" AS ENUM ('BUILDING', 'READY', 'FAILED', 'CANCELLED');
CREATE TYPE "KnowledgeDistanceMetric" AS ENUM ('COSINE', 'EUCLIDEAN', 'INNER_PRODUCT');
CREATE TYPE "KnowledgeDocumentSourceType" AS ENUM ('FILE');
CREATE TYPE "KnowledgeDocumentVersionStatus" AS ENUM ('QUEUED', 'PARSING', 'CHUNKING', 'EMBEDDING', 'READY', 'FAILED', 'CANCELLED');
CREATE TYPE "KnowledgeAttemptStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT');
CREATE TYPE "KnowledgeProjectionStatus" AS ENUM ('PENDING', 'WRITING', 'READY', 'FAILED', 'DELETING');
CREATE TYPE "KnowledgeOutboxStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "knowledge_bases"
ADD COLUMN "activeIndexId" UUID,
ADD COLUMN "lifecycleStatus" "KnowledgeLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "knowledge_documents"
ADD COLUMN "sourceType" "KnowledgeDocumentSourceType" NOT NULL DEFAULT 'FILE',
ADD COLUMN "lifecycleStatus" "KnowledgeLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "knowledge_chunks"
ADD COLUMN "documentVersionId" UUID,
ADD COLUMN "knowledgeBaseIndexId" UUID,
ADD COLUMN "contentHash" VARCHAR(64);

-- CreateTable
CREATE TABLE "knowledge_base_indexes" (
  "id" UUID NOT NULL,
  "knowledgeBaseId" UUID NOT NULL,
  "generation" INTEGER NOT NULL,
  "configuredModelId" UUID NOT NULL,
  "embeddingProvider" VARCHAR(32) NOT NULL,
  "embeddingModelId" VARCHAR(100) NOT NULL,
  "embeddingDimension" INTEGER,
  "embeddingSpaceKey" VARCHAR(64),
  "distanceMetric" "KnowledgeDistanceMetric" NOT NULL DEFAULT 'COSINE',
  "defaultChunkConfig" JSONB NOT NULL,
  "defaultCleaningConfig" JSONB NOT NULL,
  "configHash" VARCHAR(64) NOT NULL,
  "status" "KnowledgeIndexStatus" NOT NULL DEFAULT 'BUILDING',
  "errorCode" VARCHAR(64),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readyAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),

  CONSTRAINT "knowledge_base_indexes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_base_indexes_generation_check" CHECK ("generation" > 0),
  CONSTRAINT "knowledge_base_indexes_dimension_check" CHECK ("embeddingDimension" IS NULL OR "embeddingDimension" > 0)
);

CREATE TABLE "knowledge_document_sources" (
  "id" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "objectKey" VARCHAR(512) NOT NULL,
  "originalFileName" VARCHAR(255) NOT NULL,
  "checksum" VARCHAR(128) NOT NULL,
  "mimeType" VARCHAR(128) NOT NULL,
  "fileSize" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "knowledge_document_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_document_sources_file_size_check" CHECK ("fileSize" >= 0)
);

CREATE TABLE "knowledge_document_versions" (
  "id" UUID NOT NULL,
  "knowledgeBaseId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "sourceId" UUID NOT NULL,
  "knowledgeBaseIndexId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "parserVersion" VARCHAR(64) NOT NULL,
  "cleanerVersion" VARCHAR(64) NOT NULL,
  "cleaningConfig" JSONB NOT NULL,
  "segmentationMode" "KnowledgeSegmentationMode" NOT NULL,
  "chunkConfig" JSONB NOT NULL,
  "configHash" VARCHAR(64) NOT NULL,
  "status" "KnowledgeDocumentVersionStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "characterCount" INTEGER,
  "tokenCount" INTEGER,
  "chunkCount" INTEGER,
  "errorCode" VARCHAR(64),
  "errorMessage" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "knowledge_document_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_document_versions_version_check" CHECK ("version" > 0),
  CONSTRAINT "knowledge_document_versions_progress_check" CHECK ("progress" BETWEEN 0 AND 100),
  CONSTRAINT "knowledge_document_versions_counts_check" CHECK (
    "attemptCount" >= 0
    AND ("characterCount" IS NULL OR "characterCount" >= 0)
    AND ("tokenCount" IS NULL OR "tokenCount" >= 0)
    AND ("chunkCount" IS NULL OR "chunkCount" >= 0)
  )
);

CREATE TABLE "knowledge_document_index_heads" (
  "knowledgeBaseId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "knowledgeBaseIndexId" UUID NOT NULL,
  "currentVersionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "knowledge_document_index_heads_pkey" PRIMARY KEY ("documentId", "knowledgeBaseIndexId")
);

CREATE TABLE "knowledge_ingestion_attempts" (
  "id" UUID NOT NULL,
  "documentVersionId" UUID NOT NULL,
  "attempt" INTEGER NOT NULL,
  "traceId" VARCHAR(128) NOT NULL,
  "status" "KnowledgeAttemptStatus" NOT NULL DEFAULT 'RUNNING',
  "stage" VARCHAR(32) NOT NULL,
  "workerId" VARCHAR(128),
  "retryable" BOOLEAN,
  "errorCode" VARCHAR(64),
  "errorMessage" TEXT,
  "errorDetails" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "heartbeatAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "knowledge_ingestion_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_ingestion_attempts_attempt_check" CHECK ("attempt" > 0),
  CONSTRAINT "knowledge_ingestion_attempts_duration_check" CHECK ("durationMs" IS NULL OR "durationMs" >= 0)
);

CREATE TABLE "knowledge_search_projections" (
  "id" UUID NOT NULL,
  "knowledgeBaseIndexId" UUID NOT NULL,
  "documentVersionId" UUID NOT NULL,
  "status" "KnowledgeProjectionStatus" NOT NULL DEFAULT 'PENDING',
  "expectedChunkCount" INTEGER NOT NULL DEFAULT 0,
  "projectedChunkCount" INTEGER NOT NULL DEFAULT 0,
  "expectedChecksum" VARCHAR(64),
  "projectedChecksum" VARCHAR(64),
  "errorCode" VARCHAR(64),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "readyAt" TIMESTAMP(3),

  CONSTRAINT "knowledge_search_projections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_search_projections_counts_check" CHECK (
    "expectedChunkCount" >= 0 AND "projectedChunkCount" >= 0
  )
);

CREATE TABLE "knowledge_outbox_events" (
  "id" UUID NOT NULL,
  "knowledgeBaseId" UUID NOT NULL,
  "eventType" VARCHAR(64) NOT NULL,
  "aggregateType" VARCHAR(64) NOT NULL,
  "aggregateId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "KnowledgeOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedBy" VARCHAR(128),
  "lockedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "knowledge_outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "knowledge_outbox_events_attempt_count_check" CHECK ("attemptCount" >= 0)
);

-- Migrate existing immutable source metadata. Reusing the document UUID is safe because sources have their own table.
INSERT INTO "knowledge_document_sources" (
  "id", "documentId", "objectKey", "originalFileName", "checksum", "mimeType", "fileSize", "createdAt"
)
SELECT
  "id", "id", "sourceStorageKey", "name", "sourceChecksum", "sourceMimeType", "sourceSize", "createdAt"
FROM "knowledge_documents";

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_bases_activeIndexId_key" ON "knowledge_bases"("activeIndexId");
CREATE INDEX "knowledge_bases_ownerId_lifecycleStatus_updatedAt_idx" ON "knowledge_bases"("ownerId", "lifecycleStatus", "updatedAt");
CREATE UNIQUE INDEX "knowledge_base_indexes_knowledgeBaseId_generation_key" ON "knowledge_base_indexes"("knowledgeBaseId", "generation");
CREATE INDEX "knowledge_base_indexes_knowledgeBaseId_status_createdAt_idx" ON "knowledge_base_indexes"("knowledgeBaseId", "status", "createdAt");
CREATE INDEX "knowledge_base_indexes_configuredModelId_idx" ON "knowledge_base_indexes"("configuredModelId");
CREATE UNIQUE INDEX "knowledge_base_indexes_one_building_per_base_idx" ON "knowledge_base_indexes"("knowledgeBaseId") WHERE "status" = 'BUILDING';
CREATE UNIQUE INDEX "knowledge_document_sources_objectKey_key" ON "knowledge_document_sources"("objectKey");
CREATE INDEX "knowledge_document_sources_documentId_createdAt_idx" ON "knowledge_document_sources"("documentId", "createdAt");
CREATE UNIQUE INDEX "knowledge_document_versions_idempotencyKey_key" ON "knowledge_document_versions"("idempotencyKey");
CREATE UNIQUE INDEX "knowledge_document_versions_documentId_knowledgeBaseIndexId_version_key" ON "knowledge_document_versions"("documentId", "knowledgeBaseIndexId", "version");
CREATE INDEX "knowledge_document_versions_knowledgeBaseIndexId_status_createdAt_idx" ON "knowledge_document_versions"("knowledgeBaseIndexId", "status", "createdAt");
CREATE INDEX "knowledge_document_versions_documentId_createdAt_idx" ON "knowledge_document_versions"("documentId", "createdAt");
CREATE UNIQUE INDEX "knowledge_document_index_heads_currentVersionId_key" ON "knowledge_document_index_heads"("currentVersionId");
CREATE INDEX "knowledge_document_index_heads_knowledgeBaseId_knowledgeBaseIndexId_idx" ON "knowledge_document_index_heads"("knowledgeBaseId", "knowledgeBaseIndexId");
CREATE UNIQUE INDEX "knowledge_ingestion_attempts_traceId_key" ON "knowledge_ingestion_attempts"("traceId");
CREATE UNIQUE INDEX "knowledge_ingestion_attempts_documentVersionId_attempt_key" ON "knowledge_ingestion_attempts"("documentVersionId", "attempt");
CREATE INDEX "knowledge_ingestion_attempts_status_heartbeatAt_idx" ON "knowledge_ingestion_attempts"("status", "heartbeatAt");
CREATE UNIQUE INDEX "knowledge_search_projections_documentVersionId_key" ON "knowledge_search_projections"("documentVersionId");
CREATE INDEX "knowledge_search_projections_knowledgeBaseIndexId_status_idx" ON "knowledge_search_projections"("knowledgeBaseIndexId", "status");
CREATE UNIQUE INDEX "knowledge_outbox_events_idempotencyKey_key" ON "knowledge_outbox_events"("idempotencyKey");
CREATE INDEX "knowledge_outbox_events_status_availableAt_idx" ON "knowledge_outbox_events"("status", "availableAt");
CREATE INDEX "knowledge_outbox_events_knowledgeBaseId_createdAt_idx" ON "knowledge_outbox_events"("knowledgeBaseId", "createdAt");
CREATE INDEX "knowledge_chunks_documentVersionId_sequence_idx" ON "knowledge_chunks"("documentVersionId", "sequence");
CREATE INDEX "knowledge_chunks_knowledgeBaseIndexId_documentId_idx" ON "knowledge_chunks"("knowledgeBaseIndexId", "documentId");
DROP INDEX "knowledge_chunks_documentId_sequence_key";
CREATE UNIQUE INDEX "knowledge_chunks_documentVersionId_sequence_key" ON "knowledge_chunks"("documentVersionId", "sequence");
CREATE UNIQUE INDEX "knowledge_chunks_legacy_document_sequence_key" ON "knowledge_chunks"("documentId", "sequence") WHERE "documentVersionId" IS NULL;

-- AddForeignKey
ALTER TABLE "knowledge_base_indexes" ADD CONSTRAINT "knowledge_base_indexes_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_base_indexes" ADD CONSTRAINT "knowledge_base_indexes_configuredModelId_fkey" FOREIGN KEY ("configuredModelId") REFERENCES "configured_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_activeIndexId_fkey" FOREIGN KEY ("activeIndexId") REFERENCES "knowledge_base_indexes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge_document_sources" ADD CONSTRAINT "knowledge_document_sources_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_document_versions" ADD CONSTRAINT "knowledge_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_document_versions" ADD CONSTRAINT "knowledge_document_versions_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_document_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_document_versions" ADD CONSTRAINT "knowledge_document_versions_knowledgeBaseIndexId_fkey" FOREIGN KEY ("knowledgeBaseIndexId") REFERENCES "knowledge_base_indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_document_index_heads" ADD CONSTRAINT "knowledge_document_index_heads_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_document_index_heads" ADD CONSTRAINT "knowledge_document_index_heads_knowledgeBaseIndexId_fkey" FOREIGN KEY ("knowledgeBaseIndexId") REFERENCES "knowledge_base_indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_document_index_heads" ADD CONSTRAINT "knowledge_document_index_heads_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "knowledge_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_ingestion_attempts" ADD CONSTRAINT "knowledge_ingestion_attempts_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "knowledge_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_search_projections" ADD CONSTRAINT "knowledge_search_projections_knowledgeBaseIndexId_fkey" FOREIGN KEY ("knowledgeBaseIndexId") REFERENCES "knowledge_base_indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_search_projections" ADD CONSTRAINT "knowledge_search_projections_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "knowledge_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_outbox_events" ADD CONSTRAINT "knowledge_outbox_events_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "knowledge_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_knowledgeBaseIndexId_fkey" FOREIGN KEY ("knowledgeBaseIndexId") REFERENCES "knowledge_base_indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
