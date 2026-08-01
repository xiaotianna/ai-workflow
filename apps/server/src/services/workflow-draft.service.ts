import { SaveWorkflowDraftDto } from '@/dto/workflow-draft.dto'
import { Prisma } from '@/generated/prisma/client'
import { WorkflowDraftRepository } from '@/repositories/workflow-draft.repository'
import {
  maskWorkflowDefinitionSecrets,
  parseWorkflowDefinition,
  parseWorkflowLayout,
  restoreMaskedWorkflowDefinitionSecrets,
} from '@/utils/workflow-draft'
import type { WorkflowDraftVo } from '@/vo/workflow-draft.vo'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'

@Injectable()
export class WorkflowDraftService {
  constructor(private readonly workflowDraftRepository: WorkflowDraftRepository) {}

  async get(ownerId: string, appId: string): Promise<WorkflowDraftVo> {
    const app = await this.workflowDraftRepository.findOwned(ownerId, appId)
    const draft = app?.workflow?.draft

    if (!draft) {
      throw new NotFoundException('工作流草稿不存在')
    }

    return this.toVo(draft, true)
  }

  async save(ownerId: string, appId: string, dto: SaveWorkflowDraftDto): Promise<WorkflowDraftVo> {
    const submittedDefinition = parseWorkflowDefinition(dto.definition)
    if (!submittedDefinition) {
      throw new BadRequestException('工作流定义格式无效')
    }

    const layout = parseWorkflowLayout(dto.layout)
    if (!layout) {
      throw new BadRequestException('工作流布局格式无效')
    }

    const currentApp = await this.workflowDraftRepository.findOwned(ownerId, appId)
    const currentDraft = currentApp?.workflow?.draft

    if (!currentDraft) {
      throw new NotFoundException('工作流草稿不存在')
    }

    const persistedDefinition = parseWorkflowDefinition(currentDraft.definition)
    if (!persistedDefinition) {
      throw new InternalServerErrorException('工作流草稿结构无效')
    }

    const definition = restoreMaskedWorkflowDefinitionSecrets(
      submittedDefinition,
      persistedDefinition,
    )

    const result = await this.workflowDraftRepository.saveOwned({
      ownerId,
      appId,
      workflowId: definition.id,
      revision: dto.revision,
      definition: this.toJsonInput(definition),
      layout: this.toJsonInput(layout),
    })

    if (result.status === 'not-found') {
      throw new NotFoundException('工作流草稿不存在')
    }

    if (result.status === 'workflow-mismatch') {
      throw new BadRequestException('工作流 ID 与当前应用不匹配')
    }

    if (result.status === 'conflict') {
      throw new ConflictException('工作流已在其他位置更新，请刷新后重试')
    }

    return this.toVo(result.draft)
  }

  private toVo(
    draft: {
      schemaVersion: number
      revision: number
      definition: unknown
      layout: unknown
      updatedAt: Date
    },
    internalError = false,
  ): WorkflowDraftVo {
    const definition = parseWorkflowDefinition(draft.definition)
    const layout = parseWorkflowLayout(draft.layout)

    if (!definition || !layout) {
      if (internalError) {
        throw new InternalServerErrorException('工作流草稿结构无效')
      }

      throw new InternalServerErrorException('保存后的工作流草稿结构无效')
    }

    return {
      schemaVersion: draft.schemaVersion,
      revision: draft.revision,
      definition: maskWorkflowDefinitionSecrets(definition),
      layout,
      updatedAt: draft.updatedAt,
    }
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    return structuredClone(value) as Prisma.InputJsonValue
  }
}
