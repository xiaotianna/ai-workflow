import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { PublishWorkflowDto } from '@/dto/workflow-deployment.dto'
import { WorkflowDeploymentService } from '@/services/workflow-deployment.service'
import type { WorkflowDeploymentVo } from '@/vo/workflow-deployment.vo'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common'

@JwtAuth()
@Controller('studio/apps/:appId/workflow-deployment')
export class WorkflowDeploymentController {
  constructor(private readonly workflowDeploymentService: WorkflowDeploymentService) {}

  @Get()
  getCurrent(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
  ): Promise<WorkflowDeploymentVo | null> {
    return this.workflowDeploymentService.getCurrent(request.auth.userId, appId)
  }

  @Post()
  publish(
    @Req() request: AuthenticatedRequest,
    @Param(
      'appId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('应用不存在'),
      }),
    )
    appId: string,
    @Body() dto: PublishWorkflowDto,
  ): Promise<WorkflowDeploymentVo> {
    return this.workflowDeploymentService.publish(request.auth.userId, appId, dto)
  }
}
