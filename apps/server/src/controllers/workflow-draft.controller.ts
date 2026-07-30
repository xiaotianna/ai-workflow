import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { SaveWorkflowDraftDto } from '@/dto/workflow-draft.dto'
import { WorkflowDraftService } from '@/services/workflow-draft.service'
import type { WorkflowDraftVo } from '@/vo/workflow-draft.vo'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
} from '@nestjs/common'

@JwtAuth()
@Controller('studio/apps/:appId/workflow-draft')
export class WorkflowDraftController {
  constructor(private readonly workflowDraftService: WorkflowDraftService) {}

  @Get()
  get(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
  ): Promise<WorkflowDraftVo> {
    return this.workflowDraftService.get(request.auth.userId, appId)
  }

  @Put()
  save(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Body() dto: SaveWorkflowDraftDto,
  ): Promise<WorkflowDraftVo> {
    return this.workflowDraftService.save(request.auth.userId, appId, dto)
  }
}
