-- CreateEnum
CREATE TYPE "WorkflowCommandOutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "workflow_runs"
ADD COLUMN "runtimeState" JSONB,
ADD COLUMN "runtimeRevision" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "workflow_node_runs"
ADD COLUMN "commandId" UUID,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "leaseToken" TEXT,
ADD COLUMN "deadlineAt" TIMESTAMP(3);

UPDATE "workflow_node_runs"
SET
  "commandId" = "id",
  "idempotencyKey" = 'legacy:' || "id"::text,
  "leaseToken" = 'legacy:' || "id"::text,
  "deadlineAt" = COALESCE("finishedAt", "startedAt", "createdAt");

ALTER TABLE "workflow_node_runs"
ALTER COLUMN "commandId" SET NOT NULL,
ALTER COLUMN "idempotencyKey" SET NOT NULL,
ALTER COLUMN "leaseToken" SET NOT NULL,
ALTER COLUMN "deadlineAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "workflow_command_outbox" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "nodeRunId" UUID NOT NULL,
    "status" "WorkflowCommandOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_command_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_result_inbox" (
    "id" UUID NOT NULL,
    "commandId" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "nodeRunId" UUID NOT NULL,
    "leaseToken" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_result_inbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_node_runs_commandId_key" ON "workflow_node_runs"("commandId");
CREATE UNIQUE INDEX "workflow_node_runs_idempotencyKey_key" ON "workflow_node_runs"("idempotencyKey");
CREATE INDEX "workflow_node_runs_status_deadlineAt_idx" ON "workflow_node_runs"("status", "deadlineAt");
CREATE UNIQUE INDEX "workflow_command_outbox_nodeRunId_key" ON "workflow_command_outbox"("nodeRunId");
CREATE INDEX "workflow_command_outbox_status_createdAt_idx" ON "workflow_command_outbox"("status", "createdAt");
CREATE INDEX "workflow_command_outbox_runId_createdAt_idx" ON "workflow_command_outbox"("runId", "createdAt");
CREATE UNIQUE INDEX "workflow_result_inbox_commandId_key" ON "workflow_result_inbox"("commandId");
CREATE UNIQUE INDEX "workflow_result_inbox_nodeRunId_key" ON "workflow_result_inbox"("nodeRunId");
CREATE INDEX "workflow_result_inbox_runId_createdAt_idx" ON "workflow_result_inbox"("runId", "createdAt");

-- AddForeignKey
ALTER TABLE "workflow_command_outbox" ADD CONSTRAINT "workflow_command_outbox_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_command_outbox" ADD CONSTRAINT "workflow_command_outbox_nodeRunId_fkey" FOREIGN KEY ("nodeRunId") REFERENCES "workflow_node_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_result_inbox" ADD CONSTRAINT "workflow_result_inbox_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_result_inbox" ADD CONSTRAINT "workflow_result_inbox_nodeRunId_fkey" FOREIGN KEY ("nodeRunId") REFERENCES "workflow_node_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_result_inbox" ADD CONSTRAINT "workflow_result_inbox_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "workflow_command_outbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
