import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { CreateStudioAppDto, ListStudioAppsDto, UpdateStudioAppDto } from '@/dto/studio.dto'
import { StudioAppService } from '@/services/studio-app.service'
import type { StudioAppListVo, StudioAppVo } from '@/vo/studio.vo'
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common'
import type { Response } from 'express'

@JwtAuth()
@Controller('studio/apps')
export class StudioAppController {
  constructor(private readonly studioAppService: StudioAppService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListStudioAppsDto,
  ): Promise<StudioAppListVo> {
    return this.studioAppService.list(request.auth.userId, query)
  }

  @Get(':appId/dsl')
  async exportDsl(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const exportedDsl = await this.studioAppService.exportDsl(request.auth.userId, appId)

    response.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(exportedDsl.filename)}`,
    })

    return new StreamableFile(Buffer.from(exportedDsl.content))
  }

  @Get(':appId')
  getById(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
  ): Promise<StudioAppVo> {
    return this.studioAppService.getById(request.auth.userId, appId)
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateStudioAppDto,
  ): Promise<StudioAppVo> {
    return this.studioAppService.create(request.auth.userId, dto)
  }

  @Patch(':appId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
    @Body() dto: UpdateStudioAppDto,
  ): Promise<StudioAppVo> {
    return this.studioAppService.update(request.auth.userId, appId, dto)
  }
}
