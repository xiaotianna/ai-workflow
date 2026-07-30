-- CreateIndex
-- This intentionally fails before changing the schema if duplicate deployments exist.
CREATE UNIQUE INDEX "workflow_deployments_workflowId_key" ON "workflow_deployments"("workflowId");

-- DropIndex
DROP INDEX "workflow_deployments_workflowId_environment_key";

-- AlterTable
ALTER TABLE "workflow_deployments" DROP COLUMN "environment";

-- DropEnum
DROP TYPE "DeploymentEnvironment";
