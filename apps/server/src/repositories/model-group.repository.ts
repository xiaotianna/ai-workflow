import { ModelType, Prisma } from '@/generated/prisma/client'
import type { EncryptedModelCredential } from '@/infra/model-provider/model-credential.service'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

const modelGroupSelect = {
  id: true,
  modelType: true,
  name: true,
  providerType: true,
  baseUrl: true,
  enabled: true,
  apiKeyCiphertext: true,
  apiKeyIv: true,
  apiKeyAuthTag: true,
  credentialKeyVersion: true,
  createdAt: true,
  updatedAt: true,
  models: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      modelId: true,
      displayName: true,
      enabled: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.ModelGroupSelect

export type ModelGroupRecord = Prisma.ModelGroupGetPayload<{
  select: typeof modelGroupSelect
}>

interface ConfiguredModelWriteInput {
  id?: string
  modelId: string
  normalizedModelId: string
  displayName?: string
  enabled: boolean
  sortOrder: number
}

interface CreateModelGroupInput {
  id: string
  ownerId: string
  modelType: ModelType
  name: string
  providerType: string
  baseUrl?: string
  credential?: EncryptedModelCredential
  models: ConfiguredModelWriteInput[]
}

interface UpdateModelGroupInput {
  name: string
  providerType: string
  baseUrl?: string
  credential?: EncryptedModelCredential | null
  models: ConfiguredModelWriteInput[]
}

@Injectable()
export class ModelGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerId: string, modelType?: ModelType): Promise<ModelGroupRecord[]> {
    return this.prisma.modelGroup.findMany({
      where: {
        ownerId,
        modelType,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: modelGroupSelect,
    })
  }

  findById(ownerId: string, groupId: string): Promise<ModelGroupRecord | null> {
    return this.prisma.modelGroup.findFirst({
      where: {
        id: groupId,
        ownerId,
      },
      select: modelGroupSelect,
    })
  }

  findCredential(ownerId: string, groupId: string) {
    return this.prisma.modelGroup.findFirst({
      where: {
        id: groupId,
        ownerId,
      },
      select: {
        id: true,
        providerType: true,
        apiKeyCiphertext: true,
        apiKeyIv: true,
        apiKeyAuthTag: true,
        credentialKeyVersion: true,
      },
    })
  }

  create(input: CreateModelGroupInput): Promise<ModelGroupRecord> {
    return this.prisma.modelGroup.create({
      data: {
        id: input.id,
        owner: {
          connect: {
            id: input.ownerId,
          },
        },
        modelType: input.modelType,
        name: input.name,
        providerType: input.providerType,
        baseUrl: input.baseUrl,
        ...(input.credential
          ? {
              apiKeyCiphertext: input.credential.ciphertext,
              apiKeyIv: input.credential.iv,
              apiKeyAuthTag: input.credential.authTag,
              credentialKeyVersion: input.credential.keyVersion,
            }
          : {}),
        models: {
          create: input.models.map((model) => ({
            modelId: model.modelId,
            normalizedModelId: model.normalizedModelId,
            displayName: model.displayName,
            enabled: model.enabled,
            sortOrder: model.sortOrder,
          })),
        },
      },
      select: modelGroupSelect,
    })
  }

  updateGraph(
    ownerId: string,
    groupId: string,
    input: UpdateModelGroupInput,
  ): Promise<ModelGroupRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existingGroup = await transaction.modelGroup.findFirst({
        where: {
          id: groupId,
          ownerId,
        },
        select: {
          id: true,
          models: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!existingGroup) return null

      const existingModelIds = new Set(existingGroup.models.map(({ id }) => id))
      const retainedModelIds = input.models.flatMap(({ id }) => (id ? [id] : []))

      if (retainedModelIds.some((modelId) => !existingModelIds.has(modelId))) {
        throw new Error('模型配置不属于当前模型组')
      }

      await transaction.modelGroup.update({
        where: { id: groupId },
        data: {
          name: input.name,
          providerType: input.providerType,
          baseUrl: input.baseUrl ?? null,
          ...createCredentialUpdate(input.credential),
        },
      })

      await transaction.configuredModel.deleteMany({
        where: {
          groupId,
          ...(retainedModelIds.length > 0 ? { id: { notIn: retainedModelIds } } : {}),
        },
      })

      await Promise.all(
        retainedModelIds.map((modelId) =>
          transaction.configuredModel.update({
            where: { id: modelId },
            data: {
              normalizedModelId: `__updating__:${modelId}`,
            },
          }),
        ),
      )

      await Promise.all(
        input.models.map((model) =>
          model.id
            ? transaction.configuredModel.update({
                where: { id: model.id },
                data: {
                  modelId: model.modelId,
                  normalizedModelId: model.normalizedModelId,
                  displayName: model.displayName ?? null,
                  enabled: model.enabled,
                  sortOrder: model.sortOrder,
                },
              })
            : transaction.configuredModel.create({
                data: {
                  groupId,
                  modelId: model.modelId,
                  normalizedModelId: model.normalizedModelId,
                  displayName: model.displayName,
                  enabled: model.enabled,
                  sortOrder: model.sortOrder,
                },
              }),
        ),
      )

      return transaction.modelGroup.findUniqueOrThrow({
        where: { id: groupId },
        select: modelGroupSelect,
      })
    })
  }

  async updateGroupEnabled(ownerId: string, groupId: string, enabled: boolean): Promise<boolean> {
    const result = await this.prisma.modelGroup.updateMany({
      where: {
        id: groupId,
        ownerId,
      },
      data: { enabled },
    })

    return result.count === 1
  }

  async updateModelEnabled(
    ownerId: string,
    groupId: string,
    modelId: string,
    enabled: boolean,
  ): Promise<boolean> {
    const model = await this.prisma.configuredModel.findFirst({
      where: {
        id: modelId,
        groupId,
        group: {
          ownerId,
        },
      },
      select: { id: true },
    })

    if (!model) return false

    await this.prisma.configuredModel.update({
      where: { id: model.id },
      data: { enabled },
    })

    return true
  }

  async delete(ownerId: string, groupId: string): Promise<boolean> {
    const result = await this.prisma.modelGroup.deleteMany({
      where: {
        id: groupId,
        ownerId,
      },
    })

    return result.count === 1
  }
}

function createCredentialUpdate(credential?: EncryptedModelCredential | null) {
  if (credential === undefined) return {}

  if (credential === null) {
    return {
      apiKeyCiphertext: null,
      apiKeyIv: null,
      apiKeyAuthTag: null,
      credentialKeyVersion: null,
    }
  }

  return {
    apiKeyCiphertext: credential.ciphertext,
    apiKeyIv: credential.iv,
    apiKeyAuthTag: credential.authTag,
    credentialKeyVersion: credential.keyVersion,
  }
}
