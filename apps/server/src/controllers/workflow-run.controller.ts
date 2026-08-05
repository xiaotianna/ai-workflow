import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { CreateWorkflowTestRunDto, ListWorkflowRunsDto } from '@/dto/workflow-run.dto'
import { WorkflowRunService } from '@/services/workflow-run.service'
import { WorkflowRunSseService } from '@/services/workflow-run-sse.service'
import type {
  WorkflowNodeLastRunVo,
  WorkflowRunDetailVo,
  WorkflowRunListVo,
  WorkflowTestRunVo,
} from '@/vo/workflow-run.vo'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'

@JwtAuth()
@Controller('studio/apps/:appId/workflow-runs')
export class WorkflowRunController {
  constructor(
    private readonly workflowRunService: WorkflowRunService,
    private readonly workflowRunSseService: WorkflowRunSseService,
  ) {}

  @Get()
  listRuns(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Query() query: ListWorkflowRunsDto,
  ): Promise<WorkflowRunListVo> {
    return this.workflowRunService.listRuns(request.auth.userId, appId, query)
  }

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
    await this.streamTestRun(request.auth.userId, appId, created.id, response)
  }

  @Get('latest-by-node/:nodeId')
  getLatestNodeRun(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Param('nodeId') nodeId: string,
  ): Promise<WorkflowNodeLastRunVo | null> {
    if (!nodeId.trim()) throw new BadRequestException('节点 ID 不能为空')
    return this.workflowRunService.getLatestNodeRun(request.auth.userId, appId, nodeId.trim())
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
  ): Promise<WorkflowRunDetailVo> {
    return this.workflowRunService.getRunDetail(request.auth.userId, appId, runId)
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
  async resumeTestRun(
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
    await this.streamTestRun(request.auth.userId, appId, runId, response)
  }

  private streamTestRun(
    userId: string,
    appId: string,
    runId: string,
    response: Response,
  ): Promise<void> {
    return this.workflowRunSseService.stream({
      response,
      runId,
      getCurrent: () => this.workflowRunService.getTestRun(userId, appId, runId),
      onLastDisconnect: async () => {
        await this.workflowRunService.cancelTestRun(userId, appId, runId)
      },
    })
  }
}
