import { WorkflowNodeRunStatus, WorkflowRunStatus } from '@/generated/prisma/client'
import { PrismaService } from '@/infra/prisma/prisma.service'
import type { ResolveExecutorPluginArtifactDto } from '@/dto/executor-plugin-artifact.dto'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ExecutorPluginArtifactRepository {
  constructor(private readonly prisma: PrismaService) {}

  findResolutionContext(dto: ResolveExecutorPluginArtifactDto) {
    return this.prisma.workflowNodeRun.findFirst({
      where: {
        id: dto.nodeRunId,
        commandId: dto.commandId,
        runId: dto.runId,
        nodeId: dto.nodeId,
        executionKey: dto.executionKey,
        leaseToken: dto.leaseToken,
        status: WorkflowNodeRunStatus.RUNNING,
        deadlineAt: { gt: new Date() },
        run: { status: WorkflowRunStatus.RUNNING },
      },
      select: {
        nodeType: true,
        run: {
          select: {
            version: {
              select: {
                pluginDependencies: {
                  where: {
                    pluginVersionId: dto.pluginVersionId,
                    artifactDigest: {
                      equals: dto.artifactDigest,
                      mode: 'insensitive',
                    },
                  },
                  take: 1,
                  select: {
                    manifest: true,
                    artifactReference: true,
                    artifactDigest: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }
}
