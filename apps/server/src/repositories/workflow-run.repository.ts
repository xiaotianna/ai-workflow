import type {
  PreparedNodeDispatch,
  RuntimeTerminalData,
  RuntimeTransitionPersistence,
} from '@/common/interfaces/workflow-run-persistence.interface'
import type { TestRunMode, WorkflowRunListScope } from '@/dto/workflow-run.dto'
import {
  Prisma,
  WorkflowCommandOutboxStatus,
  WorkflowNodeRunStatus,
  WorkflowRunStatus,
  WorkflowRunTrigger,
  WorkflowVersionSource,
} from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import type { JsonValue } from '@ai-workflow/core'
import type { ExecuteNodeCommand } from '@ai-workflow/protocol'
import {
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_RUN_STATUSES,
  type RuntimeState,
} from '@ai-workflow/runtime'
import { Injectable } from '@nestjs/common'

interface CreateTestRunOptions {
  ownerId: string
  appId: string
  workflowId: string
  versionId: string
  runId: string
  traceId: string
  mode: TestRunMode
  targetNodeId?: string
  definition: unknown
  layout: unknown
  input: Record<string, unknown>
  runtimeState?: RuntimeState
  terminal: RuntimeTerminalData
  dispatches: readonly PreparedNodeDispatch[]
}

interface CreateApiRunOptions {
  appId: string
  ownerId: string
  workflowId: string
  versionId: string
  runId: string
  traceId: string
  input: Record<string, unknown>
  runtimeState: RuntimeState
  terminal: RuntimeTerminalData
  dispatches: readonly PreparedNodeDispatch[]
}

interface CreateSubWorkflowRunOptions {
  parentCommand: ExecuteNodeCommand
  childRunId: string
  childWorkflowId: string
  childVersionId: string
  traceId: string
  input: Record<string, JsonValue>
  runtimeState: RuntimeState
  terminal: RuntimeTerminalData
  dispatches: readonly PreparedNodeDispatch[]
}

interface CompleteSingleNodeRunOptions {
  runId: string
  result: RuntimeTransitionPersistence['result']
  transportError?: string
}

type ApplyRuntimeResult = 'applied' | 'duplicate' | 'stale' | 'conflict'
type CancelRunResult = 'cancelled' | 'unchanged' | 'not-found'

interface ClaimPendingCommandsOptions {
  limit: number
  staleBefore: Date
}

interface ReleaseCommandClaimOptions {
  commandId: string
  error: string
  nextAttemptAt?: Date
  failed?: boolean
}

interface FailCommandOptions {
  commandId: string
  errorCode: string
  errorMessage: string
  runStatus: typeof WorkflowRunStatus.FAILED | typeof WorkflowRunStatus.TIMED_OUT
  nodeRunStatus: typeof WorkflowNodeRunStatus.FAILED | typeof WorkflowNodeRunStatus.TIMED_OUT
}

interface WorkflowRunCursor {
  id: string
  queuedAt: Date
}

interface ListOwnedRunsOptions {
  ownerId: string
  appId: string
  limit: number
  cursor?: WorkflowRunCursor
  scope: WorkflowRunListScope
  status?: WorkflowRunStatus
  trigger?: WorkflowRunTrigger
  from?: Date
  search?: string
}

interface ListApiRunsOptions {
  appId: string
  limit: number
  cursor?: WorkflowRunCursor
  status?: WorkflowRunStatus
  from?: Date
  search?: string
}

const PUBLISHED_CALL_TRIGGERS: WorkflowRunTrigger[] = [
  WorkflowRunTrigger.API,
  WorkflowRunTrigger.SUB_WORKFLOW,
]

export interface ClaimedWorkflowCommand {
  id: string
  payload: unknown
  executionClass: string
  routingKey: string
  publishAttempts: number
}

@Injectable()
export class WorkflowRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  createTestRun(options: CreateTestRunOptions): Promise<'created' | 'not-found'> {
    return this.prisma.$transaction(async (transaction) => {
      const app = await transaction.app.findFirst({
        where: {
          id: options.appId,
          ownerId: options.ownerId,
          deletedAt: null,
        },
        select: {
          workflow: {
            select: { id: true },
          },
        },
      })

      if (app?.workflow?.id !== options.workflowId) return 'not-found'

      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "workflows" WHERE "id" = ${options.workflowId}::uuid FOR UPDATE`,
      )

      const latestVersion = await transaction.workflowVersion.aggregate({
        where: { workflowId: options.workflowId },
        _max: { version: true },
      })

      await transaction.workflowVersion.create({
        data: {
          id: options.versionId,
          workflowId: options.workflowId,
          version: (latestVersion._max.version ?? 0) + 1,
          source: WorkflowVersionSource.TEST_RUN,
          definition: toJsonInput(options.definition),
          layout: toJsonInput(options.layout),
          note: options.mode === 'FULL' ? '完整工作流测试运行' : '单节点测试运行',
          createdById: options.ownerId,
        },
      })

      const now = new Date()
      const status = toWorkflowRunStatus(options.terminal.status)
      const terminal = status !== WorkflowRunStatus.RUNNING

      await transaction.workflowRun.create({
        data: {
          id: options.runId,
          workflowId: options.workflowId,
          workflowVersionId: options.versionId,
          triggeredById: options.ownerId,
          traceId: options.traceId,
          trigger: WorkflowRunTrigger.TEST_RUN,
          mode: options.mode,
          targetNodeId: options.targetNodeId,
          status,
          runtimeState: options.runtimeState ? toJsonInput(options.runtimeState) : Prisma.DbNull,
          runtimeRevision: options.runtimeState?.revision ?? 0,
          input: toJsonInput(options.input),
          output: options.terminal.output ? toJsonInput(options.terminal.output) : undefined,
          errorCode: options.terminal.error?.code,
          errorMessage: options.terminal.error?.message,
          errorDetails: options.terminal.error?.details
            ? toJsonInput(options.terminal.error.details)
            : undefined,
          startedAt: now,
          finishedAt: terminal ? now : undefined,
          durationMs: terminal ? durationFrom(now, now) : undefined,
        },
      })

      await createDispatchRecords(transaction, options.runId, options.dispatches, now)
      return 'created'
    })
  }

  createApiRun(options: CreateApiRunOptions): Promise<'created' | 'not-found'> {
    return this.prisma.$transaction(async (transaction) => {
      const version = await transaction.workflowVersion.findFirst({
        where: {
          id: options.versionId,
          workflowId: options.workflowId,
          source: WorkflowVersionSource.PUBLISH,
          workflow: {
            appId: options.appId,
            app: { deletedAt: null },
          },
        },
        select: { id: true },
      })
      if (!version) return 'not-found'

      const now = new Date()
      const status = toWorkflowRunStatus(options.terminal.status)
      const terminal = status !== WorkflowRunStatus.RUNNING
      await transaction.workflowRun.create({
        data: {
          id: options.runId,
          workflowId: options.workflowId,
          workflowVersionId: version.id,
          triggeredById: options.ownerId,
          traceId: options.traceId,
          trigger: WorkflowRunTrigger.API,
          status,
          runtimeState: toJsonInput(options.runtimeState),
          runtimeRevision: options.runtimeState.revision,
          input: toJsonInput(options.input),
          output: options.terminal.output ? toJsonInput(options.terminal.output) : undefined,
          errorCode: options.terminal.error?.code,
          errorMessage: options.terminal.error?.message,
          errorDetails: options.terminal.error?.details
            ? toJsonInput(options.terminal.error.details)
            : undefined,
          startedAt: now,
          finishedAt: terminal ? now : undefined,
          durationMs: terminal ? durationFrom(now, now) : undefined,
        },
      })
      await createDispatchRecords(transaction, options.runId, options.dispatches, now)
      return 'created'
    })
  }

  async findSubWorkflowTarget(parentRunId: string, workflowId: string) {
    const parent = await this.prisma.workflowRun.findUnique({
      where: { id: parentRunId },
      select: { triggeredById: true, workflowId: true, parentRunId: true },
    })
    if (!parent?.triggeredById) return null

    const ancestorWorkflowIds = new Set<string>([parent.workflowId])
    let ancestorRunId = parent.parentRunId
    while (ancestorRunId) {
      // 子工作流调用深度通常很小；逐层读取可同时兼容 PostgreSQL 与测试数据库。
      // eslint-disable-next-line no-await-in-loop
      const ancestor = await this.prisma.workflowRun.findUnique({
        where: { id: ancestorRunId },
        select: { workflowId: true, parentRunId: true },
      })
      if (!ancestor) break
      ancestorWorkflowIds.add(ancestor.workflowId)
      ancestorRunId = ancestor.parentRunId
    }
    if (ancestorWorkflowIds.has(workflowId)) return { status: 'recursive' as const }

    const deployment = await this.prisma.workflowDeployment.findFirst({
      where: {
        workflowId,
        workflow: {
          app: { ownerId: parent.triggeredById, deletedAt: null },
        },
      },
      select: {
        workflow: { select: { appId: true } },
        version: { select: { id: true, definition: true } },
      },
    })
    return deployment
      ? {
          status: 'found' as const,
          version: deployment.version,
          workflow: deployment.workflow,
          triggeredById: parent.triggeredById,
        }
      : null
  }

  createSubWorkflowRun(
    options: CreateSubWorkflowRunOptions,
  ): Promise<'created' | 'duplicate' | 'stale'> {
    return this.prisma.$transaction(async (transaction) => {
      const parentNodeRun = await transaction.workflowNodeRun.findUnique({
        where: { id: options.parentCommand.nodeRunId },
        select: {
          runId: true,
          commandId: true,
          leaseToken: true,
          status: true,
          childRun: { select: { id: true } },
          run: { select: { status: true, triggeredById: true } },
        },
      })
      if (parentNodeRun?.childRun) return 'duplicate'
      if (
        !parentNodeRun ||
        parentNodeRun.runId !== options.parentCommand.runId ||
        parentNodeRun.commandId !== options.parentCommand.commandId ||
        parentNodeRun.leaseToken !== options.parentCommand.leaseToken ||
        parentNodeRun.status !== WorkflowNodeRunStatus.RUNNING ||
        parentNodeRun.run.status !== WorkflowRunStatus.RUNNING
      ) {
        return 'stale'
      }

      const now = new Date()
      const status = toWorkflowRunStatus(options.terminal.status)
      const terminal = status !== WorkflowRunStatus.RUNNING
      await transaction.workflowRun.create({
        data: {
          id: options.childRunId,
          workflowId: options.childWorkflowId,
          workflowVersionId: options.childVersionId,
          triggeredById: parentNodeRun.run.triggeredById,
          parentRunId: options.parentCommand.runId,
          parentNodeRunId: options.parentCommand.nodeRunId,
          traceId: options.traceId,
          trigger: WorkflowRunTrigger.SUB_WORKFLOW,
          status,
          runtimeState: toJsonInput(options.runtimeState),
          runtimeRevision: options.runtimeState.revision,
          input: toJsonInput(options.input),
          output: options.terminal.output ? toJsonInput(options.terminal.output) : undefined,
          errorCode: options.terminal.error?.code,
          errorMessage: options.terminal.error?.message,
          errorDetails: options.terminal.error?.details
            ? toJsonInput(options.terminal.error.details)
            : undefined,
          startedAt: now,
          finishedAt: terminal ? now : undefined,
          durationMs: terminal ? durationFrom(now, now) : undefined,
        },
      })
      await createDispatchRecords(transaction, options.childRunId, options.dispatches, now)
      await transaction.workflowCommandOutbox.update({
        where: { id: options.parentCommand.commandId },
        data: {
          status: WorkflowCommandOutboxStatus.PUBLISHED,
          claimedAt: null,
          publishedAt: now,
          lastError: null,
        },
      })
      return 'created'
    })
  }

  findChildRunCompletion(childRunId: string) {
    return this.prisma.workflowRun.findUnique({
      where: { id: childRunId },
      select: {
        status: true,
        output: true,
        errorCode: true,
        errorMessage: true,
        errorDetails: true,
        parentNodeRun: {
          select: {
            commandId: true,
            id: true,
            executionKey: true,
            leaseToken: true,
          },
        },
      },
    })
  }

  async findPendingChildCompletionIds(limit: number): Promise<string[]> {
    const childRuns = await this.prisma.workflowRun.findMany({
      where: {
        status: {
          in: [
            WorkflowRunStatus.SUCCEEDED,
            WorkflowRunStatus.FAILED,
            WorkflowRunStatus.TIMED_OUT,
            WorkflowRunStatus.CANCELLED,
          ],
        },
        parentNodeRun: {
          is: {
            status: WorkflowNodeRunStatus.RUNNING,
            resultInbox: { is: null },
            run: { status: WorkflowRunStatus.RUNNING },
          },
        },
      },
      orderBy: { finishedAt: 'asc' },
      take: limit,
      select: { id: true },
    })

    return childRuns.map((run) => run.id)
  }

  claimPendingCommands(options: ClaimPendingCommandsOptions): Promise<ClaimedWorkflowCommand[]> {
    return this.prisma.$transaction(async (transaction) => {
      const commands = await transaction.$queryRaw<ClaimedWorkflowCommand[]>(Prisma.sql`
        WITH candidates AS (
          SELECT "id"
          FROM "workflow_command_outbox"
          WHERE
            (
              "status" = 'PENDING'::"WorkflowCommandOutboxStatus"
              AND "nextAttemptAt" <= CURRENT_TIMESTAMP
            )
            OR (
              "status" = 'PUBLISHING'::"WorkflowCommandOutboxStatus"
              AND "claimedAt" <= ${options.staleBefore}
            )
          ORDER BY "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${options.limit}
        )
        UPDATE "workflow_command_outbox" AS outbox
        SET
          "status" = 'PUBLISHING'::"WorkflowCommandOutboxStatus",
          "publishAttempts" = outbox."publishAttempts" + 1,
          "claimedAt" = CURRENT_TIMESTAMP,
          "lastError" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
        FROM candidates
        WHERE outbox."id" = candidates."id"
        RETURNING
          outbox."id",
          outbox."payload",
          outbox."executionClass",
          outbox."routingKey",
          outbox."publishAttempts"
      `)

      if (commands.length > 0) {
        await transaction.workflowNodeRun.updateMany({
          where: {
            commandId: { in: commands.map((command) => command.id) },
            status: WorkflowNodeRunStatus.PENDING,
          },
          data: {
            status: WorkflowNodeRunStatus.RUNNING,
          },
        })
      }

      return commands
    })
  }

  async markCommandPublished(commandId: string): Promise<void> {
    await this.prisma.workflowCommandOutbox.updateMany({
      where: {
        id: commandId,
        status: WorkflowCommandOutboxStatus.PUBLISHING,
      },
      data: {
        status: WorkflowCommandOutboxStatus.PUBLISHED,
        claimedAt: null,
        publishedAt: new Date(),
        lastError: null,
      },
    })
  }

  async releaseCommandClaim(options: ReleaseCommandClaimOptions): Promise<void> {
    await this.prisma.workflowCommandOutbox.updateMany({
      where: {
        id: options.commandId,
        status: WorkflowCommandOutboxStatus.PUBLISHING,
      },
      data: {
        status: options.failed
          ? WorkflowCommandOutboxStatus.FAILED
          : WorkflowCommandOutboxStatus.PENDING,
        claimedAt: null,
        lastError: options.error,
        ...(options.nextAttemptAt ? { nextAttemptAt: options.nextAttemptAt } : {}),
      },
    })
  }

  failCommand(options: FailCommandOptions): Promise<string | undefined> {
    return this.prisma.$transaction(async (transaction) => {
      const command = await transaction.workflowCommandOutbox.findUnique({
        where: { id: options.commandId },
        select: {
          runId: true,
          nodeRunId: true,
          nodeRun: { select: { startedAt: true } },
          run: { select: { startedAt: true } },
        },
      })
      if (!command) return

      const now = new Date()
      const runUpdated = await transaction.workflowRun.updateMany({
        where: { id: command.runId, status: WorkflowRunStatus.RUNNING },
        data: {
          status: options.runStatus,
          errorCode: options.errorCode,
          errorMessage: options.errorMessage,
          finishedAt: now,
          durationMs: durationFrom(command.run.startedAt, now),
        },
      })
      if (runUpdated.count !== 1) return

      await cancelPendingDispatches(transaction, command.runId, now)
      await transaction.workflowNodeRun.update({
        where: { id: command.nodeRunId },
        data: {
          status: options.nodeRunStatus,
          errorCode: options.errorCode,
          errorMessage: options.errorMessage,
          finishedAt: now,
          durationMs: durationFrom(command.nodeRun.startedAt, now),
        },
      })
      await transaction.workflowCommandOutbox.update({
        where: { id: options.commandId },
        data: {
          status: WorkflowCommandOutboxStatus.FAILED,
          claimedAt: null,
          lastError: options.errorMessage,
        },
      })

      return command.runId
    })
  }

  async findExpiredCommandIds(now: Date, limit: number): Promise<string[]> {
    const nodeRuns = await this.prisma.workflowNodeRun.findMany({
      where: {
        status: {
          in: [WorkflowNodeRunStatus.PENDING, WorkflowNodeRunStatus.RUNNING],
        },
        deadlineAt: { lte: now },
        run: { status: WorkflowRunStatus.RUNNING },
      },
      orderBy: { deadlineAt: 'asc' },
      take: limit,
      select: { commandId: true },
    })

    return nodeRuns.map((nodeRun) => nodeRun.commandId)
  }

  cancelOwnedRun(ownerId: string, appId: string, runId: string): Promise<CancelRunResult> {
    return this.prisma.$transaction(async (transaction) => {
      const run = await transaction.workflowRun.findFirst({
        where: {
          id: runId,
          trigger: WorkflowRunTrigger.TEST_RUN,
          workflow: {
            appId,
            app: {
              ownerId,
              deletedAt: null,
            },
          },
        },
        select: { startedAt: true },
      })
      if (!run) return 'not-found'

      const now = new Date()
      const updated = await transaction.workflowRun.updateMany({
        where: { id: runId, status: WorkflowRunStatus.RUNNING },
        data: {
          status: WorkflowRunStatus.CANCELLED,
          finishedAt: now,
          durationMs: durationFrom(run.startedAt, now),
        },
      })
      if (updated.count !== 1) return 'unchanged'

      const descendantRunIds = await cancelRunningDescendantRuns(transaction, runId, now)
      await cancelPendingDispatches(transaction, [runId, ...descendantRunIds], now)
      return 'cancelled'
    })
  }

  findResultContext(commandId: string) {
    return this.prisma.workflowNodeRun.findUnique({
      where: { commandId },
      select: {
        id: true,
        runId: true,
        nodeId: true,
        nodeType: true,
        executionKey: true,
        commandId: true,
        leaseToken: true,
        deadlineAt: true,
        status: true,
        resultInbox: { select: { id: true } },
        run: {
          select: {
            mode: true,
            status: true,
            runtimeState: true,
            runtimeRevision: true,
            workflowVersionId: true,
            version: { select: { definition: true } },
          },
        },
      },
    })
  }

  applyRuntimeResult(
    runId: string,
    transition: RuntimeTransitionPersistence,
  ): Promise<ApplyRuntimeResult> {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.workflowResultInbox.findUnique({
        where: { commandId: transition.result.commandId },
        select: { id: true },
      })
      if (duplicate) return 'duplicate'

      const nodeRun = await transaction.workflowNodeRun.findUnique({
        where: { id: transition.result.nodeRunId },
        select: {
          runId: true,
          commandId: true,
          leaseToken: true,
          status: true,
          startedAt: true,
          deadlineAt: true,
          run: {
            select: { startedAt: true },
          },
        },
      })

      if (
        !nodeRun ||
        nodeRun.runId !== runId ||
        nodeRun.commandId !== transition.result.commandId ||
        nodeRun.leaseToken !== transition.result.leaseToken ||
        nodeRun.status !== WorkflowNodeRunStatus.RUNNING
      ) {
        return 'stale'
      }

      const now = new Date()
      if (nodeRun.deadlineAt.getTime() <= now.getTime()) return 'stale'

      const runUpdated = await transaction.workflowRun.updateMany({
        where: {
          id: runId,
          status: WorkflowRunStatus.RUNNING,
          runtimeRevision: transition.expectedRevision,
        },
        data: createRuntimeRunUpdate(transition, nodeRun.run.startedAt, now),
      })

      if (runUpdated.count !== 1) return 'conflict'

      await transaction.workflowResultInbox.create({
        data: {
          commandId: transition.result.commandId,
          runId,
          nodeRunId: transition.result.nodeRunId,
          leaseToken: transition.result.leaseToken,
          payload: toJsonInput(transition.result),
        },
      })

      await transaction.workflowNodeRun.update({
        where: { id: transition.result.nodeRunId },
        data: createRuntimeNodeResultUpdate(transition, nodeRun.startedAt, now),
      })

      await transaction.workflowCommandOutbox.update({
        where: { id: transition.result.commandId },
        data: transition.transportError
          ? {
              status: WorkflowCommandOutboxStatus.FAILED,
              claimedAt: null,
              lastError: transition.transportError,
            }
          : {
              status: WorkflowCommandOutboxStatus.PUBLISHED,
              claimedAt: null,
              publishedAt: now,
              lastError: null,
            },
      })

      await createDispatchRecords(transaction, runId, transition.dispatches, now)

      if (transition.terminal.status !== RUNTIME_RUN_STATUSES.RUNNING) {
        await cancelPendingDispatches(transaction, runId, now)
      }

      return 'applied'
    })
  }

  completeSingleNodeRun(options: CompleteSingleNodeRunOptions): Promise<ApplyRuntimeResult> {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.workflowResultInbox.findUnique({
        where: { commandId: options.result.commandId },
        select: { id: true },
      })
      if (duplicate) return 'duplicate'

      const nodeRun = await transaction.workflowNodeRun.findUnique({
        where: { id: options.result.nodeRunId },
        select: {
          runId: true,
          commandId: true,
          leaseToken: true,
          status: true,
          startedAt: true,
          deadlineAt: true,
        },
      })

      if (
        !nodeRun ||
        nodeRun.runId !== options.runId ||
        nodeRun.commandId !== options.result.commandId ||
        nodeRun.leaseToken !== options.result.leaseToken ||
        nodeRun.status !== WorkflowNodeRunStatus.RUNNING
      ) {
        return 'stale'
      }

      const now = new Date()
      if (nodeRun.deadlineAt.getTime() <= now.getTime()) return 'stale'

      const runUpdated = await transaction.workflowRun.updateMany({
        where: { id: options.runId, status: WorkflowRunStatus.RUNNING },
        data:
          options.result.status === 'SUCCEEDED'
            ? {
                status: WorkflowRunStatus.SUCCEEDED,
                output: toJsonInput(options.result.outputs),
                finishedAt: now,
                durationMs: durationFrom(nodeRun.startedAt, now),
              }
            : {
                status: WorkflowRunStatus.FAILED,
                errorCode: options.result.error.code,
                errorMessage: options.result.error.message,
                errorDetails: options.result.error.details
                  ? toJsonInput(options.result.error.details)
                  : undefined,
                finishedAt: now,
                durationMs: durationFrom(nodeRun.startedAt, now),
              },
      })

      if (runUpdated.count !== 1) return 'conflict'

      await transaction.workflowResultInbox.create({
        data: {
          commandId: options.result.commandId,
          runId: options.runId,
          nodeRunId: options.result.nodeRunId,
          leaseToken: options.result.leaseToken,
          payload: toJsonInput(options.result),
        },
      })
      await transaction.workflowNodeRun.update({
        where: { id: options.result.nodeRunId },
        data: createNodeResultUpdate(options.result, nodeRun.startedAt, now),
      })
      await transaction.workflowCommandOutbox.update({
        where: { id: options.result.commandId },
        data: options.transportError
          ? {
              status: WorkflowCommandOutboxStatus.FAILED,
              claimedAt: null,
              lastError: options.transportError,
            }
          : {
              status: WorkflowCommandOutboxStatus.PUBLISHED,
              claimedAt: null,
              publishedAt: now,
              lastError: null,
            },
      })

      return 'applied'
    })
  }

  findRunSummary(runId: string) {
    return this.prisma.workflowRun.findUnique({
      where: { id: runId },
      select: workflowRunSummarySelect,
    })
  }

  findOwnedWorkflow(ownerId: string, appId: string) {
    return this.prisma.workflow.findFirst({
      where: {
        appId,
        app: {
          ownerId,
          deletedAt: null,
        },
      },
      select: { id: true },
    })
  }

  listOwnedRuns(options: ListOwnedRunsOptions) {
    const conditions: Prisma.WorkflowRunWhereInput[] = []
    const publishedCallTriggers = options.trigger
      ? options.trigger === WorkflowRunTrigger.API ||
        options.trigger === WorkflowRunTrigger.SUB_WORKFLOW
        ? [options.trigger]
        : []
      : PUBLISHED_CALL_TRIGGERS

    if (options.cursor) {
      conditions.push({
        OR: [
          { queuedAt: { lt: options.cursor.queuedAt } },
          {
            queuedAt: options.cursor.queuedAt,
            id: { lt: options.cursor.id },
          },
        ],
      })
    }

    if (options.search) {
      conditions.push({
        OR: [
          { traceId: { contains: options.search, mode: 'insensitive' } },
          {
            triggeredBy: {
              username: { contains: options.search, mode: 'insensitive' },
            },
          },
        ],
      })
    }

    return this.prisma.workflowRun.findMany({
      where: {
        workflow: {
          appId: options.appId,
          app: {
            ownerId: options.ownerId,
            deletedAt: null,
          },
        },
        ...(options.scope === 'published_calls'
          ? {
              version: { source: WorkflowVersionSource.PUBLISH },
              trigger: { in: publishedCallTriggers },
            }
          : options.trigger
            ? { trigger: options.trigger }
            : {}),
        ...(options.status ? { status: options.status } : {}),
        ...(options.from ? { queuedAt: { gte: options.from } } : {}),
        ...(conditions.length > 0 ? { AND: conditions } : {}),
      },
      orderBy: [{ queuedAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
      select: workflowRunListItemSelect,
    })
  }

  listApiRuns(options: ListApiRunsOptions) {
    const conditions: Prisma.WorkflowRunWhereInput[] = []
    if (options.cursor) {
      conditions.push({
        OR: [
          { queuedAt: { lt: options.cursor.queuedAt } },
          { queuedAt: options.cursor.queuedAt, id: { lt: options.cursor.id } },
        ],
      })
    }
    if (options.search) {
      conditions.push({
        OR: [
          { traceId: { contains: options.search, mode: 'insensitive' } },
          {
            triggeredBy: {
              username: { contains: options.search, mode: 'insensitive' },
            },
          },
        ],
      })
    }

    return this.prisma.workflowRun.findMany({
      where: {
        trigger: { in: PUBLISHED_CALL_TRIGGERS },
        version: { source: WorkflowVersionSource.PUBLISH },
        workflow: { appId: options.appId, app: { deletedAt: null } },
        ...(options.status ? { status: options.status } : {}),
        ...(options.from ? { queuedAt: { gte: options.from } } : {}),
        ...(conditions.length > 0 ? { AND: conditions } : {}),
      },
      orderBy: [{ queuedAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
      select: workflowRunListItemSelect,
    })
  }

  findOwnedRunSummary(ownerId: string, appId: string, runId: string) {
    return this.prisma.workflowRun.findFirst({
      where: {
        id: runId,
        workflow: {
          appId,
          app: {
            ownerId,
            deletedAt: null,
          },
        },
      },
      select: workflowRunSummarySelect,
    })
  }

  findApiRunSummary(appId: string, runId: string) {
    return this.prisma.workflowRun.findFirst({
      where: {
        id: runId,
        trigger: { in: PUBLISHED_CALL_TRIGGERS },
        version: { source: WorkflowVersionSource.PUBLISH },
        workflow: { appId, app: { deletedAt: null } },
      },
      select: workflowRunSummarySelect,
    })
  }

  findOwnedRunDetail(ownerId: string, appId: string, runId: string) {
    return this.prisma.workflowRun.findFirst({
      where: {
        id: runId,
        workflow: {
          appId,
          app: {
            ownerId,
            deletedAt: null,
          },
        },
      },
      select: workflowRunDetailSelect,
    })
  }

  findLatestOwnedNodeRun(ownerId: string, appId: string, nodeId: string) {
    return this.prisma.workflowNodeRun.findFirst({
      where: {
        nodeId,
        run: {
          workflow: {
            appId,
            app: {
              ownerId,
              deletedAt: null,
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        runId: true,
        executionKey: true,
        nodeId: true,
        nodeType: true,
        status: true,
        input: true,
        output: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        errorCode: true,
        errorMessage: true,
        errorDetails: true,
        run: {
          select: {
            mode: true,
            trigger: true,
            status: true,
            triggeredBy: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    })
  }
}

const workflowRunListItemSelect = {
  id: true,
  traceId: true,
  trigger: true,
  mode: true,
  status: true,
  queuedAt: true,
  startedAt: true,
  finishedAt: true,
  durationMs: true,
  triggeredBy: {
    select: {
      id: true,
      username: true,
    },
  },
} satisfies Prisma.WorkflowRunSelect

const workflowRunSummarySelect = {
  id: true,
  traceId: true,
  trigger: true,
  mode: true,
  targetNodeId: true,
  status: true,
  runtimeState: true,
  input: true,
  output: true,
  errorCode: true,
  errorMessage: true,
  errorDetails: true,
  queuedAt: true,
  startedAt: true,
  finishedAt: true,
  durationMs: true,
  triggeredBy: {
    select: {
      id: true,
      username: true,
    },
  },
  nodeRuns: {
    orderBy: [{ createdAt: 'asc' }, { attempt: 'asc' }],
    select: {
      id: true,
      executionKey: true,
      nodeId: true,
      nodeType: true,
      status: true,
      input: true,
      output: true,
      errorCode: true,
      errorMessage: true,
      errorDetails: true,
      startedAt: true,
      finishedAt: true,
      durationMs: true,
    },
  },
} satisfies Prisma.WorkflowRunSelect

const workflowRunDetailSelect = {
  ...workflowRunSummarySelect,
  version: {
    select: {
      definition: true,
      layout: true,
    },
  },
} satisfies Prisma.WorkflowRunSelect

async function createDispatchRecords(
  transaction: Prisma.TransactionClient,
  runId: string,
  dispatches: readonly PreparedNodeDispatch[],
  startedAt: Date,
) {
  if (dispatches.length === 0) return

  await transaction.workflowNodeRun.createMany({
    data: dispatches.map(({ command }) => ({
      id: command.nodeRunId,
      runId,
      nodeId: command.nodeId,
      nodeType: command.nodeType,
      executionKey: command.executionKey,
      attempt: command.attempt,
      commandId: command.commandId,
      idempotencyKey: command.idempotencyKey,
      leaseToken: command.leaseToken,
      deadlineAt: new Date(command.deadlineAt),
      hardDeadlineAt: new Date(command.deadlineAt),
      input: toJsonInput(command.inputs),
      startedAt,
    })),
  })

  await transaction.workflowCommandOutbox.createMany({
    data: dispatches.map(({ command, executionClass, routingKey }) => ({
      id: command.commandId,
      runId,
      nodeRunId: command.nodeRunId,
      payload: toJsonInput(command),
      executionClass,
      routingKey,
    })),
  })
}

function createRuntimeRunUpdate(
  transition: RuntimeTransitionPersistence,
  startedAt: Date | null,
  now: Date,
) {
  const status = toWorkflowRunStatus(transition.terminal.status)
  const terminal = status !== WorkflowRunStatus.RUNNING

  return {
    runtimeState: toJsonInput(transition.state),
    runtimeRevision: transition.state.revision,
    status,
    output: transition.terminal.output ? toJsonInput(transition.terminal.output) : undefined,
    errorCode: transition.terminal.error?.code,
    errorMessage: transition.terminal.error?.message,
    errorDetails: transition.terminal.error?.details
      ? toJsonInput(transition.terminal.error.details)
      : undefined,
    finishedAt: terminal ? now : undefined,
    durationMs: terminal ? durationFrom(startedAt, now) : undefined,
  }
}

async function cancelPendingDispatches(
  transaction: Prisma.TransactionClient,
  runIds: string | readonly string[],
  now: Date,
) {
  const normalizedRunIds = typeof runIds === 'string' ? [runIds] : [...runIds]
  const nodeRuns = await transaction.workflowNodeRun.findMany({
    where: {
      runId: { in: normalizedRunIds },
      status: {
        in: [WorkflowNodeRunStatus.PENDING, WorkflowNodeRunStatus.RUNNING],
      },
    },
    select: { id: true, startedAt: true },
  })
  await Promise.all(
    nodeRuns.map((nodeRun) =>
      transaction.workflowNodeRun.update({
        where: { id: nodeRun.id },
        data: {
          status: WorkflowNodeRunStatus.CANCELLED,
          finishedAt: now,
          durationMs: durationFrom(nodeRun.startedAt, now),
        },
      }),
    ),
  )

  await transaction.workflowCommandOutbox.updateMany({
    where: {
      runId: { in: normalizedRunIds },
      status: {
        in: [WorkflowCommandOutboxStatus.PENDING, WorkflowCommandOutboxStatus.PUBLISHING],
      },
    },
    data: {
      status: WorkflowCommandOutboxStatus.FAILED,
      claimedAt: null,
      lastError: '工作流已进入终态，派发已取消',
    },
  })
}

async function cancelRunningDescendantRuns(
  transaction: Prisma.TransactionClient,
  rootRunId: string,
  now: Date,
): Promise<string[]> {
  const childRuns = await transaction.$queryRaw<Array<{ id: string; startedAt: Date | null }>>(
    Prisma.sql`
      WITH RECURSIVE run_tree AS (
        SELECT "id", "status", "startedAt"
        FROM "workflow_runs"
        WHERE "parentRunId" = ${rootRunId}::uuid

        UNION ALL

        SELECT child."id", child."status", child."startedAt"
        FROM "workflow_runs" AS child
        INNER JOIN run_tree AS parent ON child."parentRunId" = parent."id"
      )
      SELECT "id", "startedAt"
      FROM run_tree
      WHERE "status" = 'RUNNING'::"WorkflowRunStatus"
    `,
  )

  await Promise.all(
    childRuns.map((childRun) =>
      transaction.workflowRun.updateMany({
        where: { id: childRun.id, status: WorkflowRunStatus.RUNNING },
        data: {
          status: WorkflowRunStatus.CANCELLED,
          finishedAt: now,
          durationMs: durationFrom(childRun.startedAt, now),
        },
      }),
    ),
  )

  return childRuns.map((childRun) => childRun.id)
}

function createNodeResultUpdate(
  result: RuntimeTransitionPersistence['result'],
  startedAt: Date | null,
  now: Date,
  succeededOutput?: Record<string, JsonValue>,
) {
  return result.status === 'SUCCEEDED'
    ? {
        status: WorkflowNodeRunStatus.SUCCEEDED,
        output: toJsonInput(succeededOutput ?? result.outputs),
        finishedAt: now,
        durationMs: durationFrom(startedAt, now),
      }
    : createFailedNodeResultUpdate(result.error, startedAt, now)
}

function createFailedNodeResultUpdate(
  error: { code: string; message: string; details?: Record<string, JsonValue> },
  startedAt: Date | null,
  now: Date,
) {
  return {
    status: WorkflowNodeRunStatus.FAILED,
    errorCode: error.code,
    errorMessage: error.message,
    errorDetails: error.details ? toJsonInput(error.details) : undefined,
    finishedAt: now,
    durationMs: durationFrom(startedAt, now),
  }
}

function createRuntimeNodeResultUpdate(
  transition: RuntimeTransitionPersistence,
  startedAt: Date | null,
  now: Date,
) {
  if (transition.result.status !== 'SUCCEEDED') {
    return createNodeResultUpdate(transition.result, startedAt, now)
  }

  const execution = transition.state.executions[transition.result.executionKey]
  if (!execution) {
    throw new Error(`Runtime 结果缺少对应的 Execution: ${transition.result.executionKey}`)
  }

  if (execution.status === RUNTIME_EXECUTION_STATUSES.FAILED && execution.error !== undefined) {
    return createFailedNodeResultUpdate(execution.error, startedAt, now)
  }

  if (
    execution.status !== RUNTIME_EXECUTION_STATUSES.SUCCEEDED ||
    execution.outputs === undefined
  ) {
    throw new Error(`Runtime 结果缺少终态 Execution: ${transition.result.executionKey}`)
  }

  return createNodeResultUpdate(transition.result, startedAt, now, execution.outputs)
}

function durationFrom(startedAt: Date | null, finishedAt: Date) {
  return startedAt ? Math.max(1, finishedAt.getTime() - startedAt.getTime()) : 0
}

function toWorkflowRunStatus(status: RuntimeTerminalData['status']) {
  switch (status) {
    case 'RUNNING': {
      return WorkflowRunStatus.RUNNING
    }
    case 'SUCCEEDED': {
      return WorkflowRunStatus.SUCCEEDED
    }
    case 'FAILED': {
      return WorkflowRunStatus.FAILED
    }
  }
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return structuredClone(value) as Prisma.InputJsonValue
}
