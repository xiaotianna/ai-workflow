import { PublishWorkflowDto } from '@/dto/workflow-deployment.dto'
import { Prisma } from '@/generated/prisma/client'
import { WorkflowDeploymentRepository } from '@/repositories/workflow-deployment.repository'
import { WorkflowDraftRepository } from '@/repositories/workflow-draft.repository'
import {
  parseWorkflowDefinition,
  parseWorkflowLayout,
  restoreMaskedWorkflowDefinitionSecrets,
} from '@/utils/workflow-draft'
import type { StudioSubWorkflowContractVo } from '@/vo/workflow-deployment-contract.vo'
import type { WorkflowDeploymentVo } from '@/vo/workflow-deployment.vo'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { BuiltinNodeType, validateExecutorWorkflow, workflowSchema } from '@ai-workflow/core'
import {
  assertWorkflowExecutable,
  WorkflowCatalogResolver,
} from '@/workflow-catalog/workflow-server-catalog'

@Injectable()
export class WorkflowDeploymentService {
  constructor(
    private readonly workflowDraftRepository: WorkflowDraftRepository,
    private readonly workflowDeploymentRepository: WorkflowDeploymentRepository,
    private readonly workflowCatalogResolver: WorkflowCatalogResolver,
  ) {}

  async getCurrent(ownerId: string, appId: string): Promise<WorkflowDeploymentVo | null> {
    const app = await this.workflowDeploymentRepository.findOwned(ownerId, appId)
    if (!app?.workflow) throw new NotFoundException('应用不存在')

    const deployment = app.workflow.deployments[0]
    if (!deployment) return null

    return {
      versionId: deployment.version.id,
      version: deployment.version.version,
      publishedAt: deployment.version.createdAt,
    }
  }

  async getPublishedContract(ownerId: string, appId: string): Promise<StudioSubWorkflowContractVo> {
    const app = await this.workflowDeploymentRepository.findOwnedPublishedContract(ownerId, appId)
    if (!app?.workflow) throw new NotFoundException('应用不存在')

    const deployment = app.workflow.deployments[0]
    if (!deployment) {
      throw new BadRequestException('工作流尚未发布，无法作为子工作流')
    }

    const definition = parseWorkflowDefinition(deployment.version.definition)
    if (!definition) {
      throw new InternalServerErrorException('已发布工作流定义无效')
    }

    const startNode = definition.nodes.find((node) => node.type === BuiltinNodeType.START)
    if (!startNode) {
      throw new BadRequestException('已发布工作流缺少开始节点，无法作为子工作流')
    }

    return {
      workflowId: app.workflow.id,
      versionId: deployment.version.id,
      version: deployment.version.version,
      publishedAt: deployment.version.createdAt,
      inputVariables: startNode.outputs,
      outputVariables: definition.outputs.map((output) => ({
        key: output.key,
        label: output.label,
        dataType: output.dataType,
        ...(output.description ? { description: output.description } : {}),
      })),
    }
  }

  async publish(
    ownerId: string,
    appId: string,
    dto: PublishWorkflowDto,
  ): Promise<WorkflowDeploymentVo> {
    const submittedDefinition = parseWorkflowDefinition(dto.definition)
    const layout = parseWorkflowLayout(dto.layout)
    if (!submittedDefinition || !layout) {
      throw new BadRequestException('发布快照格式无效')
    }

    const app = await this.workflowDraftRepository.findOwned(ownerId, appId)
    const draft = app?.workflow?.draft
    const persistedDefinition = parseWorkflowDefinition(draft?.definition)
    if (!app?.workflow || !draft || !persistedDefinition) {
      throw new NotFoundException('工作流草稿不存在')
    }
    if (submittedDefinition.id !== app.workflow.id) {
      throw new BadRequestException('工作流 ID 与当前应用不匹配')
    }

    const restoredDefinition = restoreMaskedWorkflowDefinitionSecrets(
      submittedDefinition,
      persistedDefinition,
    )
    const parsed = workflowSchema.safeParse(restoredDefinition)
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? '工作流定义格式无效')
    }

    const catalog = await this.workflowCatalogResolver.resolveForWorkflow(ownerId, parsed.data)
    const issues = validateExecutorWorkflow(parsed.data, catalog.nodeRegistry)
    if (issues.length > 0) {
      throw new BadRequestException(issues[0]?.message ?? '工作流暂时无法发布')
    }
    assertWorkflowExecutable(parsed.data, catalog)

    const result = await this.workflowDeploymentRepository.publishOwned({
      ownerId,
      appId,
      workflowId: parsed.data.id,
      schemaVersion: draft.schemaVersion,
      definition: this.toJsonInput(parsed.data),
      layout: this.toJsonInput(layout),
      pluginDependencies: catalog.pluginDependencies,
    })

    if (result.status === 'not-found') {
      throw new NotFoundException('工作流草稿不存在')
    }
    if (result.status === 'workflow-mismatch') {
      throw new BadRequestException('工作流 ID 与当前应用不匹配')
    }

    return result.deployment
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    try {
      return structuredClone(value) as Prisma.InputJsonValue
    } catch {
      throw new InternalServerErrorException('工作流发布快照序列化失败')
    }
  }
}
