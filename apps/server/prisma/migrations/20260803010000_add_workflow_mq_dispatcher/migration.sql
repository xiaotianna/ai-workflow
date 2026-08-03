-- AlterEnum
ALTER TYPE "WorkflowCommandOutboxStatus" ADD VALUE 'PUBLISHING' BEFORE 'PUBLISHED';

-- AlterTable
ALTER TABLE "workflow_command_outbox"
ADD COLUMN "publishAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "claimedAt" TIMESTAMP(3);

-- ReplaceIndex
DROP INDEX "workflow_command_outbox_status_createdAt_idx";
CREATE INDEX "workflow_command_outbox_status_nextAttemptAt_createdAt_idx"
ON "workflow_command_outbox"("status", "nextAttemptAt", "createdAt");
