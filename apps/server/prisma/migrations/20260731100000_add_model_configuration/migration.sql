-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('CHAT', 'EMBEDDING');

-- CreateTable
CREATE TABLE "model_groups" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "modelType" "ModelType" NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "providerType" VARCHAR(32) NOT NULL,
    "baseUrl" VARCHAR(300),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "apiKeyCiphertext" BYTEA,
    "apiKeyIv" BYTEA,
    "apiKeyAuthTag" BYTEA,
    "credentialKeyVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configured_models" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "modelId" VARCHAR(100) NOT NULL,
    "normalizedModelId" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(100),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configured_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "model_groups_ownerId_modelType_createdAt_idx" ON "model_groups"("ownerId", "modelType", "createdAt");

-- CreateIndex
CREATE INDEX "configured_models_groupId_sortOrder_idx" ON "configured_models"("groupId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "configured_models_groupId_normalizedModelId_key" ON "configured_models"("groupId", "normalizedModelId");

-- AddForeignKey
ALTER TABLE "model_groups" ADD CONSTRAINT "model_groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configured_models" ADD CONSTRAINT "configured_models_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "model_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
