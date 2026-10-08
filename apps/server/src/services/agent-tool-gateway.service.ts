import {
  agentGatewayCallSchema,
  agentGatewayResultSchema,
  maskAgentWorkflow,
  type AgentGatewayResult,
} from '@ai-workflow/agent-protocol'
import {
  getNodePorts,
  resolveNodeVariableForm,
  validateWorkflow,
  validateExecutorWorkflow,
  workflowSchema,
} from '@ai-workflow/core'
import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common'
import {
  WorkflowCatalogResolver,
  assertWorkflowExecutable,
} from '@/workflow-catalog/workflow-server-catalog'
import { AgentContextService } from '@/services/agent-context.service'
import { WorkflowDraftService } from '@/services/workflow-draft.service'
import { StudioAppService } from '@/services/studio-app.service'
import { WorkflowDeploymentService } from '@/services/workflow-deployment.service'
import { ModelGroupService } from '@/services/model-group.service'
import { KnowledgeBaseService } from '@/services/knowledge-base.service'
import { WorkflowRunService } from '@/services/workflow-run.service'
import { projectAgentData } from '@/utils/agent-data'
import { PluginCatalogService } from '@/services/plugin-catalog.service'

@Injectable()
export class AgentToolGatewayService {
  private readonly logger = new Logger(AgentToolGatewayService.name)
  constructor(
    private readonly contexts: AgentContextService,
    private readonly drafts: WorkflowDraftService,
    private readonly catalogResolver: WorkflowCatalogResolver,
    private readonly apps: StudioAppService,
    private readonly deployments: WorkflowDeploymentService,
    private readonly models: ModelGroupService,
    private readonly knowledge: KnowledgeBaseService,
    private readonly runs: WorkflowRunService,
    private readonly plugins: PluginCatalogService,
  ) {}
  async execute(token: string, raw: unknown): Promise<AgentGatewayResult> {
    const claims = this.contexts.verify(token),
      parsed = agentGatewayCallSchema.safeParse(raw)
    if (!parsed.success || !claims.allowedTools.includes(parsed.data.tool))
      throw new BadRequestException('Agent 工具输入无效或未授权')
    const { ownerId, appId } = claims,
      call = parsed.data,
      startedAt = Date.now()
    let status = 'failed',
      truncated = false
    try {
      const draft = await this.drafts.get(ownerId, appId)
      if (workflowSchema.parse(draft.definition).id !== claims.workflowId)
        throw new BadRequestException('工作流上下文已变化')
      let data: unknown
      if (call.tool === 'list_node_types' || call.tool === 'get_node_type') {
        const versions = await this.plugins.resolveEditorVersions(ownerId, call.input.plugins),
          workflow = {
            ...workflowSchema.parse(draft.definition),
            plugins: versions.map((version) => ({
              pluginId: version.pluginId,
              version: version.version,
              digest: version.artifactDigest,
            })),
          },
          catalog = await this.catalogResolver.resolveForWorkflow(ownerId, workflow)
        if (call.tool === 'list_node_types') {
          const search = call.input.search?.toLowerCase() ?? '',
            matching = catalog.nodeRegistry
              .list()
              .filter((node) =>
                `${node.definition.type} ${node.definition.label} ${node.definition.description ?? ''}`
                  .toLowerCase()
                  .includes(search),
              )
          truncated = matching.length > 100
          data = {
            fingerprint: catalog.fingerprint,
            plugins: catalog.pluginLock,
            nodes: matching.slice(0, 100).map((node) => ({
              type: node.definition.type,
              label: node.definition.label,
              description: node.definition.description,
            })),
          }
        } else {
          const node = catalog.nodeRegistry.get(call.input.type)
          if (!node) throw new BadRequestException('节点类型不属于当前应用目录')
          const inputs = node.createInitialInputs?.() ?? {},
            outputs = node.createInitialOutputs?.() ?? [],
            config = node.createInitialConfig({ inputs, outputs }),
            ports = getNodePorts(node, call.input.config ?? config)
          data = {
            fingerprint: catalog.fingerprint,
            plugins: catalog.pluginLock,
            type: node.definition.type,
            label: node.definition.label,
            description: node.definition.description,
            config,
            inputs,
            outputs,
            form: node.form,
            variableForm: resolveNodeVariableForm(node.variableForm),
            fixedOutputs: node.fixedOutputs,
            ports,
          }
        }
      } else if (call.tool === 'inspect_project_resources') {
        const search = call.input.search
        if (call.input.resource === 'models') {
          const result = await this.models.list(ownerId, { modelType: 'chat' }),
            matching = result.items.filter((group) => !search || group.name.includes(search))
          truncated = matching.length > 50
          data = matching.slice(0, 50).map((group) => ({
            groupId: group.id,
            name: group.name,
            providerType: group.providerType,
            enabled: group.enabled,
            models: group.models.map((model) => ({
              configuredModelId: model.id,
              modelId: model.modelId,
              name: model.displayName ?? model.modelId,
              enabled: model.enabled,
            })),
          }))
        } else if (call.input.resource === 'knowledge_bases') {
          const result = await this.knowledge.list(ownerId, { search, sort: 'updated_desc' })
          truncated = result.items.length > 50
          data = await Promise.all(
            result.items.slice(0, 50).map(async (kb) => {
              const indexes = await this.knowledge.listIndexes(ownerId, kb.id)
              return {
                id: kb.id,
                name: kb.title,
                icon: kb.icon,
                description: kb.description,
                segmentationMode: kb.segmentationMode,
                available: indexes.items.some((index) => index.active && index.status === 'READY'),
              }
            }),
          )
        } else if (call.input.resource === 'sub_workflows') {
          const result = await this.apps.list(ownerId, {
            limit: 20,
            sort: 'updated_desc',
            publishedOnly: true,
            search,
          })
          truncated = Boolean(result.nextCursor)
          data = {
            items: await Promise.all(
              result.items
                .filter((app) => app.id !== appId)
                .map(async (app) => ({
                  id: app.id,
                  name: app.title,
                  icon: app.icon,
                  contract: await this.deployments.getPublishedContract(ownerId, app.id),
                })),
            ),
            hasMore: Boolean(result.nextCursor),
          }
        } else {
          const app = await this.apps.getById(ownerId, appId),
            deployment = await this.deployments.getCurrent(ownerId, appId)
          data = {
            id: app.id,
            name: app.title,
            description: app.description,
            published: Boolean(deployment),
          }
        }
      } else if (call.tool === 'list_workflow_runs') {
        data = await this.runs.listRuns(ownerId, appId, { ...call.input, scope: 'all' })
      } else if (call.tool === 'get_workflow_run') {
        data = await this.runs.getRunDetail(ownerId, appId, call.input.runId, true)
      } else {
        const workflow = workflowSchema.parse(call.input.workflow)
        if (workflow.id !== claims.workflowId)
          throw new BadRequestException('候选工作流 ID 与当前应用不一致')
        const catalog = await this.catalogResolver.resolveForWorkflow(ownerId, workflow),
          saveIssues = validateWorkflow(workflow, catalog.nodeRegistry),
          issues = saveIssues.length
            ? saveIssues
            : validateExecutorWorkflow(workflow, catalog.nodeRegistry)
        assertWorkflowExecutable(workflow, catalog)
        data = {
          valid: issues.length === 0,
          issues: issues.map((issue) => ({
            code: issue.scope,
            message: issue.message,
            ...('nodeId' in issue ? { nodeId: issue.nodeId } : {}),
          })),
          ...(issues.length === 0 ? { workflow: maskAgentWorkflow(workflow) } : {}),
        }
        // 校验后的 Workflow 不裁剪，避免把截断的定义作为合法候选返回。
        const result = agentGatewayResultSchema.safeParse({ protocolVersion: 1, ok: true, data })
        if (!result.success || Buffer.byteLength(JSON.stringify(result.data)) > 65_536)
          throw new BadRequestException('候选超过工具结果大小限制')
        if (issues.length === 0) this.contexts.recordValidatedCandidate(claims.agentRunId, workflow)
        status = issues.length ? 'failed' : 'succeeded'
        return result.data
      }
      const projected = projectAgentData(data)
      status = 'succeeded'
      return agentGatewayResultSchema.parse({
        protocolVersion: 1,
        ok: true,
        ...projected,
        truncated: truncated || projected.truncated,
      })
    } catch (error) {
      return {
        protocolVersion: 1,
        ok: false,
        error: {
          code: 'AGENT_TOOL_FAILED',
          message:
            error instanceof HttpException && error.getStatus() < 500
              ? error.message.slice(0, 1000)
              : '项目查询或校验失败，请检查工具输入后重试',
          retryable: true,
        },
      }
    } finally {
      this.logger.log(
        JSON.stringify({
          agentRunId: claims.agentRunId,
          tool: call.tool,
          durationMs: Date.now() - startedAt,
          status,
        }),
      )
    }
  }
}
