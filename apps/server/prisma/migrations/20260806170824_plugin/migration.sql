-- CreateEnum
CREATE TYPE "PluginVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PluginStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateTable
CREATE TABLE "plugins" (
    "id" UUID NOT NULL,
    "publisherId" UUID,
    "publisherKey" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "icon" VARCHAR(256),
    "category" VARCHAR(32) NOT NULL,
    "visibility" "PluginVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "PluginStatus" NOT NULL DEFAULT 'DRAFT',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_versions" (
    "id" UUID NOT NULL,
    "pluginId" UUID NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "platformApiVersion" VARCHAR(16) NOT NULL,
    "manifest" JSONB NOT NULL,
    "readme" TEXT NOT NULL,
    "changelog" TEXT NOT NULL,
    "artifactReference" VARCHAR(512),
    "artifactDigest" VARCHAR(64) NOT NULL,
    "artifactSize" INTEGER,
    "runtimeReady" BOOLEAN NOT NULL DEFAULT false,
    "publisherName" VARCHAR(80) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_installations" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "pluginId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_installations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plugins_publisherKey_slug_key" ON "plugins"("publisherKey", "slug");

-- CreateIndex
CREATE INDEX "plugins_publisherId_updatedAt_idx" ON "plugins"("publisherId", "updatedAt");

-- CreateIndex
CREATE INDEX "plugins_visibility_status_updatedAt_idx" ON "plugins"("visibility", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_versions_pluginId_version_key" ON "plugin_versions"("pluginId", "version");

-- CreateIndex
CREATE INDEX "plugin_versions_pluginId_publishedAt_idx" ON "plugin_versions"("pluginId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_installations_ownerId_pluginId_key" ON "plugin_installations"("ownerId", "pluginId");

-- CreateIndex
CREATE INDEX "plugin_installations_ownerId_updatedAt_idx" ON "plugin_installations"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "plugin_installations_pluginId_idx" ON "plugin_installations"("pluginId");

-- AddForeignKey
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_versions" ADD CONSTRAINT "plugin_versions_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_installations" ADD CONSTRAINT "plugin_installations_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "plugin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
