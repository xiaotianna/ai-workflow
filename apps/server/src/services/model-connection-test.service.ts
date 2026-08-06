import type { ModelProviderTypeValue } from '@/constant/model'
import { TestModelConnectionDto, TestModelDto } from '@/dto/model.dto'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import type {
  ModelChatStreamProbe,
  ModelProviderAdapter,
} from '@/infra/model-provider/model-provider.adapter'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import type {
  ModelConnectionAuthentication,
  ModelConnectionErrorType,
  ModelConnectionTestVo,
  ModelTestVo,
} from '@/vo/model.vo'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

const CONNECTION_TIMEOUT_MS = 8000
const MODEL_STREAM_TIMEOUT_MS = 30_000
const MAX_RESPONSE_BYTES = 1_048_576
const MODEL_TEST_PROMPT = 'Reply with OK.'

interface CredentialTestInput {
  providerType: ModelProviderTypeValue
  apiKey?: string
  credentialGroupId?: string
}

interface StreamReadResult {
  messageReceived: boolean
  errorMessage?: string
}

@Injectable()
export class ModelConnectionTestService {
  constructor(
    private readonly repository: ModelGroupRepository,
    private readonly credentialService: ModelCredentialService,
    private readonly providerRegistry: ModelProviderRegistry,
  ) {}

  async test(ownerId: string, dto: TestModelConnectionDto): Promise<ModelConnectionTestVo> {
    const provider = this.providerRegistry.get(dto.providerType)
    const apiKey = await this.resolveApiKey(ownerId, dto, provider)

    const probeUrl = provider.createProbeUrl(dto.baseUrl)

    const startedAt = Date.now()

    try {
      const response = await fetch(probeUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS),
      })
      const latencyMs = Date.now() - startedAt
      const authentication = getAuthenticationResult(
        response.status,
        Boolean(apiKey),
        provider.supportsApiKey,
      )

      if (response.status === 401 || response.status === 403) {
        await response.body?.cancel()
        return {
          reachable: true,
          authentication,
          responseValid: false,
          latencyMs,
          upstreamStatus: response.status,
          message: apiKey
            ? '模型服务可达，但 Key 无效或当前账号没有访问权限'
            : '模型服务可达，未携带 Key，尚未验证配置可用性',
        }
      }

      if (!response.ok) {
        await response.body?.cancel()
        return {
          reachable: true,
          authentication,
          responseValid: false,
          latencyMs,
          upstreamStatus: response.status,
          errorType: 'upstream_error',
          message: `模型服务可达，但上游接口响应异常（HTTP ${response.status}）`,
        }
      }

      const responseBody = await readJsonBody(response)
      const responseValid = provider.isValidResponse(responseBody)

      return {
        reachable: true,
        authentication,
        responseValid,
        latencyMs,
        upstreamStatus: response.status,
        ...(responseValid ? {} : { errorType: 'invalid_response' as const }),
        message: responseValid
          ? !provider.supportsApiKey
            ? '模型服务连接成功，响应结构正确'
            : apiKey
              ? '模型服务连接成功，Key 有效且响应结构正确'
              : '模型服务可达且响应结构正确，未验证 Key'
          : '模型服务可达，但模型列表响应结构无效',
      }
    } catch (error) {
      const latencyMs = Date.now() - startedAt
      const errorType = classifyConnectionError(error)

      return {
        reachable: false,
        authentication: provider.supportsApiKey
          ? apiKey
            ? 'unknown'
            : 'not_checked'
          : 'not_required',
        responseValid: false,
        latencyMs,
        errorType,
        message: getConnectionErrorMessage(errorType),
      }
    }
  }

  async testModel(ownerId: string, dto: TestModelDto): Promise<ModelTestVo> {
    const provider = this.providerRegistry.get(dto.providerType)
    const apiKey = await this.resolveApiKey(ownerId, dto, provider)
    const probe = provider.createChatStreamProbe(dto.modelId, MODEL_TEST_PROMPT, dto.baseUrl)

    const startedAt = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MODEL_STREAM_TIMEOUT_MS)

    try {
      const response = await fetch(probe.url, {
        method: 'POST',
        headers: {
          Accept: probe.protocol === 'sse' ? 'text/event-stream' : 'application/x-ndjson',
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(probe.body),
        redirect: 'manual',
        signal: controller.signal,
      })

      if (!response.ok) {
        const upstreamMessage = await readUpstreamErrorMessage(response)

        return {
          available: false,
          latencyMs: Date.now() - startedAt,
          upstreamStatus: response.status,
          errorType: 'upstream_error',
          message: upstreamMessage || `模型请求失败，上游接口返回 HTTP ${response.status}`,
        }
      }

      const streamResult = await readFirstModelMessage(response, probe)

      if (streamResult.messageReceived) {
        controller.abort()

        return {
          available: true,
          latencyMs: Date.now() - startedAt,
          upstreamStatus: response.status,
          message: '模型已返回有效消息',
        }
      }

      return {
        available: false,
        latencyMs: Date.now() - startedAt,
        upstreamStatus: response.status,
        errorType: streamResult.errorMessage ? 'upstream_error' : 'invalid_response',
        message: streamResult.errorMessage || '流式响应结束，但没有返回有效的 message 内容',
      }
    } catch (error) {
      const errorType = classifyConnectionError(error)

      return {
        available: false,
        latencyMs: Date.now() - startedAt,
        errorType,
        message: getConnectionErrorMessage(errorType),
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async resolveApiKey(
    ownerId: string,
    input: CredentialTestInput,
    provider: ModelProviderAdapter,
  ): Promise<string | undefined> {
    if (input.apiKey && input.credentialGroupId) {
      throw new BadRequestException('不能同时使用输入 Key 和已保存 Key')
    }

    let apiKey = input.apiKey

    if (input.credentialGroupId) {
      const storedCredential = await this.repository.findCredential(
        ownerId,
        input.credentialGroupId,
      )

      if (!storedCredential) {
        throw new NotFoundException('模型组不存在')
      }

      if (storedCredential.providerType !== input.providerType) {
        throw new BadRequestException('已保存 Key 与当前模型供应商不匹配')
      }

      apiKey = this.credentialService.decrypt(storedCredential, storedCredential.id)
    }

    if (!provider.supportsApiKey && apiKey) {
      throw new BadRequestException('当前模型供应商不需要 Key')
    }

    return apiKey
  }
}

async function readFirstModelMessage(
  response: Response,
  probe: ModelChatStreamProbe,
): Promise<StreamReadResult> {
  const reader = response.body?.getReader()
  if (!reader) return { messageReceived: false }

  const decoder = new TextDecoder()
  let buffer = ''
  let totalBytes = 0
  const activeReader = reader

  async function readNextChunk(): Promise<StreamReadResult> {
    const { done, value } = await activeReader.read()

    if (done) {
      buffer += decoder.decode()
      return parseRemainingStreamBuffer(buffer, probe)
    }

    totalBytes += value.byteLength
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await activeReader.cancel()
      return {
        messageReceived: false,
        errorMessage: '模型流式响应过大，未检测到有效的 message 内容',
      }
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    const lineResult = parseStreamLines(lines, probe)

    if (lineResult.messageReceived || lineResult.errorMessage) {
      await activeReader.cancel()
      return lineResult
    }

    return readNextChunk()
  }

  try {
    return await readNextChunk()
  } finally {
    activeReader.releaseLock()
  }
}

function parseStreamLines(lines: readonly string[], probe: ModelChatStreamProbe): StreamReadResult {
  for (const line of lines) {
    const lineResult = parseStreamLine(line, probe)
    if (lineResult.messageReceived || lineResult.errorMessage) return lineResult
  }

  return { messageReceived: false }
}

function parseRemainingStreamBuffer(buffer: string, probe: ModelChatStreamProbe): StreamReadResult {
  for (const line of buffer.split(/\r?\n/)) {
    const lineResult = parseStreamLine(line, probe)
    if (lineResult.messageReceived || lineResult.errorMessage) return lineResult
  }

  return { messageReceived: false }
}

function parseStreamLine(line: string, probe: ModelChatStreamProbe): StreamReadResult {
  let payload = line.trim()

  if (!payload || payload.startsWith(':')) return { messageReceived: false }

  if (probe.protocol === 'sse') {
    if (!payload.startsWith('data:')) return { messageReceived: false }
    payload = payload.slice(5).trim()
    if (!payload || payload === '[DONE]') return { messageReceived: false }
  }

  const value = parseJson(payload)
  if (value === undefined) return { messageReceived: false }

  const errorMessage = extractCoreMessage(value)
  if (errorMessage) return { messageReceived: false, errorMessage }

  return { messageReceived: Boolean(probe.extractMessage(value)) }
}

async function readUpstreamErrorMessage(response: Response): Promise<string | undefined> {
  const body = await readLimitedText(response)
  if (!body) return undefined

  const parsedBody = parseJson(body)
  const bodyMessage = parsedBody === undefined ? undefined : extractCoreMessage(parsedBody)
  if (bodyMessage) return bodyMessage

  for (const line of body.split(/\r?\n/)) {
    const payload = line.trim().replace(/^data:\s*/, '')
    const value = parseJson(payload)
    const lineMessage = value === undefined ? undefined : extractCoreMessage(value)
    if (lineMessage) return lineMessage
  }

  const plainText = normalizeUpstreamMessage(body)
  return plainText && !plainText.startsWith('<') ? plainText : undefined
}

async function readLimitedText(response: Response): Promise<string | undefined> {
  const reader = response.body?.getReader()
  if (!reader) return undefined

  const decoder = new TextDecoder()
  let result = ''
  let totalBytes = 0
  const activeReader = reader

  async function readNextChunk(): Promise<string> {
    const { done, value } = await activeReader.read()
    if (done) return result + decoder.decode()

    totalBytes += value.byteLength
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await activeReader.cancel()
      return result
    }

    result += decoder.decode(value, { stream: true })
    return readNextChunk()
  }

  try {
    return await readNextChunk()
  } finally {
    activeReader.releaseLock()
  }
}

function parseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function extractCoreMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return normalizeUpstreamMessage(value)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined

  const record = value as Record<string, unknown>

  for (const field of ['message', 'detail', 'error_description']) {
    const message = record[field]
    if (typeof message === 'string' && message.trim()) return normalizeUpstreamMessage(message)
  }

  if (record.error !== undefined) return extractCoreMessage(record.error)

  return undefined
}

function normalizeUpstreamMessage(message: string): string | undefined {
  const normalizedMessage = message.replace(/\s+/g, ' ').trim()
  return normalizedMessage ? normalizedMessage.slice(0, 500) : undefined
}

function getAuthenticationResult(
  status: number,
  apiKeyProvided: boolean,
  supportsApiKey: boolean,
): ModelConnectionAuthentication {
  if (!supportsApiKey) return 'not_required'
  if (!apiKeyProvided) return 'not_checked'
  if (status === 401 || status === 403) return 'failed'
  if (status >= 200 && status < 300) return 'passed'
  return 'unknown'
}

async function readJsonBody(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'))

  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel()
    return undefined
  }

  const reader = response.body?.getReader()
  if (!reader) return undefined
  const activeReader = reader

  const chunks: Uint8Array[] = []
  let totalBytes = 0

  async function readNextChunk(): Promise<boolean> {
    const { done, value } = await activeReader.read()
    if (done) return true

    totalBytes += value.byteLength
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await activeReader.cancel()
      return false
    }
    chunks.push(value)

    return readNextChunk()
  }

  if (!(await readNextChunk())) return undefined

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    return undefined
  }
}

function classifyConnectionError(error: unknown): ModelConnectionErrorType {
  if (
    error instanceof DOMException &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  ) {
    return 'timeout'
  }

  const code = getErrorCode(error)

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns'
  if (code === 'ECONNREFUSED') return 'connection_refused'
  if (code?.startsWith('ERR_TLS') || code?.includes('CERT')) return 'tls'
  return 'network'
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined

  if ('code' in error && typeof error.code === 'string') return error.code

  if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
    const cause = error.cause
    if ('code' in cause && typeof cause.code === 'string') return cause.code
  }

  return undefined
}

function getConnectionErrorMessage(errorType: ModelConnectionErrorType): string {
  switch (errorType) {
    case 'timeout': {
      return '连接模型服务超时，请检查服务地址和网络'
    }
    case 'dns': {
      return '无法解析模型服务域名'
    }
    case 'connection_refused': {
      return '模型服务拒绝连接，请检查端口和服务状态'
    }
    case 'tls': {
      return '模型服务 TLS 连接失败，请检查证书配置'
    }
    default: {
      return '无法连接到模型服务，请检查服务地址和网络'
    }
  }
}
