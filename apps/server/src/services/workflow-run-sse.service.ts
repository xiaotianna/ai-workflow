import { WorkflowRunStatus } from '@/generated/prisma/client'
import { WorkflowRunEventStreamService } from '@/services/workflow-run-event-stream.service'
import type { WorkflowRunStreamEvent, WorkflowTestRunVo } from '@/vo/workflow-run.vo'
import { Injectable } from '@nestjs/common'
import type { Response } from 'express'

const SSE_HEARTBEAT_INTERVAL_MS = 15_000
const NOOP = () => undefined

interface StreamWorkflowRunOptions {
  response: Response
  runId: string
  getCurrent: () => Promise<WorkflowTestRunVo>
  onLastDisconnect?: () => void | Promise<void>
}

@Injectable()
export class WorkflowRunSseService {
  constructor(private readonly workflowRunEventStream: WorkflowRunEventStreamService) {}

  async stream(options: StreamWorkflowRunOptions): Promise<void> {
    const { response, runId } = options
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

    response.on('close', () => {
      if (closed) return
      close()
      if (this.workflowRunEventStream.hasSubscribers(runId)) return
      void Promise.resolve(options.onLastDisconnect?.()).catch(() => undefined)
    })
    unsubscribe = this.workflowRunEventStream.subscribe(runId, (event) => {
      if (initialized) {
        sendEvent(event)
        return
      }
      bufferedEvents.push(event)
    })

    try {
      const current = await options.getCurrent()
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
