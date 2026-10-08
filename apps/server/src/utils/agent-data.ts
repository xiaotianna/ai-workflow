import { AGENT_MAX_TOOL_RESULT_BYTES } from '@ai-workflow/agent-protocol'

export function projectAgentData(value: unknown, secrets: readonly string[] = []) {
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
  const data = visit(value, 0)
  if (Buffer.byteLength(JSON.stringify(data)) > AGENT_MAX_TOOL_RESULT_BYTES - 1024) {
    return {
      data: { truncated: true, summary: '结果超过大小限制，请缩小查询范围' },
      truncated: true,
    }
  }
  return { data, truncated }
}
