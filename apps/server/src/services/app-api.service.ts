import type { AppApiAuthContext } from '@/common/interfaces/app-api-auth-context.interface'
import {
  BuiltinNodeType,
  ENVIRONMENT_VARIABLE_TYPES,
  SYSTEM_VARIABLE_DEFINITIONS,
  type NodeOutputDefinition,
} from '@ai-workflow/core'
import { AppApiRepository } from '@/repositories/app-api.repository'
import { parseWorkflowDefinition } from '@/utils/workflow-draft'
import type {
  AppApiInfoVo,
  AppApiInputVariableVo,
  AppApiKeyVo,
  AppApiOverviewVo,
  AppApiParametersVo,
  AppApiVersionInputContractVo,
  CreatedAppApiKeyVo,
  PublicAppApiDocsVo,
} from '@/vo/app-api.vo'
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'

const API_KEY_PREFIX = 'app-',
  API_KEY_MASK_LENGTH = 20

@Injectable()
export class AppApiService {
  constructor(private readonly appApiRepository: AppApiRepository) {}

  async getOverview(ownerId: string, appId: string): Promise<AppApiOverviewVo> {
    const app = await this.appApiRepository.findOwnedApp(ownerId, appId)
    if (!app?.workflow) throw new NotFoundException('应用不存在')
    return toOverviewVo(app)
  }

  async updateShare(ownerId: string, appId: string, enabled: boolean): Promise<AppApiOverviewVo> {
    const app = await this.appApiRepository.updateShare(
      ownerId,
      appId,
      enabled,
      randomBytes(24).toString('base64url'),
    )
    if (!app?.workflow) throw new NotFoundException('应用不存在')
    return toOverviewVo(app)
  }

  async getPublicDocs(shareToken: string): Promise<PublicAppApiDocsVo> {
    const app = await this.appApiRepository.findPublicSharedApp(shareToken.trim())
    if (!app?.workflow) throw new NotFoundException('分享链接不存在或已关闭')

    return {
      appId: app.id,
      title: app.name,
      author: app.owner.username,
      ...(app.description ? { description: app.description } : {}),
      ...(app.icon ? { icon: app.icon } : {}),
      status: app.workflow.deployments.length > 0 ? 'RUNNING' : 'UNPUBLISHED',
      ...toInputContractVo(app.workflow),
    }
  }

  async listKeys(ownerId: string, appId: string): Promise<AppApiKeyVo[]> {
    const app = await this.appApiRepository.findOwnedApp(ownerId, appId)
    if (!app) throw new NotFoundException('应用不存在')

    const keys = await this.appApiRepository.listOwnedApiKeys(ownerId, appId)
    return keys.map(toApiKeyVo)
  }

  async createKey(ownerId: string, appId: string): Promise<CreatedAppApiKeyVo> {
    const secret = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`,
      suffix = secret.slice(-5),
      key = await this.appApiRepository.createOwnedApiKey({
        ownerId,
        appId,
        prefix: API_KEY_PREFIX,
        suffix,
        keyHash: hashApiKey(secret),
      })
    if (!key) throw new NotFoundException('应用不存在')

    return {
      ...toApiKeyVo(key),
      key: secret,
    }
  }

  async revokeKey(ownerId: string, appId: string, apiKeyId: string): Promise<void> {
    const revoked = await this.appApiRepository.revokeOwnedApiKey(ownerId, appId, apiKeyId)
    if (!revoked) throw new NotFoundException('API 密钥不存在')
  }

  async authenticate(rawKey: string): Promise<AppApiAuthContext> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      throw new UnauthorizedException('API 密钥无效')
    }

    const context = await this.appApiRepository.authenticateApiKey(hashApiKey(rawKey))
    if (!context) throw new UnauthorizedException('API 密钥无效或已失效')
    return context
  }

  async getInfo(appId: string): Promise<AppApiInfoVo> {
    const app = await this.appApiRepository.findApp(appId)
    if (!app) throw new NotFoundException('应用不存在')

    return {
      id: app.id,
      name: app.name,
      author: app.owner.username,
      ...(app.description ? { description: app.description } : {}),
      ...(app.icon ? { icon: app.icon } : {}),
    }
  }

  async getParameters(appId: string): Promise<AppApiParametersVo> {
    const app = await this.appApiRepository.findApp(appId)
    if (!app?.workflow) throw new NotFoundException('应用不存在')

    const rawDefinition =
        app.workflow.deployments[0]?.version.definition ?? app.workflow.draft?.definition,
      definition = parseWorkflowDefinition(rawDefinition)
    if (!definition) {
      throw new InternalServerErrorException('工作流参数定义格式无效')
    }

    return {
      systemVariables: SYSTEM_VARIABLE_DEFINITIONS.map((variable) => ({
        key: variable.key,
        name: `sys.${variable.key}`,
        dataType: variable.dataType,
        description: variable.description,
      })),
      environmentVariables: definition.environmentVariables.map((variable) => ({
        id: variable.id,
        name: variable.name,
        type: variable.type,
        ...(variable.description ? { description: variable.description } : {}),
        sensitive: variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET,
        ...(variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET ? {} : { value: variable.value }),
      })),
    }
  }
}

function hashApiKey(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function maskApiKey(prefix: string, suffix: string | null): string {
  return `${prefix}${'*'.repeat(API_KEY_MASK_LENGTH)}${suffix ?? ''}`
}

function toApiKeyVo(key: {
  id: string
  prefix: string
  suffix: string | null
  createdAt: Date
  lastUsedAt: Date | null
}): AppApiKeyVo {
  return {
    id: key.id,
    maskedKey: maskApiKey(key.prefix, key.suffix),
    createdAt: key.createdAt,
    ...(key.lastUsedAt ? { lastUsedAt: key.lastUsedAt } : {}),
  }
}

function toOverviewVo(app: {
  id: string
  apiShareEnabled: boolean
  apiShareToken: string | null
  workflow: {
    deployments: readonly { version: { id: string } }[]
    versions: readonly {
      id: string
      version: number
      note: string | null
      definition: unknown
    }[]
  } | null
}): AppApiOverviewVo {
  return {
    appId: app.id,
    status: app.workflow?.deployments.length ? 'RUNNING' : 'UNPUBLISHED',
    shareEnabled: app.apiShareEnabled,
    ...(app.apiShareEnabled && app.apiShareToken ? { shareToken: app.apiShareToken } : {}),
    ...(app.workflow ? toInputContractVo(app.workflow) : { versions: [] }),
  }
}

function toInputContractVo(workflow: {
  deployments: readonly { version: { id: string } }[]
  versions: readonly {
    id: string
    version: number
    note: string | null
    definition: unknown
  }[]
}): {
  currentVersionId?: string
  versions: AppApiVersionInputContractVo[]
} {
  const currentVersionId = workflow.deployments[0]?.version.id

  return {
    ...(currentVersionId ? { currentVersionId } : {}),
    versions: workflow.versions.map((version) => {
      const definition = parseWorkflowDefinition(version.definition)
      if (!definition) {
        throw new InternalServerErrorException('发布版本工作流定义格式无效')
      }
      const startNode = definition.nodes.find(
        (node) => node.type === BuiltinNodeType.START && !node.parentId,
      )
      if (!startNode) {
        throw new InternalServerErrorException('发布版本缺少开始节点')
      }

      return {
        versionId: version.id,
        version: version.version,
        ...(version.note && version.note !== '发布更新' ? { name: version.note } : {}),
        inputVariables: startNode.outputs.map(toInputVariableVo),
      }
    }),
  }
}

function toInputVariableVo(variable: NodeOutputDefinition): AppApiInputVariableVo {
  return {
    key: variable.key,
    label: variable.label,
    dataType: variable.dataType,
    required: variable.required === true,
    ...(variable.description ? { description: variable.description } : {}),
    ...(variable.defaultValue !== undefined ? { defaultValue: variable.defaultValue } : {}),
  }
}
