import {
  AGENT_MAX_REQUEST_BYTES,
  agentRunSchema,
  encodeAgentEvent,
} from '@ai-workflow/agent-protocol'
import { createServer, type IncomingMessage } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import type { RuntimeConfig } from './config.js'
import { AgentSessions, safeRuntimeError } from './agent-session.js'

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > AGENT_MAX_REQUEST_BYTES) throw new Error('请求超过大小限制')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}
export function createRuntimeServer(config: RuntimeConfig) {
  const sessions = new AgentSessions(config),
    server = createServer(async (request, response) => {
      response.setHeader('Cache-Control', 'no-store')
      if (request.method === 'GET' && request.url === '/health') {
        response.end(JSON.stringify({ status: 'ok', protocolVersion: 1 }))
        return
      }
      const expected = Buffer.from(`Bearer ${config.AGENT_RUNTIME_INTERNAL_AUTH_TOKEN}`),
        supplied = Buffer.from(request.headers.authorization ?? '')
      if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
        response.writeHead(401)
        response.end()
        return
      }
      const controller = new AbortController()
      response.on('close', () => {
        if (!response.writableEnded) controller.abort('disconnect')
      })
      try {
        if (request.method === 'POST' && request.url === '/internal/runs') {
          const run = agentRunSchema.parse(await readJson(request))
          response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'X-Accel-Buffering': 'no',
          })
          response.flushHeaders()
          const heartbeat = setInterval(() => {
            if (!response.destroyed) response.write(': heartbeat\n\n')
          }, 15_000)
          try {
            await sessions.run(run, controller.signal, (event) => {
              if (!response.destroyed) response.write(encodeAgentEvent(event))
            })
          } finally {
            clearInterval(heartbeat)
          }
        } else if (
          request.method === 'POST' &&
          /^\/internal\/sessions\/[a-f0-9-]+\/abort$/.test(request.url ?? '')
        ) {
          const sessionId = z.uuid().parse(request.url!.split('/')[3]),
            scope = z.object({ ownerId: z.uuid(), appId: z.uuid() }).parse(await readJson(request))
          sessions.abort(sessionId, scope.ownerId, scope.appId)
          response.end(JSON.stringify({ ok: true }))
          return
        } else {
          response.writeHead(404)
          response.end()
          return
        }
      } catch (error) {
        if (!response.headersSent) response.writeHead(400, { 'Content-Type': 'application/json' })
        const safe = safeRuntimeError(error)
        if (response.getHeader('Content-Type') === 'text/event-stream')
          response.write(encodeAgentEvent({ type: 'agent_failed', error: safe }))
        else response.write(JSON.stringify({ error: safe }))
      }
      response.end()
    })
  server.requestTimeout = 30_000
  server.headersTimeout = 10_000
  server.maxConnections = 128
  return {
    server,
    close: () => {
      sessions.close()
      server.close()
    },
  }
}
