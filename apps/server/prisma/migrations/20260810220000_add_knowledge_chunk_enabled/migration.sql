ALTER TABLE "knowledge_chunks"
ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "knowledge_chunks_documentId_enabled_sequence_idx"
ON "knowledge_chunks"("documentId", "enabled", "sequence");
