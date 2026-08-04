ALTER TABLE "workflow_runs" ADD COLUMN "parentNodeRunId" UUID;

CREATE UNIQUE INDEX "workflow_runs_parentNodeRunId_key" ON "workflow_runs"("parentNodeRunId");

ALTER TABLE "workflow_runs"
ADD CONSTRAINT "workflow_runs_parentNodeRunId_fkey"
FOREIGN KEY ("parentNodeRunId") REFERENCES "workflow_node_runs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
