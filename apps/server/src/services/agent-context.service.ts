import {
  agentContextClaimsSchema,
  canonicalAgentJson,
  maskAgentWorkflow,
  type AgentContextClaims,
} from '@ai-workflow/agent-protocol'
import type { Workflow } from '@ai-workflow/core'
import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'

@Injectable()
export class AgentContextService {
  private readonly active = new Map<string, AgentContextClaims>()
  private readonly validatedCandidates = new Map<string, string>()
  constructor(private readonly config: ConfigService) {}
  private sign(payload: string) {
    const secret = this.config.get<string>('AGENT_RUNTIME_INTERNAL_AUTH_TOKEN')
    if (!secret) throw new ServiceUnavailableException('Agent Runtime 尚未配置')
    return createHmac('sha256', secret).update(`agent-context:v1:${payload}`).digest('base64url')
  }
  issue(claims: AgentContextClaims): string {
    this.active.set(claims.agentRunId, claims)
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
    return `${payload}.${this.sign(payload)}`
  }
  release(runId: string) {
    this.active.delete(runId)
    this.validatedCandidates.delete(runId)
  }
  recordValidatedCandidate(runId: string, workflow: Workflow) {
    if (!this.active.has(runId)) throw new UnauthorizedException('Agent 上下文已失效')
    this.validatedCandidates.set(runId, canonicalAgentJson(maskAgentWorkflow(workflow)))
  }
  assertCandidateValidated(runId: string, workflow: Workflow) {
    if (this.validatedCandidates.get(runId) !== canonicalAgentJson(maskAgentWorkflow(workflow)))
      throw new UnauthorizedException('候选未通过 Server 校验')
  }
  verify(token: string): AgentContextClaims {
    try {
      const [payload, signature, extra] = token.split('.')
      if (!payload || !signature || extra) throw new Error('Agent 上下文无效')
      const actual = Buffer.from(signature),
        expected = Buffer.from(this.sign(payload))
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
        throw new Error('Agent 上下文无效')
      const claims = agentContextClaimsSchema.parse(
          JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
        ),
        active = this.active.get(claims.agentRunId)
      if (
        !active ||
        JSON.stringify(active) !== JSON.stringify(claims) ||
        claims.expiresAt <= Date.now()
      )
        throw new Error('Agent 上下文无效')
      return claims
    } catch {
      throw new UnauthorizedException('Agent 上下文已失效')
    }
  }
}
