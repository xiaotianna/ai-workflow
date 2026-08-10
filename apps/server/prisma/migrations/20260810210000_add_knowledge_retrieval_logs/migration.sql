CREATE TYPE "KnowledgeRetrievalSource" AS ENUM ('WORKFLOW', 'SERVICE_API');

CREATE TABLE "knowledge_retrieval_logs" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "sourceRequestId" VARCHAR(128) NOT NULL,
    "source" "KnowledgeRetrievalSource" NOT NULL,
    "queryHash" VARCHAR(64) NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_retrieval_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_retrieval_hits" (
    "id" UUID NOT NULL,
    "logId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "firstChunkId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "scoreSnapshot" DOUBLE PRECISION NOT NULL,
    "matchedChunkCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_retrieval_hits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_retrieval_logs_ownerId_createdAt_idx"
ON "knowledge_retrieval_logs"("ownerId", "createdAt");

CREATE UNIQUE INDEX "knowledge_retrieval_logs_source_sourceRequestId_key"
ON "knowledge_retrieval_logs"("source", "sourceRequestId");

CREATE UNIQUE INDEX "knowledge_retrieval_hits_logId_documentId_key"
ON "knowledge_retrieval_hits"("logId", "documentId");

CREATE INDEX "knowledge_retrieval_hits_documentId_createdAt_idx"
ON "knowledge_retrieval_hits"("documentId", "createdAt");

ALTER TABLE "knowledge_retrieval_logs"
ADD CONSTRAINT "knowledge_retrieval_logs_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_retrieval_hits"
ADD CONSTRAINT "knowledge_retrieval_hits_logId_fkey"
FOREIGN KEY ("logId") REFERENCES "knowledge_retrieval_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_retrieval_hits"
ADD CONSTRAINT "knowledge_retrieval_hits_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
