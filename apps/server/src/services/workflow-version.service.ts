import { RenameWorkflowVersionDto } from '@/dto/workflow-version.dto'
import { WorkflowVersionRepository } from '@/repositories/workflow-version.repository'
import {
  maskWorkflowDefinitionSecrets,
  parseWorkflowDefinition,
  parseWorkflowLayout,
} from '@/utils/workflow-draft'
import type { WorkflowDraftVo } from '@/vo/workflow-draft.vo'
import type { WorkflowVersionListItemVo, WorkflowVersionListVo } from '@/vo/workflow-version.vo'
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'

@Injectable()
export class WorkflowVersionService {
  constructor(private readonly workflowVersionRepository: WorkflowVersionRepository) {}

  async list(ownerId: string, appId: string): Promise<WorkflowVersionListVo> {
    const app = await this.workflowVersionRepository.listOwned(ownerId, appId)
    if (!app?.workflow) throw new NotFoundException('应用不存在')

    return {
      items: app.workflow.versions.map((version) => this.toListItemVo(version)),
    }
  }

  async restore(ownerId: string, appId: string, versionId: string): Promise<WorkflowDraftVo> {
    const result = await this.workflowVersionRepository.restoreOwned({
      ownerId,
      appId,
      versionId,
    })
    if (result.status === 'not-found') throw new NotFoundException('工作流版本不存在')

    const definition = parseWorkflowDefinition(result.draft.definition)
    const layout = parseWorkflowLayout(result.draft.layout)
    if (!definition || !layout) {
      throw new InternalServerErrorException('工作流版本快照结构无效')
    }

    return {
      schemaVersion: result.draft.schemaVersion,
      revision: result.draft.revision,
      definition: maskWorkflowDefinitionSecrets(definition),
      layout,
      updatedAt: result.draft.updatedAt,
    }
  }

  async rename(
    ownerId: string,
    appId: string,
    versionId: string,
    dto: RenameWorkflowVersionDto,
  ): Promise<WorkflowVersionListItemVo> {
    const result = await this.workflowVersionRepository.renameOwned({
      ownerId,
      appId,
      versionId,
      name: dto.name,
    })
    if (result.status === 'not-found') throw new NotFoundException('工作流版本不存在')

    return this.toListItemVo(result.version)
  }

  async remove(ownerId: string, appId: string, versionId: string): Promise<void> {
    const result = await this.workflowVersionRepository.deleteOwned({
      ownerId,
      appId,
      versionId,
    })
    if (result.status === 'not-found') throw new NotFoundException('工作流版本不存在')
    if (result.status === 'in-use') {
      throw new ConflictException('该版本正被当前部署或运行记录使用，无法删除')
    }
  }

  private toListItemVo(version: {
    id: string
    version: number
    note: string | null
    createdAt: Date
    createdBy: {
      id: string
      username: string
    } | null
  }): WorkflowVersionListItemVo {
    const name = version.note && version.note !== '发布更新' ? version.note : undefined

    return {
      id: version.id,
      version: version.version,
      ...(name ? { name } : {}),
      createdAt: version.createdAt,
      ...(version.createdBy ? { createdBy: version.createdBy } : {}),
    }
  }
}
