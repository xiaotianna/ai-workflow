import { CreateStudioAppDto, ListStudioAppsDto, UpdateStudioAppDto } from '@/dto/studio.dto'
import { Prisma } from '@/generated/prisma/client'
import { StudioAppRepository } from '@/repositories/studio-app.repository'
import type { StudioAppDslExport, StudioAppListVo, StudioAppVo } from '@/vo/studio.vo'
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

interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: unknown[]
  edges: unknown[]
  outputs: unknown[]
}

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
    }
    const definition = this.parseWorkflowDefinition(rawDefinition)
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

  async exportDsl(ownerId: string, appId: string): Promise<StudioAppDslExport> {
    const app = await this.studioAppRepository.findForExport(ownerId, appId)

    if (!app) {
      throw new NotFoundException('应用不存在')
    }

    const draft = app.workflow?.draft

    if (!draft) {
      throw new NotFoundException('应用还没有可导出的工作流草稿')
    }

    const definition = this.parseWorkflowDefinition(draft.definition)
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
          definition,
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

  private parseWorkflowDefinition(rawDefinition: unknown) {
    if (
      !this.isRecord(rawDefinition) ||
      typeof rawDefinition.id !== 'string' ||
      !rawDefinition.id ||
      typeof rawDefinition.name !== 'string' ||
      !rawDefinition.name ||
      (rawDefinition.description !== undefined && typeof rawDefinition.description !== 'string') ||
      !Array.isArray(rawDefinition.nodes) ||
      !Array.isArray(rawDefinition.edges) ||
      (rawDefinition.outputs !== undefined && !Array.isArray(rawDefinition.outputs))
    ) {
      throw new InternalServerErrorException('工作流草稿结构无效，无法导出')
    }

    return {
      id: rawDefinition.id,
      name: rawDefinition.name,
      ...(rawDefinition.description !== undefined
        ? { description: rawDefinition.description }
        : {}),
      nodes: rawDefinition.nodes,
      edges: rawDefinition.edges,
      outputs: rawDefinition.outputs ?? [],
    } satisfies WorkflowDefinition
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

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
