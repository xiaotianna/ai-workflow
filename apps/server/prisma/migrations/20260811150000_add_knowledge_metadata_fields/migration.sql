-- AlterTable
ALTER TABLE "knowledge_documents"
ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "knowledge_metadata_fields" (
    "id" UUID NOT NULL,
    "knowledgeBaseId" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_metadata_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_metadata_fields_knowledgeBaseId_name_key"
ON "knowledge_metadata_fields"("knowledgeBaseId", "name");

-- CreateIndex
CREATE INDEX "knowledge_metadata_fields_knowledgeBaseId_createdAt_idx"
ON "knowledge_metadata_fields"("knowledgeBaseId", "createdAt");

-- AddForeignKey
ALTER TABLE "knowledge_metadata_fields"
ADD CONSTRAINT "knowledge_metadata_fields_knowledgeBaseId_fkey"
FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
