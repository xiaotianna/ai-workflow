BEGIN;

-- Recreate the enum without SCHEDULE. Existing SCHEDULE rows make the cast fail
-- and roll back the entire migration instead of rewriting historical run data.
CREATE TYPE "WorkflowRunTrigger_new" AS ENUM ('API', 'MANUAL', 'TEST_RUN', 'SUB_WORKFLOW');

ALTER TABLE "workflow_runs"
ALTER COLUMN "trigger" TYPE "WorkflowRunTrigger_new"
USING ("trigger"::text::"WorkflowRunTrigger_new");

ALTER TYPE "WorkflowRunTrigger" RENAME TO "WorkflowRunTrigger_old";
ALTER TYPE "WorkflowRunTrigger_new" RENAME TO "WorkflowRunTrigger";
DROP TYPE "WorkflowRunTrigger_old";

COMMIT;
