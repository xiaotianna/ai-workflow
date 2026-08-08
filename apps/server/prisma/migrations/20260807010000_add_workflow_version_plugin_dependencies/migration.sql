-- CreateTable
CREATE TABLE "workflow_version_plugin_dependencies" (
    "id" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "pluginVersionId" UUID NOT NULL,
    "manifest" JSONB NOT NULL,
    "artifactReference" VARCHAR(512) NOT NULL,
    "artifactDigest" VARCHAR(64) NOT NULL,
    "artifactSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_version_plugin_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_version_plugin_dependencies_workflowVersionId_pluginVersionId_key" ON "workflow_version_plugin_dependencies"("workflowVersionId", "pluginVersionId");

-- CreateIndex
CREATE INDEX "workflow_version_plugin_dependencies_pluginVersionId_idx" ON "workflow_version_plugin_dependencies"("pluginVersionId");

-- AddForeignKey
ALTER TABLE "workflow_version_plugin_dependencies" ADD CONSTRAINT "workflow_version_plugin_dependencies_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_version_plugin_dependencies" ADD CONSTRAINT "workflow_version_plugin_dependencies_pluginVersionId_fkey" FOREIGN KEY ("pluginVersionId") REFERENCES "plugin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
