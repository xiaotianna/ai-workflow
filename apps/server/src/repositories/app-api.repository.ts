import { Prisma, WorkflowVersionSource } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface CreateOwnedApiKeyOptions {
  ownerId: string
  appId: string
  keyHash: string
  prefix: string
  suffix: string
}

interface CreateApiCallLogOptions {
  appId: string
  apiKeyId: string
  runId?: string
  requestId: string
  method: string
  path: string
  statusCode: number
  durationMs: number
  clientIp?: string
  userAgent?: string
  errorCode?: string
  errorMessage?: string
}

const appApiIdentitySelect = {
  id: true,
  name: true,
  description: true,
  icon: true,
  apiShareEnabled: true,
  apiShareToken: true,
  ownerId: true,
  owner: {
    select: { username: true },
  },
  workflow: {
    select: {
      id: true,
      draft: {
        select: { definition: true },
      },
      deployments: {
        take: 1,
        select: {
          version: {
            select: {
              id: true,
              definition: true,
            },
          },
        },
      },
      versions: {
        where: { source: WorkflowVersionSource.PUBLISH },
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          note: true,
          definition: true,
        },
      },
    },
  },
} satisfies Prisma.AppSelect

@Injectable()
export class AppApiRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedApp(ownerId: string, appId: string) {
    return this.prisma.app.findFirst({
      where: { id: appId, ownerId, deletedAt: null },
      select: appApiIdentitySelect,
    })
  }

  findApp(appId: string) {
    return this.prisma.app.findFirst({
      where: { id: appId, deletedAt: null },
      select: appApiIdentitySelect,
    })
  }

  findPublicSharedApp(shareToken: string) {
    return this.prisma.app.findFirst({
      where: {
        apiShareEnabled: true,
        apiShareToken: shareToken,
        deletedAt: null,
      },
      select: appApiIdentitySelect,
    })
  }

  updateShare(ownerId: string, appId: string, enabled: boolean, shareToken?: string) {
    return this.prisma.$transaction(async (transaction) => {
      const app = await transaction.app.findFirst({
        where: { id: appId, ownerId, deletedAt: null },
        select: { id: true, apiShareToken: true },
      })
      if (!app) return null

      return transaction.app.update({
        where: { id: app.id },
        data: {
          apiShareEnabled: enabled,
          ...(enabled && !app.apiShareToken && shareToken ? { apiShareToken: shareToken } : {}),
        },
        select: appApiIdentitySelect,
      })
    })
  }

  listOwnedApiKeys(ownerId: string, appId: string) {
    return this.prisma.apiKey.findMany({
      where: {
        appId,
        revokedAt: null,
        app: { ownerId, deletedAt: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        prefix: true,
        suffix: true,
        createdAt: true,
        lastUsedAt: true,
      },
    })
  }

  createOwnedApiKey(options: CreateOwnedApiKeyOptions) {
    return this.prisma.$transaction(async (transaction) => {
      const app = await transaction.app.findFirst({
        where: {
          id: options.appId,
          ownerId: options.ownerId,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (!app) return null

      return transaction.apiKey.create({
        data: {
          appId: app.id,
          name: '应用 API 密钥',
          prefix: options.prefix,
          suffix: options.suffix,
          keyHash: options.keyHash,
          createdById: options.ownerId,
        },
        select: {
          id: true,
          prefix: true,
          suffix: true,
          createdAt: true,
          lastUsedAt: true,
        },
      })
    })
  }

  revokeOwnedApiKey(ownerId: string, appId: string, apiKeyId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const key = await transaction.apiKey.findFirst({
        where: {
          id: apiKeyId,
          appId,
          revokedAt: null,
          app: { ownerId, deletedAt: null },
        },
        select: { id: true },
      })
      if (!key) return false

      await transaction.apiKey.update({
        where: { id: key.id },
        data: { revokedAt: new Date() },
      })
      return true
    })
  }

  async authenticateApiKey(keyHash: string) {
    const now = new Date()
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        app: {
          deletedAt: null,
          workflow: { isNot: null },
        },
      },
      select: {
        id: true,
        app: {
          select: {
            id: true,
            ownerId: true,
            workflow: { select: { id: true } },
          },
        },
      },
    })
    if (!apiKey?.app.workflow) return null

    const updated = await this.prisma.apiKey.updateMany({
      where: {
        id: apiKey.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { lastUsedAt: now },
    })
    if (updated.count !== 1) return null

    return {
      appId: apiKey.app.id,
      apiKeyId: apiKey.id,
      ownerId: apiKey.app.ownerId,
      workflowId: apiKey.app.workflow.id,
    }
  }

  createApiCallLog(options: CreateApiCallLogOptions): Promise<void> {
    return this.prisma.apiCallLog
      .create({
        data: {
          appId: options.appId,
          apiKeyId: options.apiKeyId,
          runId: options.runId,
          requestId: options.requestId,
          method: options.method,
          path: options.path,
          statusCode: options.statusCode,
          durationMs: options.durationMs,
          clientIp: options.clientIp,
          userAgent: options.userAgent,
          errorCode: options.errorCode,
          errorMessage: options.errorMessage,
        },
      })
      .then(() => undefined)
  }

  findPublishedVersion(appId: string, versionId?: string) {
    if (versionId) {
      return this.prisma.workflowVersion.findFirst({
        where: {
          id: versionId,
          source: WorkflowVersionSource.PUBLISH,
          workflow: { appId, app: { deletedAt: null } },
        },
        select: {
          id: true,
          definition: true,
          workflow: {
            select: {
              id: true,
              appId: true,
              app: { select: { ownerId: true } },
            },
          },
        },
      })
    }

    return this.prisma.workflowVersion.findFirst({
      where: {
        source: WorkflowVersionSource.PUBLISH,
        deployments: {
          some: {
            workflow: { appId, app: { deletedAt: null } },
          },
        },
      },
      select: {
        id: true,
        definition: true,
        workflow: {
          select: {
            id: true,
            appId: true,
            app: { select: { ownerId: true } },
          },
        },
      },
    })
  }
}
