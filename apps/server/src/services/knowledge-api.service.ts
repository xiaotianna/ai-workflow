import type { KnowledgeApiAuthContext } from '@/common/interfaces/knowledge-api-auth-context.interface'
import type { RetrieveKnowledgeApiDto } from '@/dto/knowledge-api.dto'
import { KnowledgeApiRepository } from '@/repositories/knowledge-api.repository'
import { KnowledgeRetrievalService } from '@/services/knowledge-retrieval.service'
import type {
  CreatedKnowledgeApiKeyVo,
  KnowledgeApiKeyVo,
  KnowledgeApiOverviewVo,
  KnowledgeApiRetrieveVo,
} from '@/vo/knowledge-api.vo'
import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'

const API_KEY_PREFIX = 'kb-live-'
const API_KEY_MASK_LENGTH = 20
const RETRIEVE_SCOPE = 'knowledge:retrieve'

@Injectable()
export class KnowledgeApiService {
  constructor(
    private readonly knowledgeApiRepository: KnowledgeApiRepository,
    private readonly knowledgeRetrievalService: KnowledgeRetrievalService,
  ) {}

  async getOverview(ownerId: string, knowledgeBaseId: string): Promise<KnowledgeApiOverviewVo> {
    const knowledgeBase = await this.knowledgeApiRepository.findOwnedKnowledgeBase(
      ownerId,
      knowledgeBaseId,
    )
    if (!knowledgeBase) throw new NotFoundException('知识库不存在')
    return { enabled: knowledgeBase.apiEnabled }
  }

  async updateAccess(
    ownerId: string,
    knowledgeBaseId: string,
    enabled: boolean,
  ): Promise<KnowledgeApiOverviewVo> {
    const knowledgeBase = await this.knowledgeApiRepository.updateAccess(
      ownerId,
      knowledgeBaseId,
      enabled,
    )
    if (!knowledgeBase) throw new NotFoundException('知识库不存在')
    return { enabled: knowledgeBase.apiEnabled }
  }

  async listKeys(ownerId: string, knowledgeBaseId: string): Promise<KnowledgeApiKeyVo[]> {
    const knowledgeBase = await this.knowledgeApiRepository.findOwnedKnowledgeBase(
      ownerId,
      knowledgeBaseId,
    )
    if (!knowledgeBase) throw new NotFoundException('知识库不存在')

    const keys = await this.knowledgeApiRepository.listOwnedApiKeys(ownerId, knowledgeBaseId)
    return keys.map(toApiKeyVo)
  }

  async createKey(ownerId: string, knowledgeBaseId: string): Promise<CreatedKnowledgeApiKeyVo> {
    const secret = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
    const key = await this.knowledgeApiRepository.createOwnedApiKey({
      ownerId,
      knowledgeBaseId,
      prefix: API_KEY_PREFIX,
      suffix: secret.slice(-5),
      keyHash: hashValue(secret),
      scopes: [RETRIEVE_SCOPE],
    })
    if (!key) throw new NotFoundException('知识库不存在')

    return { ...toApiKeyVo(key), key: secret }
  }

  async revokeKey(ownerId: string, knowledgeBaseId: string, apiKeyId: string): Promise<void> {
    const revoked = await this.knowledgeApiRepository.revokeOwnedApiKey(
      ownerId,
      knowledgeBaseId,
      apiKeyId,
    )
    if (!revoked) throw new NotFoundException('API 密钥不存在')
  }

  async authenticate(rawKey: string): Promise<KnowledgeApiAuthContext> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) throw new UnauthorizedException('API 密钥无效')

    const context = await this.knowledgeApiRepository.authenticateApiKey(hashValue(rawKey))
    if (!context) throw new UnauthorizedException('API 密钥无效、已撤销或 API 访问未启用')
    return context
  }

  async retrieve(
    auth: KnowledgeApiAuthContext,
    dto: RetrieveKnowledgeApiDto,
    requestId: string,
  ): Promise<KnowledgeApiRetrieveVo> {
    const startedAt = Date.now()
    const queryHash = hashValue(dto.query)

    try {
      if (!auth.scopes.includes(RETRIEVE_SCOPE)) {
        throw new ForbiddenException('API 密钥缺少知识库检索权限')
      }
      if (dto.knowledgeBaseIds.length !== 1 || dto.knowledgeBaseIds[0] !== auth.knowledgeBaseId) {
        throw new ForbiddenException('API 密钥无权访问请求中的知识库')
      }

      const result = await this.knowledgeRetrievalService.retrieve(
        auth.ownerId,
        [auth.knowledgeBaseId],
        dto.query,
        dto.topK ?? auth.defaultTopK,
      )
      const durationMs = Date.now() - startedAt

      await this.knowledgeApiRepository.createApiCallLog({
        knowledgeBaseId: auth.knowledgeBaseId,
        apiKeyId: auth.apiKeyId,
        requestId,
        queryHash,
        statusCode: 200,
        durationMs,
        resultCount: result.documents.length,
      })

      return {
        requestId,
        profile: { id: result.profile, version: result.profileVersion },
        scoreType: result.scoreType,
        tookMs: durationMs,
        results: result.documents.map((document, index) => ({
          rank: index + 1,
          chunkId: document.chunkId,
          documentId: document.documentId,
          documentName: document.documentName,
          content: document.content,
          metadata: document.metadata,
          score: document.score,
        })),
      }
    } catch (error) {
      const statusCode = error instanceof HttpException ? error.getStatus() : 500
      await this.knowledgeApiRepository.createApiCallLog({
        knowledgeBaseId: auth.knowledgeBaseId,
        apiKeyId: auth.apiKeyId,
        requestId,
        queryHash,
        statusCode,
        durationMs: Date.now() - startedAt,
        resultCount: 0,
      })
      throw error
    }
  }
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function maskApiKey(prefix: string, suffix: string | null): string {
  return `${prefix}${'*'.repeat(API_KEY_MASK_LENGTH)}${suffix ?? ''}`
}

function toApiKeyVo(key: {
  id: string
  prefix: string
  suffix: string | null
  scopes: string[]
  createdAt: Date
  lastUsedAt: Date | null
}): KnowledgeApiKeyVo {
  return {
    id: key.id,
    maskedKey: maskApiKey(key.prefix, key.suffix),
    scopes: key.scopes,
    createdAt: key.createdAt,
    ...(key.lastUsedAt ? { lastUsedAt: key.lastUsedAt } : {}),
  }
}
