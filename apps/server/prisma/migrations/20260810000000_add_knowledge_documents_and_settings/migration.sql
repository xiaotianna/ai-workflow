-- CreateEnum
CREATE TYPE "KnowledgeSegmentationMode" AS ENUM ('GENERAL', 'QA', 'PARENT_CHILD');

-- CreateEnum
CREATE TYPE "KnowledgeRetrievalProfile" AS ENUM ('HYBRID_ACCURATE', 'HYBRID_FAST');

-- CreateEnum
CREATE TYPE "KnowledgeDocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "knowledge_base_settings" (
    "knowledgeBaseId" UUID NOT NULL,
    "segmentationMode" "KnowledgeSegmentationMode" NOT NULL DEFAULT 'GENERAL',
    "maxSegmentLength" INTEGER NOT NULL DEFAULT 1024,
    "overlapLength" INTEGER NOT NULL DEFAULT 50,
    "normalizeWhitespace" BOOLEAN NOT NULL DEFAULT true,
    "segmentationRevision" INTEGER NOT NULL DEFAULT 1,
    "retrievalProfile" "KnowledgeRetrievalProfile" NOT NULL DEFAULT 'HYBRID_ACCURATE',
    "retrievalTopK" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_settings_pkey" PRIMARY KEY ("knowledgeBaseId"),
    CONSTRAINT "knowledge_base_settings_segment_length_check" CHECK ("maxSegmentLength" BETWEEN 100 AND 4000),
    CONSTRAINT "knowledge_base_settings_overlap_check" CHECK ("overlapLength" >= 0 AND "overlapLength" < "maxSegmentLength"),
    CONSTRAINT "knowledge_base_settings_top_k_check" CHECK ("retrievalTopK" BETWEEN 1 AND 20)
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" UUID NOT NULL,
    "knowledgeBaseId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(32) NOT NULL,
    "sourceStorageKey" VARCHAR(512) NOT NULL,
    "sourceMimeType" VARCHAR(128) NOT NULL,
    "sourceSize" BIGINT NOT NULL,
    "sourceChecksum" VARCHAR(64) NOT NULL,
    "segmentationMode" "KnowledgeSegmentationMode" NOT NULL,
    "maxSegmentLength" INTEGER NOT NULL,
    "overlapLength" INTEGER NOT NULL,
    "normalizeWhitespace" BOOLEAN NOT NULL,
    "indexedSegmentationRevision" INTEGER NOT NULL,
    "status" "KnowledgeDocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "characterCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_documents_segment_length_check" CHECK ("maxSegmentLength" BETWEEN 100 AND 4000),
    CONSTRAINT "knowledge_documents_overlap_check" CHECK ("overlapLength" >= 0 AND "overlapLength" < "maxSegmentLength"),
    CONSTRAINT "knowledge_documents_counts_check" CHECK ("characterCount" >= 0 AND "chunkCount" >= 0)
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_chunks_sequence_check" CHECK ("sequence" > 0),
    CONSTRAINT "knowledge_chunks_token_count_check" CHECK ("tokenCount" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_documents_sourceStorageKey_key" ON "knowledge_documents"("sourceStorageKey");
CREATE INDEX "knowledge_documents_knowledgeBaseId_createdAt_idx" ON "knowledge_documents"("knowledgeBaseId", "createdAt");
CREATE INDEX "knowledge_documents_knowledgeBaseId_enabled_idx" ON "knowledge_documents"("knowledgeBaseId", "enabled");
CREATE UNIQUE INDEX "knowledge_chunks_documentId_sequence_key" ON "knowledge_chunks"("documentId", "sequence");
CREATE INDEX "knowledge_chunks_documentId_sequence_idx" ON "knowledge_chunks"("documentId", "sequence");

-- AddForeignKey
ALTER TABLE "knowledge_base_settings" ADD CONSTRAINT "knowledge_base_settings_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SeedSettings
INSERT INTO "knowledge_base_settings" ("knowledgeBaseId", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP FROM "knowledge_bases";
