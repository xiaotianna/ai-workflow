-- CreateEnum
CREATE TYPE "AppKind" AS ENUM ('WORKFLOW', 'CHATFLOW');

-- CreateEnum
CREATE TYPE "WorkflowVersionSource" AS ENUM ('MANUAL', 'PUBLISH', 'TEST_RUN', 'IMPORT');

-- CreateEnum
CREATE TYPE "DeploymentEnvironment" AS ENUM ('STAGING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "WorkflowRunTrigger" AS ENUM ('API', 'MANUAL', 'TEST_RUN', 'SCHEDULE', 'SUB_WORKFLOW');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "WorkflowNodeRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED', 'TIMED_OUT');

-- CreateTable
CREATE TABLE "api_call_logs" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "apiKeyId" UUID,
    "runId" UUID,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "clientIp" TEXT,
    "userAgent" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdById" UUID,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "kind" "AppKind" NOT NULL DEFAULT 'WORKFLOW',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_deployments" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "environment" "DeploymentEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "deployedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_drafts" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "definition" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_node_runs" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "executionKey" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowNodeRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_node_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "triggeredById" UUID,
    "parentRunId" UUID,
    "traceId" TEXT NOT NULL,
    "trigger" "WorkflowRunTrigger" NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "source" "WorkflowVersionSource" NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "definition" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_call_logs_requestId_key" ON "api_call_logs"("requestId");

-- CreateIndex
CREATE INDEX "api_call_logs_appId_createdAt_idx" ON "api_call_logs"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "api_call_logs_apiKeyId_createdAt_idx" ON "api_call_logs"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "api_call_logs_runId_idx" ON "api_call_logs"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_appId_revokedAt_idx" ON "api_keys"("appId", "revokedAt");

-- CreateIndex
CREATE INDEX "apps_ownerId_deletedAt_updatedAt_idx" ON "apps"("ownerId", "deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "workflow_deployments_versionId_idx" ON "workflow_deployments"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_deployments_workflowId_environment_key" ON "workflow_deployments"("workflowId", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_drafts_workflowId_key" ON "workflow_drafts"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_node_runs_runId_createdAt_idx" ON "workflow_node_runs"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_node_runs_nodeId_idx" ON "workflow_node_runs"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_node_runs_runId_executionKey_attempt_key" ON "workflow_node_runs"("runId", "executionKey", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_traceId_key" ON "workflow_runs"("traceId");

-- CreateIndex
CREATE INDEX "workflow_runs_workflowId_queuedAt_idx" ON "workflow_runs"("workflowId", "queuedAt");

-- CreateIndex
CREATE INDEX "workflow_runs_workflowId_status_queuedAt_idx" ON "workflow_runs"("workflowId", "status", "queuedAt");

-- CreateIndex
CREATE INDEX "workflow_runs_workflowVersionId_idx" ON "workflow_runs"("workflowVersionId");

-- CreateIndex
CREATE INDEX "workflow_runs_parentRunId_idx" ON "workflow_runs"("parentRunId");

-- CreateIndex
CREATE INDEX "workflow_versions_workflowId_createdAt_idx" ON "workflow_versions"("workflowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_workflowId_version_key" ON "workflow_versions"("workflowId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_appId_key" ON "workflows"("appId");

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_deployments" ADD CONSTRAINT "workflow_deployments_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_deployments" ADD CONSTRAINT "workflow_deployments_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_deployments" ADD CONSTRAINT "workflow_deployments_deployedById_fkey" FOREIGN KEY ("deployedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_drafts" ADD CONSTRAINT "workflow_drafts_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_drafts" ADD CONSTRAINT "workflow_drafts_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_node_runs" ADD CONSTRAINT "workflow_node_runs_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
