import { ChatModelResolverService } from '@/services/chat-model-resolver.service'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import { PluginCatalogService } from '@/services/plugin-catalog.service'
import type { ResolveExecutorModelDto } from '@/dto/executor-model.dto'
import type { ExecutorModelResolutionVo } from '@/vo/executor-model.vo'
import { BuiltinNodeType, llmNodeSchema, type Workflow, workflowSchema } from '@ai-workflow/core'
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'

@Injectable()
export class ExecutorModelService {
  constructor(
    private readonly executorModelRepository: ExecutorModelRepository,
    private readonly chatModelResolver: ChatModelResolverService,
    private readonly pluginCatalogService: PluginCatalogService,
  ) {}

  async resolve(dto: ResolveExecutorModelDto): Promise<ExecutorModelResolutionVo> {
    const context = await this.executorModelRepository.findResolutionContext(dto)
    if (!context) throw new NotFoundException('模型运行上下文不存在或租约已失效')

    const parsedWorkflow = workflowSchema.safeParse(context.run.version.definition)
    if (!parsedWorkflow.success) {
      throw new UnprocessableEntityException('运行绑定的工作流版本无效')
    }

    const node = parsedWorkflow.data.nodes.find((candidate) => candidate.id === dto.nodeId)
    if (
      !node ||
      !(await this.supportsLlmExecution(
        context.run.workflow.app.ownerId,
        parsedWorkflow.data,
        node.type,
      ))
    ) {
      throw new NotFoundException('LLM 节点不存在')
    }

    const parsedConfig = llmNodeSchema.safeParse(node.config)
    if (!parsedConfig.success) {
      throw new UnprocessableEntityException('LLM 节点配置无效')
    }

    return this.chatModelResolver.resolve(context.run.workflow.app.ownerId, parsedConfig.data.model)
  }

  private async supportsLlmExecution(
    ownerId: string,
    workflow: Workflow,
    nodeType: string,
  ): Promise<boolean> {
    if (nodeType === BuiltinNodeType.LLM) return true

    const plugins = await this.pluginCatalogService.resolveWorkflowVersions(
      ownerId,
      workflow.plugins,
    )
    return plugins.some((plugin) =>
      plugin.manifest.nodes.some(
        (node) => node.type === nodeType && node.execution.kind === 'host-llm',
      ),
    )
  }
}
