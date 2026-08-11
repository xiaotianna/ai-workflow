import { KnowledgeLifecycleStatus } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface CreateKnowledgeApiKeyOptions {
  ownerId: string
  knowledgeBaseId: string
  keyHash: string
  prefix: string
  suffix: string
  scopes: string[]
}

interface CreateKnowledgeApiCallLogOptions {
  knowledgeBaseId: string
  apiKeyId: string
  requestId: string
  queryHash: string
  statusCode: number
  durationMs: number
  resultCount: number
}

const keySelect = {
  id: true,
  prefix: true,
  suffix: true,
  scopes: true,
  createdAt: true,
  lastUsedAt: true,
} as const

@Injectable()
export class KnowledgeApiRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedKnowledgeBase(ownerId: string, knowledgeBaseId: string) {
    return this.prisma.knowledgeBase.findFirst({
      where: {
        id: knowledgeBaseId,
        ownerId,
        deletedAt: null,
        lifecycleStatus: KnowledgeLifecycleStatus.ACTIVE,
      },
      select: { id: true, apiEnabled: true },
    })
  }

  updateAccess(ownerId: string, knowledgeBaseId: string, enabled: boolean) {
    return this.prisma.$transaction(async (transaction) => {
      const knowledgeBase = await transaction.knowledgeBase.findFirst({
        where: {
          id: knowledgeBaseId,
          ownerId,
          deletedAt: null,
          lifecycleStatus: KnowledgeLifecycleStatus.ACTIVE,
        },
        select: { id: true },
      })
      if (!knowledgeBase) return null

      return transaction.knowledgeBase.update({
        where: { id: knowledgeBase.id },
        data: { apiEnabled: enabled },
        select: { apiEnabled: true },
      })
    })
  }

  listOwnedApiKeys(ownerId: string, knowledgeBaseId: string) {
    return this.prisma.knowledgeBaseApiKey.findMany({
      where: {
        knowledgeBaseId,
        revokedAt: null,
        knowledgeBase: { ownerId, deletedAt: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: keySelect,
    })
  }

  createOwnedApiKey(options: CreateKnowledgeApiKeyOptions) {
    return this.prisma.$transaction(async (transaction) => {
      const knowledgeBase = await transaction.knowledgeBase.findFirst({
        where: {
          id: options.knowledgeBaseId,
          ownerId: options.ownerId,
          deletedAt: null,
          lifecycleStatus: KnowledgeLifecycleStatus.ACTIVE,
        },
        select: { id: true },
      })
      if (!knowledgeBase) return null

      return transaction.knowledgeBaseApiKey.create({
        data: {
          knowledgeBaseId: knowledgeBase.id,
          name: '知识库 API 密钥',
          prefix: options.prefix,
          suffix: options.suffix,
          keyHash: options.keyHash,
          scopes: options.scopes,
          createdById: options.ownerId,
        },
        select: keySelect,
      })
    })
  }

  revokeOwnedApiKey(ownerId: string, knowledgeBaseId: string, apiKeyId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const key = await transaction.knowledgeBaseApiKey.findFirst({
        where: {
          id: apiKeyId,
          knowledgeBaseId,
          revokedAt: null,
          knowledgeBase: { ownerId, deletedAt: null },
        },
        select: { id: true },
      })
      if (!key) return false

      await transaction.knowledgeBaseApiKey.update({
        where: { id: key.id },
        data: { revokedAt: new Date() },
      })
      return true
    })
  }

  async authenticateApiKey(keyHash: string) {
    const now = new Date()
    const apiKey = await this.prisma.knowledgeBaseApiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        knowledgeBase: {
          apiEnabled: true,
          deletedAt: null,
          lifecycleStatus: KnowledgeLifecycleStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        scopes: true,
        knowledgeBase: {
          select: {
            id: true,
            ownerId: true,
            settings: { select: { retrievalTopK: true } },
          },
        },
      },
    })
    if (!apiKey) return null

    const updated = await this.prisma.knowledgeBaseApiKey.updateMany({
      where: {
        id: apiKey.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        knowledgeBase: {
          apiEnabled: true,
          deletedAt: null,
          lifecycleStatus: KnowledgeLifecycleStatus.ACTIVE,
        },
      },
      data: { lastUsedAt: now },
    })
    if (updated.count !== 1) return null

    return {
      apiKeyId: apiKey.id,
      knowledgeBaseId: apiKey.knowledgeBase.id,
      ownerId: apiKey.knowledgeBase.ownerId,
      defaultTopK: apiKey.knowledgeBase.settings?.retrievalTopK ?? 8,
      scopes: apiKey.scopes,
    }
  }

  createApiCallLog(options: CreateKnowledgeApiCallLogOptions): Promise<void> {
    return this.prisma.knowledgeApiCallLog.create({ data: options }).then(() => undefined)
  }
}
