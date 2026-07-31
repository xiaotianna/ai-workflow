import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import {
  CreateModelGroupDto,
  ListModelGroupsDto,
  TestModelConnectionDto,
  UpdateModelEnabledDto,
  UpdateModelGroupDto,
} from '@/dto/model.dto'
import { ModelConnectionTestService } from '@/services/model-connection-test.service'
import { ModelGroupService } from '@/services/model-group.service'
import type {
  ModelConnectionTestVo,
  ModelEnabledVo,
  ModelGroupListVo,
  ModelGroupVo,
} from '@/vo/model.vo'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common'

@JwtAuth()
@Controller('models')
export class ModelController {
  constructor(
    private readonly modelGroupService: ModelGroupService,
    private readonly connectionTestService: ModelConnectionTestService,
  ) {}

  @Get('groups')
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListModelGroupsDto,
  ): Promise<ModelGroupListVo> {
    return this.modelGroupService.list(request.auth.userId, query)
  }

  @Get('groups/:groupId')
  getById(
    @Req() request: AuthenticatedRequest,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
  ): Promise<ModelGroupVo> {
    return this.modelGroupService.getById(request.auth.userId, groupId)
  }

  @Post('groups')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateModelGroupDto,
  ): Promise<ModelGroupVo> {
    return this.modelGroupService.create(request.auth.userId, dto)
  }

  @Put('groups/:groupId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
    @Body() dto: UpdateModelGroupDto,
  ): Promise<ModelGroupVo> {
    return this.modelGroupService.update(request.auth.userId, groupId, dto)
  }

  @Patch('groups/:groupId/enabled')
  updateGroupEnabled(
    @Req() request: AuthenticatedRequest,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
    @Body() dto: UpdateModelEnabledDto,
  ): Promise<ModelEnabledVo> {
    return this.modelGroupService.updateGroupEnabled(request.auth.userId, groupId, dto.enabled)
  }

  @Patch('groups/:groupId/models/:modelId/enabled')
  updateModelEnabled(
    @Req() request: AuthenticatedRequest,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
    @Param('modelId', new ParseUUIDPipe({ version: '4' })) modelId: string,
    @Body() dto: UpdateModelEnabledDto,
  ): Promise<ModelEnabledVo> {
    return this.modelGroupService.updateModelEnabled(
      request.auth.userId,
      groupId,
      modelId,
      dto.enabled,
    )
  }

  @Delete('groups/:groupId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('groupId', new ParseUUIDPipe({ version: '4' })) groupId: string,
  ): Promise<void> {
    return this.modelGroupService.remove(request.auth.userId, groupId)
  }

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  testConnection(
    @Req() request: AuthenticatedRequest,
    @Body() dto: TestModelConnectionDto,
  ): Promise<ModelConnectionTestVo> {
    return this.connectionTestService.test(request.auth.userId, dto)
  }
}
