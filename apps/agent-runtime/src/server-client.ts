import {
  agentGatewayResultSchema,
  AGENT_MAX_TOOL_RESULT_BYTES,
  type AgentGatewayCall,
} from '@ai-workflow/agent-protocol'

export function createServerClient(url: string, internalToken: string, contextToken: string) {
  return async (call: AgentGatewayCall, signal?: AbortSignal) => {
    const response = await fetch(`${url.replace(/\/+$/, '')}/internal/agent/tools/execute`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalToken}`,
        'X-Agent-Context': contextToken,
      },
      body: JSON.stringify({ protocolVersion: 1, ...call }),
    })
    if (!response.ok) throw new Error('项目查询失败，请重试')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('项目查询响应无效')
    let size = 0,
      text = ''
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > AGENT_MAX_TOOL_RESULT_BYTES + 4096) throw new Error('项目查询结果超过大小限制')
        text += decoder.decode(value, { stream: true })
      }
      const result = agentGatewayResultSchema.parse(JSON.parse(text + decoder.decode()))
      if (!result.ok) throw new Error(result.error.message)
      return result.truncated ? { data: result.data, truncated: true } : result.data
    } finally {
      await reader.cancel().catch(() => undefined)
    }
  }
}
export type ServerClient = ReturnType<typeof createServerClient>
