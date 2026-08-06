-- AddColumns with compatibility defaults so an older Server can keep writing during a rolling deploy.
ALTER TABLE "workflow_command_outbox"
ADD COLUMN "executionClass" VARCHAR(32) NOT NULL DEFAULT 'legacy-unknown',
ADD COLUMN "routingKey" VARCHAR(100) NOT NULL DEFAULT 'node.execute';

-- Backfill the logical execution class without changing the legacy delivery path.
UPDATE "workflow_command_outbox"
SET "executionClass" = CASE "payload"->>'nodeType'
    WHEN 'condition' THEN 'trusted-compute'
    WHEN 'llm' THEN 'controlled-model'
    WHEN 'rag' THEN 'controlled-model'
    WHEN 'http' THEN 'controlled-http'
    WHEN 'code' THEN 'untrusted-sandbox'
    WHEN 'sub_workflow' THEN 'runtime-control'
    ELSE 'legacy-unknown'
END,
"routingKey" = CASE "payload"->>'nodeType'
    WHEN 'sub_workflow' THEN 'server.execute.sub-workflow'
    ELSE 'node.execute'
END;
