ALTER TABLE "knowledge_bases"
ADD COLUMN "apiEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "knowledge_base_api_keys" (
  "id" UUID NOT NULL,
  "knowledgeBaseId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "prefix" VARCHAR(24) NOT NULL,
  "suffix" VARCHAR(16),
  "keyHash" VARCHAR(64) NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY['knowledge:retrieve']::TEXT[],
  "createdById" UUID,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "knowledge_base_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_api_call_logs" (
  "id" UUID NOT NULL,
  "knowledgeBaseId" UUID NOT NULL,
  "apiKeyId" UUID,
  "requestId" VARCHAR(128) NOT NULL,
  "queryHash" VARCHAR(64) NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "knowledge_api_call_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_base_api_keys_keyHash_key"
ON "knowledge_base_api_keys"("keyHash");

CREATE INDEX "knowledge_base_api_keys_knowledgeBaseId_revokedAt_idx"
ON "knowledge_base_api_keys"("knowledgeBaseId", "revokedAt");

CREATE INDEX "knowledge_api_call_logs_knowledgeBaseId_createdAt_idx"
ON "knowledge_api_call_logs"("knowledgeBaseId", "createdAt");

CREATE INDEX "knowledge_api_call_logs_apiKeyId_createdAt_idx"
ON "knowledge_api_call_logs"("apiKeyId", "createdAt");

ALTER TABLE "knowledge_base_api_keys"
ADD CONSTRAINT "knowledge_base_api_keys_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_base_api_keys"
ADD CONSTRAINT "knowledge_base_api_keys_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_api_call_logs"
ADD CONSTRAINT "knowledge_api_call_logs_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_api_call_logs"
ADD CONSTRAINT "knowledge_api_call_logs_apiKeyId_fkey"
FOREIGN KEY ("apiKeyId") REFERENCES "knowledge_base_api_keys"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
