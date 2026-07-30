-- CreateEnum
CREATE TYPE "WorkflowRunMode" AS ENUM ('FULL', 'SINGLE_NODE');

-- AlterTable
ALTER TABLE "workflow_runs"
ADD COLUMN "mode" "WorkflowRunMode" NOT NULL DEFAULT 'FULL',
ADD COLUMN "targetNodeId" TEXT;
