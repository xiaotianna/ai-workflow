import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { CreateWorkflowTestRunDto } from '@/dto/workflow-run.dto'
import { WorkflowRunStatus } from '@/generated/prisma/client'
import { WorkflowRunEventStreamService } from '@/services/workflow-run-event-stream.service'
import { WorkflowRunService } from '@/services/workflow-run.service'
import type { WorkflowRunStreamEvent, WorkflowTestRunVo } from '@/vo/workflow-run.vo'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'

const SSE_HEARTBEAT_INTERVAL_MS = 15_000
const NOOP = () => undefined

@JwtAuth()
@Controller('studio/apps/:appId/workflow-runs')
export class WorkflowRunController {
  constructor(
    private readonly workflowRunService: WorkflowRunService,
    private readonly workflowRunEventStream: WorkflowRunEventStreamService,
  ) {}

  @Post('test')
  async streamTestRunFromSnapshot(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Body() dto: CreateWorkflowTestRunDto,
  ): Promise<void> {
    const created = await this.workflowRunService.createTestRun(request.auth.userId, appId, dto)
    await this.writeTestRunStream(request.auth.userId, appId, created.id, response)
  }

  @Get(':runId')
  getTestRun(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Param('runId', new ParseUUIDPipe({ version: '4' })) runId: string,
  ): Promise<WorkflowTestRunVo> {
    return this.workflowRunService.getTestRun(request.auth.userId, appId, runId)
  }

  @Post(':runId/cancel')
  cancelTestRun(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Param('runId', new ParseUUIDPipe({ version: '4' })) runId: string,
  ): Promise<WorkflowTestRunVo> {
    return this.workflowRunService.cancelTestRun(request.auth.userId, appId, runId)
  }

  @Get(':runId/events')
  async streamTestRun(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Param('runId', new ParseUUIDPipe({ version: '4' })) runId: string,
  ): Promise<void> {
    await this.workflowRunService.getTestRun(request.auth.userId, appId, runId)
    await this.writeTestRunStream(request.auth.userId, appId, runId, response)
  }

  private async writeTestRunStream(
    userId: string,
    appId: string,
    runId: string,
    response: Response,
  ): Promise<void> {
    response.status(200)
    response.set({
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    })
    response.flushHeaders()

    let closed = false
    let initialized = false
    const bufferedEvents: WorkflowRunStreamEvent[] = []
    let unsubscribe: () => void = NOOP
    const heartbeat = setInterval(() => {
      if (!closed) response.write(': ping\n\n')
    }, SSE_HEARTBEAT_INTERVAL_MS)
    heartbeat.unref()

    const close = () => {
      if (closed) return
      closed = true
      clearInterval(heartbeat)
      unsubscribe()
      if (!response.writableEnded) response.end()
    }

    const sendEvent = (event: WorkflowRunStreamEvent) => {
      if (closed) return
      writeSseEvent(response, event)
      if (event.event === 'workflow_finished') close()
    }

    response.on('close', close)
    unsubscribe = this.workflowRunEventStream.subscribe(runId, (event) => {
      if (initialized) {
        sendEvent(event)
        return
      }
      bufferedEvents.push(event)
    })

    try {
      const current = await this.workflowRunService.getTestRun(userId, appId, runId)
      if (closed) return
      writeSseEvent(response, {
        event: 'workflow_started',
        id: `${runId}:started`,
        data: current,
      })

      initialized = true
      for (const event of bufferedEvents) {
        sendEvent(event)
        if (closed) return
      }

      if (current.status !== WorkflowRunStatus.RUNNING) {
        sendEvent({
          event: 'workflow_finished',
          id: `${runId}:${current.status}`,
          data: current,
        })
      }
    } catch (error) {
      if (!closed) {
        writeSseEvent(response, {
          event: 'error',
          data: {
            message: error instanceof Error && error.message ? error.message : '运行事件流读取失败',
          },
        })
      }
      close()
    }
  }
}

function writeSseEvent(
  response: Response,
  event: {
    event: string
    data: unknown
    id?: string
  },
): void {
  if (event.id) response.write(`id: ${event.id}\n`)
  response.write(`event: ${event.event}\n`)
  response.write(`data: ${JSON.stringify(event.data)}\n\n`)
}
