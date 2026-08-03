import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { RenameWorkflowVersionDto } from '@/dto/workflow-version.dto'
import { WorkflowVersionService } from '@/services/workflow-version.service'
import type { WorkflowDraftVo } from '@/vo/workflow-draft.vo'
import type { WorkflowVersionListItemVo, WorkflowVersionListVo } from '@/vo/workflow-version.vo'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common'

@JwtAuth()
@Controller('studio/apps/:appId/workflow-versions')
export class WorkflowVersionController {
  constructor(private readonly workflowVersionService: WorkflowVersionService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
  ): Promise<WorkflowVersionListVo> {
    return this.workflowVersionService.list(request.auth.userId, appId)
  }

  @Post(':versionId/restore')
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<WorkflowDraftVo> {
    return this.workflowVersionService.restore(request.auth.userId, appId, versionId)
  }

  @Patch(':versionId')
  rename(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
    @Body() dto: RenameWorkflowVersionDto,
  ): Promise<WorkflowVersionListItemVo> {
    return this.workflowVersionService.rename(request.auth.userId, appId, versionId, dto)
  }

  @Delete(':versionId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ): Promise<void> {
    return this.workflowVersionService.remove(request.auth.userId, appId, versionId)
  }
}
