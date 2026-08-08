CREATE TABLE "workflow_draft_plugin_dependencies" (
    "id" UUID NOT NULL,
    "workflowDraftId" UUID NOT NULL,
    "pluginVersionId" UUID NOT NULL,
    "manifest" JSONB NOT NULL,
    "artifactReference" VARCHAR(512) NOT NULL,
    "artifactDigest" VARCHAR(64) NOT NULL,
    "artifactSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_draft_plugin_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_draft_plugin_dependencies_workflowDraftId_pluginVersionId_key"
ON "workflow_draft_plugin_dependencies"("workflowDraftId", "pluginVersionId");

CREATE INDEX "workflow_draft_plugin_dependencies_pluginVersionId_idx"
ON "workflow_draft_plugin_dependencies"("pluginVersionId");

ALTER TABLE "workflow_draft_plugin_dependencies"
ADD CONSTRAINT "workflow_draft_plugin_dependencies_workflowDraftId_fkey"
FOREIGN KEY ("workflowDraftId") REFERENCES "workflow_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_draft_plugin_dependencies"
ADD CONSTRAINT "workflow_draft_plugin_dependencies_pluginVersionId_fkey"
FOREIGN KEY ("pluginVersionId") REFERENCES "plugin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
