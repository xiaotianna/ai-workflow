import type {
  PreparedNodeDispatch,
  RuntimeTerminalData,
  RuntimeTransitionPersistence,
} from '@/common/interfaces/workflow-run-persistence.interface'
import type { TestRunMode } from '@/dto/workflow-run.dto'
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
}

export interface ClaimedWorkflowCommand {
  id: string
  payload: unknown
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
        RETURNING outbox."id", outbox."payload", outbox."publishAttempts"
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

      await cancelPendingDispatches(transaction, runId, now)
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
    return this.prisma.workflowRun.findMany({
      where: {
        workflow: {
          appId: options.appId,
          app: {
            ownerId: options.ownerId,
            deletedAt: null,
          },
        },
        ...(options.cursor
          ? {
              OR: [
                { queuedAt: { lt: options.cursor.queuedAt } },
                {
                  queuedAt: options.cursor.queuedAt,
                  id: { lt: options.cursor.id },
                },
              ],
            }
          : {}),
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
}

const workflowRunListItemSelect = {
  id: true,
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
      input: toJsonInput(command.inputs),
      startedAt,
    })),
  })

  await transaction.workflowCommandOutbox.createMany({
    data: dispatches.map(({ command }) => ({
      id: command.commandId,
      runId,
      nodeRunId: command.nodeRunId,
      payload: toJsonInput(command),
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
  runId: string,
  now: Date,
) {
  const nodeRuns = await transaction.workflowNodeRun.findMany({
    where: {
      runId,
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
      runId,
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
