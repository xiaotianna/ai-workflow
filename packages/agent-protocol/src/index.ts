import { workflowSchema, workflowPluginLockSchema, type Workflow } from '@ai-workflow/core'
import { z } from 'zod'

export const AGENT_PROTOCOL_VERSION = 1 as const
export const AGENT_MAX_REQUEST_BYTES = 64 * 1024 * 1024
export const AGENT_MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const AGENT_MAX_EVENT_BYTES = 1_048_576
export const AGENT_MAX_TOOL_RESULT_BYTES = 65_536
export const AGENT_SECRET_MASK = '********'
export const AGENT_TOOL_NAMES = [
  'read_canvas',
  'list_node_types',
  'get_node_type',
  'inspect_project_resources',
  'list_workflow_runs',
  'get_workflow_run',
  'validate_workflow',
  'set_canvas_candidate',
] as const
export const agentToolNameSchema = z.enum(AGENT_TOOL_NAMES)
export type AgentToolName = z.infer<typeof agentToolNameSchema>
const id = z.string().trim().min(1).max(200),
  time = z.iso.datetime(),
  json = z.json(),
  point = z.object({ x: z.number(), y: z.number() })
export const agentSnapshotSchema = z.object({
  workflow: workflowSchema,
  layout: z.object({
    positions: z.record(z.string(), point),
    sizes: z
      .record(
        z.string(),
        z.object({
          width: z.number().positive(),
          height: z.number().positive(),
        }),
      )
      .optional(),
    viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number().positive() }).optional(),
  }),
})
export const agentModelRefSchema = z.object({
  groupId: z.uuid(),
  configuredModelId: z.uuid(),
})
export const agentImageSchema = z.object({
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  data: z
    .string()
    .min(4)
    .max(Math.ceil(AGENT_MAX_IMAGE_BYTES / 3) * 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/)
    .refine(
      (data) =>
        data.length % 4 === 0 &&
        (data.length / 4) * 3 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0) <=
          AGENT_MAX_IMAGE_BYTES,
      '图片最大为 10MB',
    ),
})
export type AgentImage = z.infer<typeof agentImageSchema>
export const agentReasoningFieldSchema = z.enum([
  'reasoning_content',
  'reasoning',
  'reasoning_text',
])
export const agentMessageSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('user'),
    text: z.string(),
    images: z.array(agentImageSchema).optional(),
  }),
  z.object({
    role: z.literal('assistant'),
    content: z.array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('text'), text: z.string() }),
        z.object({
          type: z.literal('reasoning'),
          text: z.string(),
          field: agentReasoningFieldSchema.optional(),
        }),
        z.object({
          type: z.literal('tool-call'),
          toolCallId: id,
          toolName: agentToolNameSchema,
          args: z.record(z.string(), json),
          result: json,
          isError: z.boolean(),
        }),
      ]),
    ),
  }),
])
export type AgentMessage = z.infer<typeof agentMessageSchema>
export const agentTurnSchema = z
  .object({
    protocolVersion: z.literal(1),
    sessionId: z.uuid().optional(),
    messages: z.array(agentMessageSchema).default([]),
    prompt: z.string().trim().min(1).max(16_000),
    images: z.array(agentImageSchema).optional(),
    contextNodeIds: z.array(id).max(20),
    model: agentModelRefSchema,
    snapshot: agentSnapshotSchema,
    baseSnapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .superRefine((turn, ctx) => {
    const nodes = new Set(turn.snapshot.workflow.nodes.map((node) => node.id))
    if (
      new Set(turn.contextNodeIds).size !== turn.contextNodeIds.length ||
      turn.contextNodeIds.some((nodeId) => !nodes.has(nodeId))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['contextNodeIds'],
        message: '节点上下文不属于当前画布或存在重复',
      })
    }
  })
export type AgentTurn = z.infer<typeof agentTurnSchema>
export type AgentSnapshot = z.infer<typeof agentSnapshotSchema>
export const agentResolvedModelSchema = z.object({
  providerType: z.enum(['openai', 'deepseek', 'ollama']),
  modelId: id,
  baseUrl: z.url(),
  apiKey: z.string().max(8192).optional(),
})
export type AgentResolvedModel = z.infer<typeof agentResolvedModelSchema>
export const agentRunSchema = z.object({
  protocolVersion: z.literal(1),
  agentRunId: z.uuid(),
  ownerId: z.uuid(),
  appId: z.uuid(),
  agentContextToken: z.string().min(32).max(4096),
  turn: agentTurnSchema,
  resolvedModel: agentResolvedModelSchema,
})
export type AgentRunRequest = z.infer<typeof agentRunSchema>
export const agentContextClaimsSchema = z.object({
  protocolVersion: z.literal(1),
  ownerId: z.uuid(),
  appId: z.uuid(),
  agentRunId: z.uuid(),
  workflowId: id,
  allowedTools: z.array(agentToolNameSchema),
  expiresAt: z.number().int().positive(),
})
export type AgentContextClaims = z.infer<typeof agentContextClaimsSchema>
export const agentToolInputSchemas = {
  read_canvas: z.object({
    source: z.enum(['baseline', 'candidate']).default('candidate'),
    nodeIds: z.array(id).max(100).optional(),
  }),
  list_node_types: z.object({
    search: z.string().max(100).optional(),
    plugins: workflowPluginLockSchema.default([]),
  }),
  get_node_type: z.object({
    type: id,
    config: z.record(z.string(), json).optional(),
    plugins: workflowPluginLockSchema.default([]),
  }),
  inspect_project_resources: z.object({
    resource: z.enum(['models', 'knowledge_bases', 'sub_workflows', 'app']),
    search: z.string().max(100).optional(),
  }),
  list_workflow_runs: z.object({
    limit: z.number().int().min(1).max(20).default(10),
    status: z
      .enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'])
      .optional(),
    trigger: z.enum(['TEST_RUN', 'MANUAL', 'API', 'SUB_WORKFLOW']).optional(),
    from: time.optional(),
    search: z.string().max(100).optional(),
  }),
  get_workflow_run: z.object({ runId: z.uuid() }),
  validate_workflow: z.object({ workflow: workflowSchema }),
  set_canvas_candidate: z.object({ workflow: workflowSchema }),
}
export const agentGatewayCallSchema = z.discriminatedUnion('tool', [
  z.object({
    tool: z.literal('list_node_types'),
    input: agentToolInputSchemas.list_node_types,
  }),
  z.object({
    tool: z.literal('get_node_type'),
    input: agentToolInputSchemas.get_node_type,
  }),
  z.object({
    tool: z.literal('inspect_project_resources'),
    input: agentToolInputSchemas.inspect_project_resources,
  }),
  z.object({
    tool: z.literal('list_workflow_runs'),
    input: agentToolInputSchemas.list_workflow_runs,
  }),
  z.object({
    tool: z.literal('get_workflow_run'),
    input: agentToolInputSchemas.get_workflow_run,
  }),
  z.object({
    tool: z.literal('validate_workflow'),
    input: agentToolInputSchemas.validate_workflow,
  }),
])
export type AgentGatewayCall = z.infer<typeof agentGatewayCallSchema>
export const agentErrorSchema = z.object({
  code: id,
  message: z.string().max(2000),
  details: json.optional(),
  retryable: z.boolean(),
})
export type AgentError = z.infer<typeof agentErrorSchema>
export const agentGatewayResultSchema = z.discriminatedUnion('ok', [
  z.object({
    protocolVersion: z.literal(1),
    ok: z.literal(true),
    data: json,
    truncated: z.boolean().optional(),
  }),
  z.object({
    protocolVersion: z.literal(1),
    ok: z.literal(false),
    error: agentErrorSchema,
  }),
])
export type AgentGatewayResult = z.infer<typeof agentGatewayResultSchema>
export const agentValidationSchema = z.object({
  valid: z.boolean(),
  issues: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      nodeId: z.string().optional(),
      path: z.string().optional(),
    }),
  ),
  workflow: workflowSchema.optional(),
})
const display = z.object({
  summary: z.string().max(1000),
  fields: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).optional(),
  data: json.optional(),
  truncated: z.boolean().optional(),
})
export type AgentToolDisplay = z.infer<typeof display>
export const agentEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session_started'),
    sessionId: z.uuid(),
    agentRunId: z.uuid(),
  }),
  z.object({
    type: z.literal('reasoning_started'),
    reasoningId: id,
    source: z.enum(['runtime', 'model_summary', 'model']),
    startedAt: time,
  }),
  z.object({
    type: z.literal('reasoning_delta'),
    reasoningId: id,
    delta: z.string().max(4000),
  }),
  z.object({
    type: z.literal('reasoning_finished'),
    reasoningId: id,
    completedAt: time,
    field: agentReasoningFieldSchema.optional(),
  }),
  z.object({
    type: z.literal('assistant_delta'),
    delta: z.string().max(16_000),
  }),
  z.object({
    type: z.literal('tool_queued'),
    toolCallId: id,
    toolName: id,
    displayArgs: display,
    queuedAt: time,
  }),
  z.object({
    type: z.literal('tool_started'),
    toolCallId: id,
    toolName: id,
    displayArgs: display,
    startedAt: time,
  }),
  z.object({
    type: z.literal('tool_progress'),
    toolCallId: id,
    message: z.string().max(1000),
    completed: z.number().nonnegative().optional(),
    total: z.number().positive().optional(),
  }),
  z.object({
    type: z.literal('tool_finished'),
    toolCallId: id,
    toolName: id,
    status: z.enum(['succeeded', 'failed', 'cancelled']),
    displayResult: display,
    completedAt: time,
  }),
  z.object({
    type: z.literal('candidate_ready'),
    baseSnapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    workflow: workflowSchema,
  }),
  z.object({
    type: z.literal('agent_finished'),
    message: z.string().max(64_000),
    usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
  }),
  z.object({
    type: z.literal('agent_cancelled'),
    agentRunId: z.uuid(),
    cancelledAt: time,
    reason: z.enum(['user', 'disconnect', 'shutdown']),
  }),
  z.object({ type: z.literal('agent_failed'), error: agentErrorSchema }),
])
export type AgentEvent = z.infer<typeof agentEventSchema>

export function parseAgentEvent(raw: unknown): AgentEvent {
  z.object({ protocolVersion: z.literal(1) }).parse(raw)
  return agentEventSchema.parse(raw)
}

export function maskAgentWorkflow(workflow: Workflow): Workflow {
  return {
    ...workflow,
    environmentVariables: workflow.environmentVariables.map((v) =>
      v.type === 'secret' ? { ...v, value: AGENT_SECRET_MASK } : v,
    ),
  }
}

// 排序对象键，保证 Web 与 Server 对同一快照计算相同的摘要。
export function canonicalAgentJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalAgentJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalAgentJson(v)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export async function hashAgentSnapshot(snapshot: AgentSnapshot): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalAgentJson(snapshot)),
    digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function encodeAgentEvent(event: AgentEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify({ protocolVersion: 1, ...event })}\n\n`
}

export function projectAgentData(
  value: unknown,
  secrets: readonly string[] = [],
): {
  data: z.infer<typeof json>
  truncated: boolean
} {
  let truncated = false
  const redact = (text: string) =>
    secrets.filter(Boolean).reduce((s, secret) => s.split(secret).join('********'), text)
  function visit(item: unknown, depth: number): unknown {
    if (typeof item === 'function' || typeof item === 'symbol') return null
    if (depth > 15) {
      truncated = true
      return { truncated: true }
    }
    if (typeof item === 'string') {
      const text = redact(item)
      if (text.length > 4000) {
        truncated = true
        return `${text.slice(0, 4000)}…[已截断]`
      }
      return text
    }
    if (item instanceof Date) return item.toISOString()
    if (Array.isArray(item)) {
      if (item.length > 100) truncated = true
      return item.slice(0, 100).map((entry) => visit(entry, depth + 1))
    }
    if (item && typeof item === 'object') {
      const entries = Object.entries(item)
      if (entries.length > 100) truncated = true
      return Object.fromEntries(
        entries
          .slice(0, 100)
          .filter(([, v]) => v !== undefined)
          .map(([key, entry]) => [
            redact(key),
            /^(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|credential|storageKey)$/i.test(
              key,
            )
              ? '********'
              : visit(entry, depth + 1),
          ]),
      )
    }
    return item ?? null
  }
  const data = json.parse(visit(value, 0))
  if (
    new TextEncoder().encode(JSON.stringify(data)).byteLength >
    AGENT_MAX_TOOL_RESULT_BYTES - 1024
  ) {
    return {
      data: { truncated: true, summary: '结果超过大小限制，请缩小查询范围' },
      truncated: true,
    }
  }
  return { data, truncated }
}
