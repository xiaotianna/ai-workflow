import { TestModelConnectionDto } from '@/dto/model.dto'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import { ModelEndpointPolicyService } from '@/infra/model-provider/model-endpoint-policy.service'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import type {
  ModelConnectionAuthentication,
  ModelConnectionErrorType,
  ModelConnectionTestVo,
} from '@/vo/model.vo'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

const CONNECTION_TIMEOUT_MS = 8000
const MAX_RESPONSE_BYTES = 1_048_576

@Injectable()
export class ModelConnectionTestService {
  constructor(
    private readonly repository: ModelGroupRepository,
    private readonly credentialService: ModelCredentialService,
    private readonly endpointPolicy: ModelEndpointPolicyService,
    private readonly providerRegistry: ModelProviderRegistry,
  ) {}

  async test(ownerId: string, dto: TestModelConnectionDto): Promise<ModelConnectionTestVo> {
    if (dto.apiKey && dto.credentialGroupId) {
      throw new BadRequestException('不能同时使用输入 Key 和已保存 Key')
    }

    const provider = this.providerRegistry.get(dto.providerType)
    let apiKey = dto.apiKey

    if (dto.credentialGroupId) {
      const storedCredential = await this.repository.findCredential(ownerId, dto.credentialGroupId)

      if (!storedCredential) {
        throw new NotFoundException('模型组不存在')
      }

      if (storedCredential.providerType !== dto.providerType) {
        throw new BadRequestException('已保存 Key 与当前模型供应商不匹配')
      }

      apiKey = this.credentialService.decrypt(storedCredential, storedCredential.id)
    }

    if (!provider.supportsApiKey && apiKey) {
      throw new BadRequestException('当前模型供应商不需要 Key')
    }

    const probeUrl = provider.createProbeUrl(dto.baseUrl)
    await this.endpointPolicy.assertAllowed(probeUrl)

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
