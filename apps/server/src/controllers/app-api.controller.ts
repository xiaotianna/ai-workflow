import type { AppApiAuthenticatedRequest } from '@/common/interfaces/app-api-auth-context.interface'
import { ListAppApiWorkflowRunsDto } from '@/dto/app-api.dto'
import { AppApiKeyGuard } from '@/guards/app-api-key.guard'
import { AppApiCallLogInterceptor } from '@/interceptors/app-api-call-log.interceptor'
import { AppApiService } from '@/services/app-api.service'
import { WorkflowRunService } from '@/services/workflow-run.service'
import { WorkflowRunSseService } from '@/services/workflow-run-sse.service'
import type { AppApiInfoVo, AppApiParametersVo } from '@/vo/app-api.vo'
import type { WorkflowRunListVo, WorkflowTestRunVo } from '@/vo/workflow-run.vo'
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import type { Response } from 'express'

@UseGuards(AppApiKeyGuard)
@UseInterceptors(AppApiCallLogInterceptor)
@Controller('v1')
export class AppApiController {
  constructor(
    private readonly appApiService: AppApiService,
    private readonly workflowRunService: WorkflowRunService,
    private readonly workflowRunSseService: WorkflowRunSseService,
  ) {}

  @Post('workflows/run')
  async runCurrentWorkflow(
    @Req() request: AppApiAuthenticatedRequest,
    @Res() response: Response,
    @Body() body: unknown,
  ): Promise<void> {
    await this.streamNewRun(request, response, undefined, parseWorkflowRunInput(body))
  }

  @Post('workflows/versions/:versionId/run')
  async runWorkflowVersion(
    @Req() request: AppApiAuthenticatedRequest,
    @Res() response: Response,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() body: unknown,
  ): Promise<void> {
    await this.streamNewRun(request, response, versionId, parseWorkflowRunInput(body))
  }

  @Get('workflows/runs/:runId')
  getRun(
    @Req() request: AppApiAuthenticatedRequest,
    @Param('runId', new ParseUUIDPipe({ version: '4' })) runId: string,
  ): Promise<WorkflowTestRunVo> {
    return this.workflowRunService.getApiRun(request.appApiAuth.appId, runId)
  }

  @Get('workflows/logs')
  listRuns(
    @Req() request: AppApiAuthenticatedRequest,
    @Query() query: ListAppApiWorkflowRunsDto,
  ): Promise<WorkflowRunListVo> {
    return this.workflowRunService.listApiRuns(request.appApiAuth.appId, query)
  }

  @Get('info')
  getInfo(@Req() request: AppApiAuthenticatedRequest): Promise<AppApiInfoVo> {
    return this.appApiService.getInfo(request.appApiAuth.appId)
  }

  @Get('parameters')
  getParameters(@Req() request: AppApiAuthenticatedRequest): Promise<AppApiParametersVo> {
    return this.appApiService.getParameters(request.appApiAuth.appId)
  }

  private async streamNewRun(
    request: AppApiAuthenticatedRequest,
    response: Response,
    versionId: string | undefined,
    input: Record<string, unknown>,
  ): Promise<void> {
    const appId = request.appApiAuth.appId,
      run = await this.workflowRunService.createApiRun(appId, versionId, input)
    request.appApiRunId = run.id
    await this.workflowRunSseService.stream({
      response,
      runId: run.id,
      getCurrent: () => this.workflowRunService.getApiRun(appId, run.id),
    })
  }
}

function parseWorkflowRunInput(value: unknown): Record<string, unknown> {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('工作流输入必须是 JSON 对象')
  }
  return value as Record<string, unknown>
}
