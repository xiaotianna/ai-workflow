ALTER TABLE "workflow_node_runs"
ADD COLUMN "hardDeadlineAt" TIMESTAMP(3),
ADD COLUMN "progressSequence" INTEGER NOT NULL DEFAULT 0;

UPDATE "workflow_node_runs"
SET "hardDeadlineAt" = "deadlineAt"
WHERE "hardDeadlineAt" IS NULL;

ALTER TABLE "workflow_node_runs"
ALTER COLUMN "hardDeadlineAt" SET NOT NULL;
