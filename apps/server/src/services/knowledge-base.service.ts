import {
  CreateKnowledgeBaseDto,
  ListKnowledgeBasesDto,
  UpdateKnowledgeBaseDto,
} from '@/dto/knowledge-base.dto'
import {
  KnowledgeBaseRepository,
  type KnowledgeBaseRecord,
} from '@/repositories/knowledge-base.repository'
import type { KnowledgeBaseListVo, KnowledgeBaseVo } from '@/vo/knowledge-base.vo'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly knowledgeBaseRepository: KnowledgeBaseRepository) {}

  async list(ownerId: string, query: ListKnowledgeBasesDto): Promise<KnowledgeBaseListVo> {
    const knowledgeBases = await this.knowledgeBaseRepository.list({
      ownerId,
      search: query.search || undefined,
      sort: query.sort,
    })

    return {
      items: knowledgeBases.map((knowledgeBase) => this.toVo(knowledgeBase)),
    }
  }

  async getById(ownerId: string, knowledgeBaseId: string): Promise<KnowledgeBaseVo> {
    const knowledgeBase = await this.knowledgeBaseRepository.findById(ownerId, knowledgeBaseId)

    if (!knowledgeBase) {
      throw new NotFoundException('知识库不存在')
    }

    return this.toVo(knowledgeBase)
  }

  async create(ownerId: string, dto: CreateKnowledgeBaseDto): Promise<KnowledgeBaseVo> {
    const knowledgeBase = await this.knowledgeBaseRepository.create({
      ownerId,
      title: dto.title,
      description: dto.description || undefined,
      icon: dto.icon,
    })

    return this.toVo(knowledgeBase)
  }

  async update(
    ownerId: string,
    knowledgeBaseId: string,
    dto: UpdateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseVo> {
    if (dto.title === undefined && dto.description === undefined && dto.icon === undefined) {
      throw new BadRequestException('至少需要提供一个待修改字段')
    }

    const existingKnowledgeBase = await this.knowledgeBaseRepository.findById(
      ownerId,
      knowledgeBaseId,
    )

    if (!existingKnowledgeBase) {
      throw new NotFoundException('知识库不存在')
    }

    const knowledgeBase = await this.knowledgeBaseRepository.update(knowledgeBaseId, {
      title: dto.title,
      description: dto.description === undefined ? undefined : dto.description || null,
      icon: dto.icon,
    })

    return this.toVo(knowledgeBase)
  }

  async remove(ownerId: string, knowledgeBaseId: string): Promise<void> {
    const existingKnowledgeBase = await this.knowledgeBaseRepository.findById(
      ownerId,
      knowledgeBaseId,
    )

    if (!existingKnowledgeBase) {
      throw new NotFoundException('知识库不存在')
    }

    if (await this.knowledgeBaseRepository.hasOwnedWorkflowReference(ownerId, knowledgeBaseId)) {
      throw new ConflictException('知识库正在被工作流使用，无法删除')
    }

    const removed = await this.knowledgeBaseRepository.remove(ownerId, knowledgeBaseId)

    if (!removed) {
      throw new NotFoundException('知识库不存在')
    }
  }

  private toVo(knowledgeBase: KnowledgeBaseRecord): KnowledgeBaseVo {
    return {
      id: knowledgeBase.id,
      title: knowledgeBase.name,
      author: knowledgeBase.owner.username,
      ...(knowledgeBase.description ? { description: knowledgeBase.description } : {}),
      ...(knowledgeBase.icon ? { icon: knowledgeBase.icon } : {}),
      createdAt: knowledgeBase.createdAt,
      updatedAt: knowledgeBase.updatedAt,
    }
  }
}
