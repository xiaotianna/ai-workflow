-- AlterTable
ALTER TABLE "knowledge_base_settings"
ADD COLUMN "embeddingModelGroupId" UUID,
ADD COLUMN "embeddingConfiguredModelId" UUID,
ADD CONSTRAINT "knowledge_base_settings_embedding_model_pair_check"
CHECK (
  ("embeddingModelGroupId" IS NULL AND "embeddingConfiguredModelId" IS NULL)
  OR
  ("embeddingModelGroupId" IS NOT NULL AND "embeddingConfiguredModelId" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "knowledge_base_settings_embeddingModelGroupId_idx"
ON "knowledge_base_settings"("embeddingModelGroupId");

CREATE INDEX "knowledge_base_settings_embeddingConfiguredModelId_idx"
ON "knowledge_base_settings"("embeddingConfiguredModelId");

-- AddForeignKey
ALTER TABLE "knowledge_base_settings"
ADD CONSTRAINT "knowledge_base_settings_embeddingModelGroupId_fkey"
FOREIGN KEY ("embeddingModelGroupId") REFERENCES "model_groups"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "knowledge_base_settings"
ADD CONSTRAINT "knowledge_base_settings_embeddingConfiguredModelId_fkey"
FOREIGN KEY ("embeddingConfiguredModelId") REFERENCES "configured_models"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
