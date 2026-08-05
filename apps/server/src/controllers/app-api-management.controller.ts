import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { UpdateAppApiShareDto } from '@/dto/app-api.dto'
import { AppApiService } from '@/services/app-api.service'
import type { AppApiKeyVo, AppApiOverviewVo, CreatedAppApiKeyVo } from '@/vo/app-api.vo'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common'

const appIdPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('应用不存在'),
})

@JwtAuth()
@Controller('studio/apps/:appId/app-api')
export class AppApiManagementController {
  constructor(private readonly appApiService: AppApiService) {}

  @Get()
  getOverview(
    @Req() request: AuthenticatedRequest,
    @Param('appId', appIdPipe) appId: string,
  ): Promise<AppApiOverviewVo> {
    return this.appApiService.getOverview(request.auth.userId, appId)
  }

  @Patch('share')
  updateShare(
    @Req() request: AuthenticatedRequest,
    @Param('appId', appIdPipe) appId: string,
    @Body() dto: UpdateAppApiShareDto,
  ): Promise<AppApiOverviewVo> {
    return this.appApiService.updateShare(request.auth.userId, appId, dto.enabled)
  }

  @Get('keys')
  @Header('Cache-Control', 'no-store')
  listKeys(
    @Req() request: AuthenticatedRequest,
    @Param('appId', appIdPipe) appId: string,
  ): Promise<AppApiKeyVo[]> {
    return this.appApiService.listKeys(request.auth.userId, appId)
  }

  @Post('keys')
  @Header('Cache-Control', 'no-store')
  createKey(
    @Req() request: AuthenticatedRequest,
    @Param('appId', appIdPipe) appId: string,
  ): Promise<CreatedAppApiKeyVo> {
    return this.appApiService.createKey(request.auth.userId, appId)
  }

  @Delete('keys/:apiKeyId')
  revokeKey(
    @Req() request: AuthenticatedRequest,
    @Param('appId', appIdPipe) appId: string,
    @Param('apiKeyId', new ParseUUIDPipe({ version: '4' })) apiKeyId: string,
  ): Promise<void> {
    return this.appApiService.revokeKey(request.auth.userId, appId, apiKeyId)
  }
}
