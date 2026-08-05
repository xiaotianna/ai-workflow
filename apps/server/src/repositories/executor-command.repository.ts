import { WorkflowNodeRunStatus, WorkflowRunStatus } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface ExecutorCommandIdentity {
  commandId: string
  runId: string
  nodeRunId: string
  nodeId: string
  executionKey: string
  leaseToken: string
}

@Injectable()
export class ExecutorCommandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isLeaseActive(identity: ExecutorCommandIdentity): Promise<boolean> {
    const nodeRun = await this.prisma.workflowNodeRun.findFirst({
      where: {
        id: identity.nodeRunId,
        commandId: identity.commandId,
        runId: identity.runId,
        nodeId: identity.nodeId,
        executionKey: identity.executionKey,
        leaseToken: identity.leaseToken,
        status: WorkflowNodeRunStatus.RUNNING,
        deadlineAt: { gt: new Date() },
        run: { status: WorkflowRunStatus.RUNNING },
      },
      select: { id: true },
    })

    return Boolean(nodeRun)
  }
}
