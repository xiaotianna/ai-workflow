import {
  CreateStudioAppDto,
  ImportStudioAppDslDto,
  ListStudioAppsDto,
  UpdateStudioAppDto,
} from '@/dto/studio.dto'
import { Prisma } from '@/generated/prisma/client'
import { StudioAppRepository } from '@/repositories/studio-app.repository'
import {
  parseWorkflowDefinition,
  parseWorkflowLayout,
  redactWorkflowDefinitionSecrets,
  type WorkflowLayout,
} from '@/utils/workflow-draft'
import type { StudioAppDslExport, StudioAppListVo, StudioAppVo } from '@/vo/studio.vo'
import { nodeRegistry, validateWorkflow, type Workflow } from '@ai-workflow/core'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { isUUID } from 'class-validator'
import { randomUUID } from 'node:crypto'

interface DecodedCursor {
  id: string
  value: Date
}

const STUDIO_APP_TITLE_MAX_LENGTH = 40
const DEFAULT_STUDIO_APP_ICON = '🤖'

@Injectable()
export class StudioAppService {
  constructor(private readonly studioAppRepository: StudioAppRepository) {}

  async list(ownerId: string, query: ListStudioAppsDto): Promise<StudioAppListVo> {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined
    const apps = await this.studioAppRepository.list({
      ownerId,
      limit: query.limit,
      search: query.search || undefined,
      sort: query.sort,
      cursor,
      publishedOnly: query.publishedOnly,
    })
    const hasMore = apps.length > query.limit
    const page = hasMore ? apps.slice(0, query.limit) : apps
    const lastApp = page.at(-1)

    return {
      items: page.map((app) => this.toVo(app)),
      nextCursor:
        hasMore && lastApp
          ? this.encodeCursor({
              id: lastApp.id,
              value: query.sort === 'updated_desc' ? lastApp.updatedAt : lastApp.createdAt,
            })
          : null,
    }
  }

  async getById(ownerId: string, appId: string): Promise<StudioAppVo> {
    const app = await this.studioAppRepository.findById(ownerId, appId)

    if (!app) {
      throw new NotFoundException('应用不存在')
    }

    return this.toVo(app)
  }

  async create(ownerId: string, dto: CreateStudioAppDto): Promise<StudioAppVo> {
    const appId = randomUUID()
    const workflowId = randomUUID()
    const rawDefinition = {
      id: workflowId,
      name: dto.title,
      ...(dto.description ? { description: dto.description } : {}),
      nodes: [],
      edges: [],
      outputs: [],
      environmentVariables: [],
    }
    const definition = this.parseWorkflowDefinition(rawDefinition, '初始化工作流草稿结构无效', true)
    const app = await this.studioAppRepository.create({
      appId,
      workflowId,
      ownerId,
      title: dto.title,
      description: dto.description || undefined,
      icon: dto.icon,
      definition: this.toJsonInput(definition),
      layout: {
        positions: {},
      },
    })

    return this.toVo(app)
  }

  async importDsl(ownerId: string, dto: ImportStudioAppDslDto): Promise<StudioAppVo> {
    const appId = randomUUID()
    const workflowId = randomUUID()
    const importedDefinition = this.parseWorkflowDefinition(
      dto.workflow.definition,
      'DSL 工作流定义格式无效',
    )
    const definition = {
      ...importedDefinition,
      id: workflowId,
    }
    const layout = this.parseWorkflowLayout(dto.workflow.layout)
    const app = await this.studioAppRepository.create({
      appId,
      workflowId,
      ownerId,
      title: dto.app.title,
      description: dto.app.description || undefined,
      icon: dto.app.icon || DEFAULT_STUDIO_APP_ICON,
      schemaVersion: dto.workflow.schemaVersion,
      definition: this.toJsonInput(definition),
      layout: this.toJsonInput(layout),
    })

    return this.toVo(app)
  }

  async duplicate(ownerId: string, appId: string): Promise<StudioAppVo> {
    const sourceApp = await this.studioAppRepository.findForDuplicate(ownerId, appId)

    if (!sourceApp) {
      throw new NotFoundException('应用不存在')
    }

    const sourceDraft = sourceApp.workflow?.draft

    if (!sourceDraft) {
      throw new NotFoundException('应用还没有可复制的工作流草稿')
    }

    const existingNames = await this.studioAppRepository.listNames(ownerId)
    const duplicateTitle = this.createDuplicateTitle(
      sourceApp.name,
      new Set(existingNames.map(({ name }) => name)),
    )
    const workflowId = randomUUID()
    const sourceDefinition = this.parseWorkflowDefinition(
      sourceDraft.definition,
      '工作流草稿结构无效，无法复制',
      true,
    )
    const definition = {
      ...sourceDefinition,
      id: workflowId,
      name: duplicateTitle,
    }
    const layout = this.parseWorkflowLayout(sourceDraft.layout, true)
    const app = await this.studioAppRepository.create({
      appId: randomUUID(),
      workflowId,
      ownerId,
      title: duplicateTitle,
      description: sourceApp.description || undefined,
      icon: sourceApp.icon || DEFAULT_STUDIO_APP_ICON,
      schemaVersion: sourceDraft.schemaVersion,
      definition: this.toJsonInput(definition),
      layout: this.toJsonInput(layout),
    })

    return this.toVo(app)
  }

  async update(ownerId: string, appId: string, dto: UpdateStudioAppDto): Promise<StudioAppVo> {
    if (dto.title === undefined && dto.description === undefined && dto.icon === undefined) {
      throw new BadRequestException('至少需要提供一个待修改字段')
    }

    const existingApp = await this.studioAppRepository.findById(ownerId, appId)

    if (!existingApp) {
      throw new NotFoundException('应用不存在')
    }

    const app = await this.studioAppRepository.update(appId, {
      title: dto.title,
      description: dto.description === undefined ? undefined : dto.description || null,
      icon: dto.icon,
    })

    return this.toVo(app)
  }

  async remove(ownerId: string, appId: string): Promise<void> {
    const deleted = await this.studioAppRepository.deleteOwnedAppGraph(ownerId, appId)

    if (!deleted) {
      throw new NotFoundException('应用不存在')
    }
  }

  async exportDsl(ownerId: string, appId: string): Promise<StudioAppDslExport> {
    const app = await this.studioAppRepository.findForExport(ownerId, appId)

    if (!app) {
      throw new NotFoundException('应用不存在')
    }

    const draft = app.workflow?.draft

    if (!draft) {
      throw new NotFoundException('应用还没有可导出的工作流草稿')
    }

    const definition = this.parseWorkflowDefinition(
      draft.definition,
      '工作流草稿结构无效，无法导出',
      true,
    )
    const content = JSON.stringify(
      {
        dslVersion: 1,
        app: {
          id: app.id,
          title: app.name,
          description: app.description,
          icon: app.icon,
        },
        workflow: {
          schemaVersion: draft.schemaVersion,
          revision: draft.revision,
          definition: redactWorkflowDefinitionSecrets(definition),
          layout: draft.layout,
        },
      },
      null,
      2,
    )

    return {
      content: `${content}\n`,
      filename: `${this.sanitizeFilename(app.name)}.json`,
    }
  }

  private parseWorkflowDefinition(
    rawDefinition: unknown,
    errorMessage: string,
    internalError = false,
  ): Workflow {
    const definition =
      parseWorkflowDefinition(rawDefinition) ?? this.throwInvalidDsl(errorMessage, internalError)
    const issues = validateWorkflow(definition, nodeRegistry)
    if (issues.length > 0) {
      this.throwInvalidDsl(issues[0]?.message ?? errorMessage, internalError)
    }
    return definition
  }

  private parseWorkflowLayout(rawLayout: unknown, internalError = false): WorkflowLayout {
    return (
      parseWorkflowLayout(rawLayout) ??
      this.throwInvalidDsl('DSL 工作流布局格式无效', internalError)
    )
  }

  private createDuplicateTitle(sourceTitle: string, existingTitles: ReadonlySet<string>): string {
    const baseTitle = sourceTitle.replace(/-副本(?:\d+)?$/, '').trim() || '应用'

    for (let duplicateNumber = 1; ; duplicateNumber += 1) {
      const suffix = duplicateNumber === 1 ? '-副本' : `-副本${duplicateNumber}`
      const candidate = `${baseTitle.slice(0, STUDIO_APP_TITLE_MAX_LENGTH - suffix.length).trimEnd()}${suffix}`

      if (!existingTitles.has(candidate)) {
        return candidate
      }
    }
  }

  private throwInvalidDsl(message: string, internalError: boolean): never {
    if (internalError) {
      throw new InternalServerErrorException(message)
    }

    throw new BadRequestException(message)
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    return structuredClone(value) as Prisma.InputJsonValue
  }

  private toVo(app: {
    id: string
    name: string
    description: string | null
    icon: string | null
    createdAt: Date
    updatedAt: Date
    owner: {
      username: string
    }
  }): StudioAppVo {
    return {
      id: app.id,
      title: app.name,
      author: app.owner.username,
      ...(app.description ? { description: app.description } : {}),
      ...(app.icon ? { icon: app.icon } : {}),
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }
  }

  private encodeCursor(cursor: DecodedCursor): string {
    return Buffer.from(
      JSON.stringify({
        id: cursor.id,
        value: cursor.value.toISOString(),
      }),
    ).toString('base64url')
  }

  private decodeCursor(cursor: string): DecodedCursor {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        id?: unknown
        value?: unknown
      }
      const value =
        typeof parsed.value === 'string' && parsed.value ? new Date(parsed.value) : undefined

      if (
        typeof parsed.id !== 'string' ||
        !isUUID(parsed.id, '4') ||
        !value ||
        Number.isNaN(value.getTime())
      ) {
        throw new Error('Invalid cursor')
      }

      return {
        id: parsed.id,
        value,
      }
    } catch {
      throw new BadRequestException('分页游标无效')
    }
  }

  private sanitizeFilename(name: string): string {
    const invalidCharacters = String.raw`<>:"/\|?*`
    const sanitized = [...name]
      .map((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint < 32 || invalidCharacters.includes(character) ? '-' : character
      })
      .join('')
      .trim()

    return sanitized || 'workflow'
  }
}
