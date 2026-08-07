import type { PreparedNodeDispatch } from '@/common/interfaces/workflow-run-persistence.interface'
import { ListAppApiWorkflowRunsDto } from '@/dto/app-api.dto'
import {
  CreateWorkflowTestRunDto,
  ListWorkflowRunsDto,
  TEST_RUN_MODES,
} from '@/dto/workflow-run.dto'
import { WorkflowNodeRunStatus, WorkflowRunStatus } from '@/generated/prisma/client'
import {
  BuiltinNodeType,
  ENVIRONMENT_VARIABLE_TYPES,
  SYSTEM_VARIABLE_KEYS,
  type JsonValue,
  type SystemVariableKey,
  type VariableValue,
  type Workflow,
  type WorkflowNode,
  jsonValueSchema,
  supportsSingleNodeTestRun,
  validateExecutorWorkflow,
  workflowSchema,
} from '@ai-workflow/core'
import {
  parseExecuteNodeCommand,
  parseExecuteNodeResult,
  type ExecuteNodeCommand,
} from '@ai-workflow/protocol'
import {
  createWorkflowRuntime,
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_NODE_STATUSES,
  runtimeStateSchema,
  type DispatchNodeEffect,
  type RuntimeErrorData,
  type RuntimeState,
  type RuntimeTransition,
} from '@ai-workflow/runtime'
import { AppApiRepository } from '@/repositories/app-api.repository'
import { WorkflowDraftRepository } from '@/repositories/workflow-draft.repository'
import { WorkflowRunRepository } from '@/repositories/workflow-run.repository'
import { WorkflowRunEventStreamService } from '@/services/workflow-run-event-stream.service'
import { WorkflowExecutionRoutingService } from '@/infra/workflow-mq/workflow-execution-routing.service'
import {
  parseWorkflowDefinition,
  parseWorkflowLayout,
  redactWorkflowDefinitionSecrets,
  restoreMaskedWorkflowDefinitionSecrets,
} from '@/utils/workflow-draft'
import type {
  WorkflowNodeExecutionStateVo,
  WorkflowNodeLastRunVo,
  WorkflowRunDetailVo,
  WorkflowRunListItemVo,
  WorkflowRunListVo,
  WorkflowTestRunVo,
} from '@/vo/workflow-run.vo'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { isUUID } from 'class-validator'
import {
  WorkflowCatalogResolver,
  type WorkflowServerCatalog,
} from '@/workflow-catalog/workflow-server-catalog'

const APP_API_VERSION_NOT_FOUND_MESSAGE = '工作流版本不存在，或不属于当前 API 密钥对应的应用'
const DEFAULT_EXECUTION_DEADLINE_MS = 30_000
const LONG_RUNNING_EXECUTION_DEADLINE_MS = 24 * 60 * 60 * 1000
const RESULT_APPLY_MAX_ATTEMPTS = 5
type WorkflowRunSummary = NonNullable<Awaited<ReturnType<WorkflowRunRepository['findRunSummary']>>>
type WorkflowRunListItem = Awaited<ReturnType<WorkflowRunRepository['listOwnedRuns']>>[number]
interface WorkflowRunCursor {
  id: string
  queuedAt: Date
}
@Injectable()
export class WorkflowRunService {
  private readonly logger = new Logger(WorkflowRunService.name)

  constructor(
    private readonly appApiRepository: AppApiRepository,
    private readonly workflowDraftRepository: WorkflowDraftRepository,
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly workflowRunEventStream: WorkflowRunEventStreamService,
    private readonly workflowExecutionRouting: WorkflowExecutionRoutingService,
    private readonly workflowCatalogResolver: WorkflowCatalogResolver,
  ) {}

  async createTestRun(
    ownerId: string,
    appId: string,
    dto: CreateWorkflowTestRunDto,
  ): Promise<WorkflowTestRunVo> {
    const snapshot = await this.parseOwnedSnapshot(ownerId, appId, dto)

    return dto.mode === TEST_RUN_MODES.FULL
      ? this.runFullWorkflow(ownerId, appId, snapshot.workflow, snapshot.layout, dto.input ?? {})
      : this.runSingleNode(
          ownerId,
          appId,
          snapshot.workflow,
          snapshot.layout,
          dto.targetNodeId,
          dto.input,
        )
  }

  async createApiRun(
    appId: string,
    versionId: string | undefined,
    input: Record<string, unknown>,
  ): Promise<WorkflowTestRunVo> {
    const target = await this.appApiRepository.findPublishedVersion(appId, versionId)
    if (!target) {
      if (versionId) throw new NotFoundException(APP_API_VERSION_NOT_FOUND_MESSAGE)
      throw new BadRequestException('工作流尚未发布')
    }

    const parsedWorkflow = workflowSchema.safeParse(target.definition)
    if (!parsedWorkflow.success) {
      throw new InternalServerErrorException('发布版本工作流定义格式无效')
    }
    const catalog = await this.workflowCatalogResolver.resolveForWorkflow(
      target.workflow.app.ownerId,
      parsedWorkflow.data,
    )
    const issues = validateExecutorWorkflow(parsedWorkflow.data, catalog.nodeRegistry)
    if (issues.length > 0) {
      throw new BadRequestException(issues[0]?.message ?? '工作流暂时无法运行')
    }

    const runId = randomUUID()
    const runtime = createWorkflowRuntime(parsedWorkflow.data, {
      workflowVersionId: target.id,
      configResolver: catalog.configProjectors.createResolver(),
    })
    let transition: RuntimeTransition
    try {
      transition = runtime.start({
        runId,
        input,
        systemVariables: createRunSystemVariables(
          target.workflow.app.ownerId,
          appId,
          target.workflow.id,
          runId,
        ),
      })
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error, '工作流无法启动'))
    }
    const created = await this.workflowRunRepository.createApiRun({
      appId,
      ownerId: target.workflow.app.ownerId,
      workflowId: target.workflow.id,
      versionId: target.id,
      runId,
      traceId: randomUUID(),
      input: transition.state.startInput,
      runtimeState: transition.state,
      terminal: getRuntimeTerminal(transition),
      dispatches: this.prepareRuntimeDispatches(transition, runId, catalog),
    })
    if (created === 'not-found') throw new NotFoundException(APP_API_VERSION_NOT_FOUND_MESSAGE)
    return this.getApiRun(appId, runId)
  }

  async getLatestNodeRun(
    ownerId: string,
    appId: string,
    nodeId: string,
  ): Promise<WorkflowNodeLastRunVo | null> {
    const workflow = await this.workflowRunRepository.findOwnedWorkflow(ownerId, appId)
    if (!workflow) throw new NotFoundException('应用不存在')

    const nodeRun = await this.workflowRunRepository.findLatestOwnedNodeRun(ownerId, appId, nodeId)
    if (!nodeRun) return null

    return {
      id: nodeRun.id,
      runId: nodeRun.runId,
      executionKey: nodeRun.executionKey,
      nodeId: nodeRun.nodeId,
      nodeType: nodeRun.nodeType,
      status: nodeRun.status,
      ...(nodeRun.input !== null ? { input: nodeRun.input } : {}),
      ...(nodeRun.output !== null ? { output: nodeRun.output } : {}),
      ...(nodeRun.startedAt ? { startedAt: nodeRun.startedAt } : {}),
      ...(nodeRun.finishedAt ? { finishedAt: nodeRun.finishedAt } : {}),
      ...(nodeRun.durationMs !== null ? { durationMs: nodeRun.durationMs } : {}),
      ...(nodeRun.errorCode && nodeRun.errorMessage
        ? {
            error: {
              code: nodeRun.errorCode,
              message: nodeRun.errorMessage,
              ...(nodeRun.errorDetails !== null ? { details: nodeRun.errorDetails } : {}),
            },
          }
        : {}),
      runMode: nodeRun.run.mode,
      runTrigger: nodeRun.run.trigger,
      runStatus: nodeRun.run.status,
      ...(nodeRun.run.triggeredBy ? { triggeredBy: nodeRun.run.triggeredBy } : {}),
    }
  }

  async listRuns(
    ownerId: string,
    appId: string,
    query: ListWorkflowRunsDto,
  ): Promise<WorkflowRunListVo> {
    const workflow = await this.workflowRunRepository.findOwnedWorkflow(ownerId, appId)
    if (!workflow) throw new NotFoundException('应用不存在')

    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined
    const runs = await this.workflowRunRepository.listOwnedRuns({
      ownerId,
      appId,
      limit: query.limit,
      cursor,
      scope: query.scope,
      status: query.status,
      trigger: query.trigger,
      from: query.from ? new Date(query.from) : undefined,
      search: query.search || undefined,
    })
    const hasMore = runs.length > query.limit
    const page = hasMore ? runs.slice(0, query.limit) : runs
    const lastRun = page.at(-1)

    return {
      items: page.map(toWorkflowRunListItemVo),
      nextCursor:
        hasMore && lastRun
          ? this.encodeCursor({
              id: lastRun.id,
              queuedAt: lastRun.queuedAt,
            })
          : null,
    }
  }

  async listApiRuns(appId: string, query: ListAppApiWorkflowRunsDto): Promise<WorkflowRunListVo> {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined
    const runs = await this.workflowRunRepository.listApiRuns({
      appId,
      limit: query.limit,
      cursor,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      search: query.search || undefined,
    })
    const hasMore = runs.length > query.limit
    const page = hasMore ? runs.slice(0, query.limit) : runs
    const lastRun = page.at(-1)

    return {
      items: page.map(toWorkflowRunListItemVo),
      nextCursor:
        hasMore && lastRun
          ? this.encodeCursor({
              id: lastRun.id,
              queuedAt: lastRun.queuedAt,
            })
          : null,
    }
  }

  async getRunDetail(ownerId: string, appId: string, runId: string): Promise<WorkflowRunDetailVo> {
    const run = await this.workflowRunRepository.findOwnedRunDetail(ownerId, appId, runId)
    if (!run) throw new NotFoundException('运行记录不存在')
    const definition = parseWorkflowDefinition(run.version.definition)
    if (!definition) throw new InternalServerErrorException('运行绑定的工作流版本快照格式无效')
    const layout = parseWorkflowLayout(run.version.layout)
    if (!layout) throw new InternalServerErrorException('运行绑定的工作流布局快照格式无效')

    return {
      ...toWorkflowTestRunVo(run),
      definition: redactWorkflowDefinitionSecrets(definition),
      layout,
    }
  }

  async getApiRun(appId: string, runId: string): Promise<WorkflowTestRunVo> {
    const run = await this.workflowRunRepository.findApiRunSummary(appId, runId)
    if (!run) throw new NotFoundException('运行记录不存在')
    return toWorkflowTestRunVo(run)
  }

  async processNodeResult(
    rawResult: unknown,
    transportError?: string,
  ): Promise<'applied' | 'duplicate' | 'stale'> {
    const protocolResult = parseExecuteNodeResult(rawResult)

    for (let attempt = 0; attempt < RESULT_APPLY_MAX_ATTEMPTS; attempt += 1) {
      // Result 可能与同一 Run 的其他并行节点同时到达；每次冲突后都从数据库恢复最新 State。
      // eslint-disable-next-line no-await-in-loop
      const context = await this.workflowRunRepository.findResultContext(protocolResult.commandId)
      if (!context) return 'stale'
      if (context.resultInbox) return 'duplicate'
      if (
        context.id !== protocolResult.nodeRunId ||
        context.executionKey !== protocolResult.executionKey ||
        context.leaseToken !== protocolResult.leaseToken ||
        context.status !== WorkflowNodeRunStatus.RUNNING ||
        context.run.status !== WorkflowRunStatus.RUNNING
      ) {
        return 'stale'
      }
      if (context.deadlineAt.getTime() <= Date.now()) {
        // eslint-disable-next-line no-await-in-loop
        await this.failRunForCommand(protocolResult.commandId, {
          code: 'NODE_EXECUTION_TIMED_OUT',
          message: '节点执行超过截止时间',
          runStatus: WorkflowRunStatus.TIMED_OUT,
          nodeRunStatus: WorkflowNodeRunStatus.TIMED_OUT,
        })
        return 'stale'
      }

      if (context.run.mode === TEST_RUN_MODES.SINGLE_NODE) {
        // eslint-disable-next-line no-await-in-loop
        const applied = await this.workflowRunRepository.completeSingleNodeRun({
          runId: context.runId,
          result: protocolResult,
          transportError,
        })
        if (applied === 'conflict') continue
        // eslint-disable-next-line no-await-in-loop
        await this.emitRunEvents(
          context.runId,
          [{ nodeId: context.nodeId, status: protocolResult.status }],
          applied,
        )
        return applied
      }

      const parsedWorkflow = workflowSchema.safeParse(context.run.version.definition)
      if (!parsedWorkflow.success) {
        throw new InternalServerErrorException('运行绑定的工作流版本快照格式无效')
      }

      if (!context.run.runtimeState) {
        throw new InternalServerErrorException('完整工作流运行缺少 RuntimeState')
      }

      // eslint-disable-next-line no-await-in-loop
      const catalog = await this.workflowCatalogResolver.resolveForWorkflow(
        context.run.workflow.app.ownerId,
        parsedWorkflow.data,
      )
      const runtime = createWorkflowRuntime(parsedWorkflow.data, {
        workflowVersionId: context.run.workflowVersionId,
        configResolver: catalog.configProjectors.createResolver(),
      })

      let transition: RuntimeTransition
      try {
        transition = runtime.applyNodeResult(
          context.run.runtimeState as unknown as RuntimeState,
          protocolResult,
        )
      } catch (error) {
        throw new InternalServerErrorException(getErrorMessage(error, 'RuntimeState 恢复失败'))
      }

      const dispatches = this.prepareRuntimeDispatches(transition, context.runId, catalog)
      const completedNodes = collectCompletedNodeTransitions(
        context.run.runtimeState as unknown as RuntimeState,
        transition.state,
      )
      // eslint-disable-next-line no-await-in-loop
      const applied = await this.workflowRunRepository.applyRuntimeResult(context.runId, {
        expectedRevision: context.run.runtimeRevision,
        state: transition.state,
        terminal: getRuntimeTerminal(transition),
        dispatches,
        result: protocolResult,
        transportError,
      })
      if (applied === 'conflict') continue
      // eslint-disable-next-line no-await-in-loop
      await this.emitRunEvents(context.runId, completedNodes, applied)
      if (applied === 'applied' && transition.state.status !== 'RUNNING') {
        // 子 Run 进入终态后，将它的公开输出或错误作为父 sub_workflow 节点结果继续推进。
        // eslint-disable-next-line no-await-in-loop
        await this.processChildRunCompletion(context.runId)
      }
      return applied
    }

    throw new InternalServerErrorException('工作流结果并发推进冲突次数过多')
  }

  async executeSubWorkflowCommand(command: ExecuteNodeCommand): Promise<void> {
    if (command.nodeType !== BuiltinNodeType.SUB_WORKFLOW) {
      throw new BadRequestException('仅 sub_workflow 命令可由服务端编排')
    }

    const parsedConfig = this.workflowCatalogResolver
      .resolveBuiltin()
      .nodeRegistry.getOrThrow(BuiltinNodeType.SUB_WORKFLOW)
      .schema.safeParse(command.config)
    if (!parsedConfig.success || !parsedConfig.data.workflow.id) {
      await this.processNodeResult(
        createFailedResult(command, 'SUB_WORKFLOW_CONFIG_INVALID', '子工作流配置不完整'),
      )
      return
    }

    const target = await this.workflowRunRepository.findSubWorkflowTarget(
      command.runId,
      parsedConfig.data.workflow.id,
    )
    if (target?.status === 'recursive') {
      await this.processNodeResult(
        createFailedResult(command, 'SUB_WORKFLOW_RECURSIVE_CALL', '检测到递归子工作流调用'),
      )
      return
    }
    if (!target) {
      await this.processNodeResult(
        createFailedResult(
          command,
          'SUB_WORKFLOW_NOT_PUBLISHED',
          '子工作流不存在、未发布或无权访问',
        ),
      )
      return
    }

    const parsedWorkflow = workflowSchema.safeParse(target.version.definition)
    if (!parsedWorkflow.success) {
      await this.processNodeResult(
        createFailedResult(command, 'SUB_WORKFLOW_DEFINITION_INVALID', '子工作流发布版本定义无效'),
      )
      return
    }
    const catalog = await this.workflowCatalogResolver.resolveForWorkflow(
      target.triggeredById,
      parsedWorkflow.data,
    )
    const issues = validateExecutorWorkflow(parsedWorkflow.data, catalog.nodeRegistry)
    if (issues.length > 0) {
      await this.processNodeResult(
        createFailedResult(
          command,
          'SUB_WORKFLOW_DEFINITION_INVALID',
          issues[0]?.message ?? '子工作流发布版本无法执行',
        ),
      )
      return
    }

    const childRunId = randomUUID()
    const runtime = createWorkflowRuntime(parsedWorkflow.data, {
      workflowVersionId: target.version.id,
      configResolver: catalog.configProjectors.createResolver(),
    })
    let transition: RuntimeTransition
    try {
      transition = runtime.start({
        runId: childRunId,
        input: command.inputs,
        systemVariables: createRunSystemVariables(
          // 子 Run 沿用父调用者；WORKFLOW_ID / RUN_ID 则切换为子上下文。
          target.triggeredById,
          target.workflow.appId,
          parsedWorkflow.data.id,
          childRunId,
        ),
      })
    } catch (error) {
      await this.processNodeResult(
        createFailedResult(
          command,
          'SUB_WORKFLOW_START_FAILED',
          getErrorMessage(error, '子工作流无法启动'),
        ),
      )
      return
    }

    const outcome = await this.workflowRunRepository.createSubWorkflowRun({
      parentCommand: command,
      childRunId,
      childWorkflowId: parsedWorkflow.data.id,
      childVersionId: target.version.id,
      traceId: randomUUID(),
      input: command.inputs,
      runtimeState: transition.state,
      terminal: getRuntimeTerminal(transition),
      dispatches: this.prepareRuntimeDispatches(transition, childRunId, catalog),
    })
    if (outcome === 'created' && transition.state.status !== 'RUNNING') {
      await this.processChildRunCompletion(childRunId)
    }
  }

  async processChildRunCompletion(childRunId: string): Promise<void> {
    const child = await this.workflowRunRepository.findChildRunCompletion(childRunId)
    if (!child?.parentNodeRun || child.status === WorkflowRunStatus.RUNNING) return

    const base = {
      protocolVersion: '1' as const,
      commandId: child.parentNodeRun.commandId,
      nodeRunId: child.parentNodeRun.id,
      executionKey: child.parentNodeRun.executionKey,
      leaseToken: child.parentNodeRun.leaseToken,
    }
    const result =
      child.status === WorkflowRunStatus.SUCCEEDED
        ? parseExecuteNodeResult({
            ...base,
            status: 'SUCCEEDED',
            outputs: child.output ?? {},
            activatedHandles: ['result'],
          })
        : parseExecuteNodeResult({
            ...base,
            status: 'FAILED',
            error: {
              code: child.errorCode ?? 'SUB_WORKFLOW_FAILED',
              message: child.errorMessage ?? '子工作流执行失败',
              retryable: false,
              ...(child.errorDetails && typeof child.errorDetails === 'object'
                ? { details: child.errorDetails }
                : {}),
            },
          })
    await this.processNodeResult(result)
  }

  async getTestRun(ownerId: string, appId: string, runId: string): Promise<WorkflowTestRunVo> {
    const run = await this.workflowRunRepository.findOwnedRunSummary(ownerId, appId, runId)
    if (!run) throw new NotFoundException('测试运行不存在')
    return toWorkflowTestRunVo(run)
  }

  async cancelTestRun(ownerId: string, appId: string, runId: string): Promise<WorkflowTestRunVo> {
    const outcome = await this.workflowRunRepository.cancelOwnedRun(ownerId, appId, runId)
    if (outcome === 'not-found') throw new NotFoundException('测试运行不存在')

    const run = await this.getTestRun(ownerId, appId, runId)
    if (outcome === 'cancelled' && this.workflowRunEventStream.hasSubscribers(runId)) {
      try {
        this.workflowRunEventStream.publishWorkflowFinished(run)
      } catch (error) {
        this.logger.warn(
          `Workflow 暂停终态事件发布失败 runId=${runId}：${getErrorMessage(error, '未知错误')}`,
        )
      }
    }
    return run
  }

  private encodeCursor(cursor: WorkflowRunCursor): string {
    return Buffer.from(
      JSON.stringify({
        id: cursor.id,
        queuedAt: cursor.queuedAt.toISOString(),
      }),
    ).toString('base64url')
  }

  private decodeCursor(cursor: string): WorkflowRunCursor {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        id?: unknown
        queuedAt?: unknown
      }
      const queuedAt =
        typeof parsed.queuedAt === 'string' && parsed.queuedAt
          ? new Date(parsed.queuedAt)
          : undefined

      if (
        typeof parsed.id !== 'string' ||
        !isUUID(parsed.id, '4') ||
        !queuedAt ||
        Number.isNaN(queuedAt.getTime())
      ) {
        throw new Error('Invalid cursor')
      }

      return { id: parsed.id, queuedAt }
    } catch {
      throw new BadRequestException('分页游标无效')
    }
  }

  async failRunForCommand(
    commandId: string,
    failure: {
      code: string
      message: string
      runStatus?: typeof WorkflowRunStatus.FAILED | typeof WorkflowRunStatus.TIMED_OUT
      nodeRunStatus?: typeof WorkflowNodeRunStatus.FAILED | typeof WorkflowNodeRunStatus.TIMED_OUT
    },
  ): Promise<void> {
    const runId = await this.workflowRunRepository.failCommand({
      commandId,
      errorCode: failure.code,
      errorMessage: failure.message,
      runStatus: failure.runStatus ?? WorkflowRunStatus.FAILED,
      nodeRunStatus: failure.nodeRunStatus ?? WorkflowNodeRunStatus.FAILED,
    })
    if (!runId) return

    await this.processChildRunCompletion(runId)
    if (!this.workflowRunEventStream.hasSubscribers(runId)) return

    try {
      const run = await this.getRunVo(runId)
      this.workflowRunEventStream.publishWorkflowFinished(run)
    } catch (error) {
      this.logger.warn(
        `Workflow SSE 终态事件发布失败 runId=${runId}：${getErrorMessage(error, '未知错误')}`,
      )
    }
  }

  private async parseOwnedSnapshot(ownerId: string, appId: string, dto: CreateWorkflowTestRunDto) {
    const submittedDefinition = parseWorkflowDefinition(dto.definition)
    const layout = parseWorkflowLayout(dto.layout)
    if (!submittedDefinition || !layout) {
      throw new BadRequestException('测试运行快照格式无效')
    }

    const app = await this.workflowDraftRepository.findOwned(ownerId, appId)
    const persistedDefinition = parseWorkflowDefinition(app?.workflow?.draft?.definition)
    if (!app?.workflow || !persistedDefinition) {
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

    return { workflow: parsed.data, layout }
  }

  private async runFullWorkflow(
    ownerId: string,
    appId: string,
    workflow: Workflow,
    layout: unknown,
    input: Record<string, unknown>,
  ): Promise<WorkflowTestRunVo> {
    const catalog = await this.workflowCatalogResolver.resolveForWorkflow(ownerId, workflow)
    const issues = validateExecutorWorkflow(workflow, catalog.nodeRegistry)
    if (issues.length > 0) {
      throw new BadRequestException(issues[0]?.message ?? '工作流暂时无法运行')
    }

    this.assertFullRunCapabilities(workflow)

    const runId = randomUUID()
    const workflowVersionId = randomUUID()
    const runtime = createWorkflowRuntime(workflow, {
      workflowVersionId,
      configResolver: catalog.configProjectors.createResolver(),
    })
    const systemVariables = createRunSystemVariables(ownerId, appId, workflow.id, runId)

    let transition: RuntimeTransition
    try {
      transition = runtime.start({
        runId,
        input,
        systemVariables,
      })
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error, '工作流无法启动'))
    }

    const initialDispatches = this.prepareRuntimeDispatches(transition, runId, catalog)
    const created = await this.workflowRunRepository.createTestRun({
      ownerId,
      appId,
      workflowId: workflow.id,
      versionId: workflowVersionId,
      runId,
      traceId: randomUUID(),
      mode: TEST_RUN_MODES.FULL,
      definition: workflow,
      layout,
      input: transition.state.startInput,
      runtimeState: transition.state,
      terminal: getRuntimeTerminal(transition),
      dispatches: initialDispatches,
    })
    if (created === 'not-found') throw new NotFoundException('工作流草稿不存在')

    return this.getRunVo(runId)
  }

  private async runSingleNode(
    ownerId: string,
    appId: string,
    workflow: Workflow,
    layout: unknown,
    targetNodeId?: string,
    input?: Record<string, unknown>,
  ): Promise<WorkflowTestRunVo> {
    if (!targetNodeId) throw new BadRequestException('单节点测试运行缺少目标节点')

    const node = workflow.nodes.find((candidate) => candidate.id === targetNodeId)
    if (!node) throw new BadRequestException('目标节点不存在')

    if (!supportsSingleNodeTestRun(node.type)) {
      throw new BadRequestException('当前节点不支持单独测试运行')
    }

    const catalog = await this.workflowCatalogResolver.resolveForWorkflow(ownerId, workflow)
    const nodeType = catalog.nodeRegistry.get(node.type)
    const parsedConfig = nodeType?.schema.safeParse(node.config)
    if (!nodeType || !parsedConfig?.success) {
      throw new BadRequestException('节点配置不完整，无法运行')
    }

    const runId = randomUUID()
    const versionId = randomUUID()
    const effectiveInput = resolveSingleNodeRunInput(node, input)
    let projectedConfig: Record<string, JsonValue>
    try {
      projectedConfig = catalog.configProjectors
        .createResolver()
        .resolve(node, resolveSingleNodeVariableValue)
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error, '节点配置无法解析'))
    }
    const command = this.createCommand({
      runId,
      node,
      executionKey: `${runId}:single:${node.id}`,
      attempt: 1,
      inputs: effectiveInput,
      config: projectedConfig,
    })
    const dispatches = [this.prepareDispatch(command, catalog)]

    const created = await this.workflowRunRepository.createTestRun({
      ownerId,
      appId,
      workflowId: workflow.id,
      versionId,
      runId,
      traceId: randomUUID(),
      mode: TEST_RUN_MODES.SINGLE_NODE,
      targetNodeId,
      definition: workflow,
      layout,
      input: effectiveInput,
      terminal: { status: 'RUNNING' },
      dispatches,
    })
    if (created === 'not-found') throw new NotFoundException('工作流草稿不存在')

    return this.getRunVo(runId)
  }

  private assertFullRunCapabilities(workflow: Workflow) {
    if (
      workflow.environmentVariables.some(
        (variable) => variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET,
      )
    ) {
      throw new BadRequestException('当前测试运行暂不支持 Secret 环境变量')
    }
  }

  private prepareRuntimeDispatches(
    transition: RuntimeTransition,
    runId: string,
    catalog: WorkflowServerCatalog,
  ): PreparedNodeDispatch[] {
    return transition.effects
      .filter((effect): effect is DispatchNodeEffect => effect.type === 'DISPATCH_NODE')
      .map((effect) =>
        this.prepareDispatch(
          this.createCommand({
            runId,
            node: {
              id: effect.nodeId,
              type: effect.nodeType,
            },
            executionKey: effect.executionKey,
            attempt: effect.attempt,
            inputs: effect.inputs,
            config: effect.config,
          }),
          catalog,
        ),
      )
  }

  private prepareDispatch(
    command: ExecuteNodeCommand,
    catalog: WorkflowServerCatalog,
  ): PreparedNodeDispatch {
    try {
      return {
        command,
        ...this.workflowExecutionRouting.resolve(command.nodeType, catalog.executionRegistry),
      }
    } catch (error) {
      throw new BadRequestException(getErrorMessage(error, '节点暂不支持执行'))
    }
  }

  private createCommand(options: {
    runId: string
    node: Pick<WorkflowNode, 'id' | 'type'>
    executionKey: string
    attempt: number
    inputs: unknown
    config: unknown
  }): ExecuteNodeCommand {
    const commandId = randomUUID()

    return parseExecuteNodeCommand({
      protocolVersion: '1',
      commandId,
      idempotencyKey: `${options.runId}:${options.executionKey}:${options.attempt}`,
      runId: options.runId,
      nodeRunId: randomUUID(),
      nodeId: options.node.id,
      nodeType: options.node.type,
      executionKey: options.executionKey,
      attempt: options.attempt,
      leaseToken: randomUUID(),
      deadlineAt: new Date(
        Date.now() + resolveExecutionDeadlineMs(options.node.type),
      ).toISOString(),
      inputs: options.inputs,
      config: options.config,
    })
  }

  private async getRunVo(runId: string): Promise<WorkflowTestRunVo> {
    const run = await this.workflowRunRepository.findRunSummary(runId)
    if (!run) throw new InternalServerErrorException('测试运行记录不存在')
    return toWorkflowTestRunVo(run)
  }

  private async emitRunEvents(
    runId: string,
    completedNodes: readonly WorkflowNodeExecutionStateVo[],
    outcome: 'applied' | 'duplicate' | 'stale',
  ): Promise<void> {
    if (outcome !== 'applied' || !this.workflowRunEventStream.hasSubscribers(runId)) return

    try {
      const run = await this.getRunVo(runId)
      for (const node of completedNodes) {
        this.workflowRunEventStream.publishNodeFinished(runId, node, {
          nodeRuns: run.nodeRuns,
          nodeStates: run.nodeStates,
          loopIterations: run.loopIterations,
          traceNodeDurations: run.traceNodeDurations,
          traceNodeIds: run.traceNodeIds,
          traceExecutions: run.traceExecutions,
        })
      }
      if (run.status !== WorkflowRunStatus.RUNNING) {
        this.workflowRunEventStream.publishWorkflowFinished(run)
      }
    } catch (error) {
      this.logger.warn(
        `Workflow SSE 事件发布失败 runId=${runId}：${getErrorMessage(error, '未知错误')}`,
      )
    }
  }
}

function resolveExecutionDeadlineMs(nodeType: string): number {
  return nodeType === BuiltinNodeType.LLM || nodeType === BuiltinNodeType.SUB_WORKFLOW
    ? LONG_RUNNING_EXECUTION_DEADLINE_MS
    : DEFAULT_EXECUTION_DEADLINE_MS
}

function toWorkflowRunListItemVo(run: WorkflowRunListItem): WorkflowRunListItemVo {
  return {
    id: run.id,
    traceId: run.traceId,
    trigger: run.trigger,
    mode: run.mode,
    status: run.status,
    queuedAt: run.queuedAt,
    ...(run.startedAt ? { startedAt: run.startedAt } : {}),
    ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
    ...(run.durationMs !== null ? { durationMs: run.durationMs } : {}),
    ...(run.triggeredBy ? { triggeredBy: run.triggeredBy } : {}),
  }
}

function toWorkflowTestRunVo(run: WorkflowRunSummary): WorkflowTestRunVo {
  const trace = collectRunTrace(run)

  return {
    id: run.id,
    traceId: run.traceId,
    trigger: run.trigger,
    mode: run.mode,
    ...(run.targetNodeId ? { targetNodeId: run.targetNodeId } : {}),
    status: run.status,
    input: run.input,
    ...(run.output !== null ? { output: run.output } : {}),
    queuedAt: run.queuedAt,
    ...(run.startedAt ? { startedAt: run.startedAt } : {}),
    ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
    ...(run.durationMs !== null ? { durationMs: run.durationMs } : {}),
    ...(run.triggeredBy ? { triggeredBy: run.triggeredBy } : {}),
    ...(run.errorCode && run.errorMessage
      ? {
          error: {
            code: run.errorCode,
            message: run.errorMessage,
            ...(run.errorDetails !== null ? { details: run.errorDetails } : {}),
          },
        }
      : {}),
    nodeRuns: run.nodeRuns.map((nodeRun) => ({
      id: nodeRun.id,
      executionKey: nodeRun.executionKey,
      nodeId: nodeRun.nodeId,
      nodeType: nodeRun.nodeType,
      status: nodeRun.status,
      ...(nodeRun.input !== null ? { input: nodeRun.input } : {}),
      ...(nodeRun.output !== null ? { output: nodeRun.output } : {}),
      ...(nodeRun.startedAt ? { startedAt: nodeRun.startedAt } : {}),
      ...(nodeRun.finishedAt ? { finishedAt: nodeRun.finishedAt } : {}),
      ...(nodeRun.durationMs !== null ? { durationMs: nodeRun.durationMs } : {}),
      ...(nodeRun.errorCode && nodeRun.errorMessage
        ? {
            error: {
              code: nodeRun.errorCode,
              message: nodeRun.errorMessage,
              ...(nodeRun.errorDetails !== null ? { details: nodeRun.errorDetails } : {}),
            },
          }
        : {}),
    })),
    nodeStates: collectRunNodeStates(run),
    loopIterations: collectLoopIterations(run.runtimeState),
    traceNodeDurations: trace.nodeDurations,
    traceNodeIds: trace.nodeIds,
    traceExecutions: trace.executions,
  }
}

function collectLoopIterations(runtimeState: unknown): WorkflowTestRunVo['loopIterations'] {
  const parsedRuntimeState = runtimeStateSchema.safeParse(runtimeState)
  if (!parsedRuntimeState.success) return {}

  return Object.fromEntries(
    Object.entries(parsedRuntimeState.data.loopStates).map(([loopNodeId, loopState]) => [
      loopNodeId,
      {
        iteration: loopState.iteration,
        maxIterations: loopState.maxIterations,
      },
    ]),
  )
}

function collectRunTrace(run: WorkflowRunSummary): {
  nodeDurations: Record<string, number>
  nodeIds: string[]
  executions: WorkflowTestRunVo['traceExecutions']
} {
  const parsedRuntimeState = runtimeStateSchema.safeParse(run.runtimeState)
  const orderedExecutions = parsedRuntimeState.success
    ? Object.values(parsedRuntimeState.data.executions).sort(
        (left, right) => left.sequence - right.sequence,
      )
    : []
  const nodeIds = [
    ...new Set(
      orderedExecutions.length > 0
        ? orderedExecutions.map((execution) => execution.nodeId)
        : run.nodeRuns.map((nodeRun) => nodeRun.nodeId),
    ),
  ]
  const nodeDurations: Record<string, number> = {}
  const nodeRunByExecutionKey = new Map(
    run.nodeRuns.map((nodeRun) => [nodeRun.executionKey, nodeRun]),
  )

  for (const nodeRun of run.nodeRuns) {
    if (nodeRun.durationMs !== null) nodeDurations[nodeRun.nodeId] = nodeRun.durationMs
  }
  for (const execution of orderedExecutions) {
    if (
      nodeDurations[execution.nodeId] === undefined &&
      execution.status !== RUNTIME_EXECUTION_STATUSES.RUNNING
    ) {
      nodeDurations[execution.nodeId] = execution.durationMs ?? 0
    }
  }

  const executions: WorkflowTestRunVo['traceExecutions'] = orderedExecutions.map((execution) => {
    const nodeRun = nodeRunByExecutionKey.get(execution.executionKey)
    const error =
      nodeRun?.errorCode && nodeRun.errorMessage
        ? {
            code: nodeRun.errorCode,
            message: nodeRun.errorMessage,
            ...(nodeRun.errorDetails !== null ? { details: nodeRun.errorDetails } : {}),
          }
        : execution.error

    return {
      executionKey: execution.executionKey,
      nodeId: execution.nodeId,
      scopeKey: execution.scopeKey,
      sequence: execution.sequence,
      ...(execution.iteration ? { iteration: execution.iteration } : {}),
      status: nodeRun?.status ?? execution.status,
      input: nodeRun?.input ?? execution.inputs,
      ...(nodeRun?.output !== null && nodeRun?.output !== undefined
        ? { output: nodeRun.output }
        : execution.outputs
          ? { output: execution.outputs }
          : {}),
      ...((nodeRun?.durationMs ?? execution.durationMs) !== null &&
      (nodeRun?.durationMs ?? execution.durationMs) !== undefined
        ? { durationMs: nodeRun?.durationMs ?? execution.durationMs }
        : {}),
      ...(error ? { error } : {}),
    }
  })

  if (executions.length === 0) {
    executions.push(
      ...run.nodeRuns.map((nodeRun, sequence) => ({
        executionKey: nodeRun.executionKey,
        nodeId: nodeRun.nodeId,
        scopeKey: 'root',
        sequence,
        status: nodeRun.status,
        input: nodeRun.input ?? {},
        ...(nodeRun.output !== null ? { output: nodeRun.output } : {}),
        ...(nodeRun.durationMs !== null ? { durationMs: nodeRun.durationMs } : {}),
        ...(nodeRun.errorCode && nodeRun.errorMessage
          ? {
              error: {
                code: nodeRun.errorCode,
                message: nodeRun.errorMessage,
                ...(nodeRun.errorDetails !== null ? { details: nodeRun.errorDetails } : {}),
              },
            }
          : {}),
      })),
    )
  }

  return { nodeDurations, nodeIds, executions }
}

function collectRunNodeStates(run: WorkflowRunSummary): WorkflowNodeExecutionStateVo[] {
  const states = new Map<string, WorkflowNodeExecutionStateVo['status']>()
  const includeRunning = run.status === WorkflowRunStatus.RUNNING

  for (const nodeRun of run.nodeRuns) {
    if (
      (includeRunning &&
        (nodeRun.status === WorkflowNodeRunStatus.PENDING ||
          nodeRun.status === WorkflowNodeRunStatus.RUNNING)) ||
      nodeRun.status === WorkflowNodeRunStatus.SUCCEEDED ||
      nodeRun.status === WorkflowNodeRunStatus.FAILED ||
      nodeRun.status === WorkflowNodeRunStatus.TIMED_OUT
    ) {
      states.set(
        nodeRun.nodeId,
        nodeRun.status === WorkflowNodeRunStatus.PENDING
          ? 'RUNNING'
          : nodeRun.status === WorkflowNodeRunStatus.TIMED_OUT
            ? 'FAILED'
            : nodeRun.status,
      )
    }
  }

  const parsedRuntimeState = runtimeStateSchema.safeParse(run.runtimeState)
  if (parsedRuntimeState.success) {
    for (const [nodeId, nodeState] of Object.entries(parsedRuntimeState.data.nodeStates)) {
      if (
        (includeRunning && nodeState.status === RUNTIME_NODE_STATUSES.RUNNING) ||
        nodeState.status === RUNTIME_NODE_STATUSES.SUCCEEDED ||
        nodeState.status === RUNTIME_NODE_STATUSES.FAILED
      ) {
        states.set(nodeId, nodeState.status)
      }
    }
  }

  return [...states].map(([nodeId, status]) => ({ nodeId, status }))
}

function collectCompletedNodeTransitions(
  previousState: RuntimeState,
  nextState: RuntimeState,
): WorkflowNodeExecutionStateVo[] {
  const completed: WorkflowNodeExecutionStateVo[] = []

  for (const [nodeId, nextNodeState] of Object.entries(nextState.nodeStates)) {
    const previousNodeState = previousState.nodeStates[nodeId]
    if (
      previousNodeState?.status === RUNTIME_NODE_STATUSES.RUNNING &&
      nextNodeState.status === RUNTIME_NODE_STATUSES.RUNNING &&
      previousNodeState.latestExecutionKey !== nextNodeState.latestExecutionKey
    ) {
      completed.push({ nodeId, status: 'SUCCEEDED' })
      continue
    }

    if (
      nextNodeState.status !== RUNTIME_NODE_STATUSES.SUCCEEDED &&
      nextNodeState.status !== RUNTIME_NODE_STATUSES.FAILED
    ) {
      continue
    }
    if (previousNodeState?.status === nextNodeState.status) continue
    completed.push({ nodeId, status: nextNodeState.status })
  }

  return completed
}

function getRuntimeTerminal(transition: RuntimeTransition): {
  status: RuntimeState['status']
  output?: Record<string, JsonValue>
  error?: RuntimeErrorData
} {
  const complete = transition.effects.find((effect) => effect.type === 'COMPLETE_RUN')
  const failure = transition.effects.find((effect) => effect.type === 'FAIL_RUN')

  return {
    status: transition.state.status,
    ...(complete?.type === 'COMPLETE_RUN' ? { output: complete.outputs } : {}),
    ...(failure?.type === 'FAIL_RUN' ? { error: failure.error } : {}),
  }
}

function resolveSingleNodeRunInput(
  node: WorkflowNode,
  providedInput?: Record<string, unknown>,
): Record<string, JsonValue> {
  const inputKeys = Object.keys(node.inputs)

  if (providedInput) {
    if (inputKeys.length === 0) return parseProvidedSingleNodeInput(providedInput, [])

    return parseProvidedSingleNodeInput(providedInput, inputKeys)
  }

  return Object.fromEntries(
    Object.entries(node.inputs).map(([key, value]) => [key, resolveSingleNodeVariableValue(value)]),
  )
}

function parseProvidedSingleNodeInput(
  providedInput: Record<string, unknown>,
  requiredKeys: readonly string[],
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {}

  for (const key of requiredKeys) {
    const value = providedInput[key]
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`输入变量 ${key} 不能为空`)
    }

    const parsed = jsonValueSchema.safeParse(value)
    if (!parsed.success) {
      throw new BadRequestException(`输入变量 ${key} 必须是可序列化 JSON 值`)
    }

    result[key] = parsed.data
  }

  if (requiredKeys.length > 0) return result

  for (const [key, value] of Object.entries(providedInput)) {
    if (value === undefined || value === null || value === '') continue
    const parsed = jsonValueSchema.safeParse(value)
    if (!parsed.success) {
      throw new BadRequestException(`输入变量 ${key} 必须是可序列化 JSON 值`)
    }
    result[key] = parsed.data
  }

  return result
}

function resolveSingleNodeVariableValue(value: VariableValue): JsonValue {
  if (value.type === 'reference') {
    throw new BadRequestException(
      '单节点测试无法解析引用变量，请在运行面板填写直接值或改用完整运行',
    )
  }

  const parsed = jsonValueSchema.safeParse(value.value)
  if (!parsed.success) {
    throw new BadRequestException('单节点测试输入必须是可序列化 JSON 值')
  }

  return parsed.data
}

function createRunSystemVariables(
  ownerId: string,
  appId: string,
  workflowId: string,
  runId: string,
): Record<SystemVariableKey, JsonValue> {
  return {
    [SYSTEM_VARIABLE_KEYS.USER_ID]: ownerId,
    [SYSTEM_VARIABLE_KEYS.APP_ID]: appId,
    [SYSTEM_VARIABLE_KEYS.WORKFLOW_ID]: workflowId,
    [SYSTEM_VARIABLE_KEYS.WORKFLOW_RUN_ID]: runId,
    [SYSTEM_VARIABLE_KEYS.TIMESTAMP]: Date.now(),
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function createFailedResult(command: ExecuteNodeCommand, code: string, message: string) {
  return parseExecuteNodeResult({
    protocolVersion: command.protocolVersion,
    commandId: command.commandId,
    nodeRunId: command.nodeRunId,
    executionKey: command.executionKey,
    leaseToken: command.leaseToken,
    status: 'FAILED',
    error: { code, message, retryable: false },
  })
}
