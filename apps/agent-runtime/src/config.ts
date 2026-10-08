import { z } from 'zod'

export const runtimeConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3100),
  AGENT_RUNTIME_INTERNAL_AUTH_TOKEN: z.string().min(32),
  AI_WORKFLOW_SERVER_URL: z.url().default('http://127.0.0.1:3000'),
  AGENT_RUN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(900_000).default(180_000),
  AGENT_SESSION_IDLE_TTL_MS: z.coerce.number().int().min(1000).max(86_400_000).default(1_800_000),
  AGENT_MAX_SESSIONS: z.coerce.number().int().min(1).max(1000).default(100),
  AGENT_MAX_MODEL_TURNS: z.coerce.number().int().min(1).max(100).default(12),
  AGENT_MAX_TOOL_CALLS: z.coerce.number().int().min(1).max(200).default(40),
  AGENT_MAX_CONCURRENT_RUNS: z.coerce.number().int().min(1).max(100).default(8),
})
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>
