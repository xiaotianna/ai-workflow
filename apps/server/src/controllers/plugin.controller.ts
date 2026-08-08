import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import {
  InstallPluginDto,
  ListPluginsDto,
  PublishPluginDto,
  ResolvePluginRuntimeCatalogDto,
} from '@/dto/plugin.dto'
import { PluginService, type UploadedPluginPackage } from '@/services/plugin.service'
import type {
  InstalledPluginVo,
  PluginDetailVo,
  PluginListVo,
  PluginRuntimeCatalogVo,
  PublishedPluginVersionVo,
} from '@/vo/plugin.vo'
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
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

const MAX_PLUGIN_PACKAGE_SIZE = 50 * 1024 * 1024

@JwtAuth()
@Controller('plugins')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListPluginsDto,
  ): Promise<PluginListVo> {
    return this.pluginService.list(request.auth.userId, query)
  }

  @Post('runtime-catalog/resolve')
  resolveRuntimeCatalog(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ResolvePluginRuntimeCatalogDto,
  ): Promise<PluginRuntimeCatalogVo> {
    return this.pluginService.resolveRuntimeCatalog(request.auth.userId, dto.pluginLock)
  }

  @Get(':pluginId/versions/:versionId/assets/*')
  getVersionAsset(
    @Req() request: AuthenticatedRequest,
    @Param('pluginId', new ParseUUIDPipe({ version: '4' })) pluginId: string,
    @Param('versionId', new ParseUUIDPipe({ version: '4' })) versionId: string,
  ) {
    const assetPath = extractPluginAssetPath(request.path, pluginId, versionId)
    return this.pluginService.getVersionAsset(request.auth.userId, pluginId, versionId, assetPath)
  }

  @Get(':pluginId')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('pluginId', new ParseUUIDPipe({ version: '4' })) pluginId: string,
  ): Promise<PluginDetailVo> {
    return this.pluginService.get(request.auth.userId, pluginId)
  }

  @Put(':pluginId/installation')
  install(
    @Req() request: AuthenticatedRequest,
    @Param('pluginId', new ParseUUIDPipe({ version: '4' })) pluginId: string,
    @Body() dto: InstallPluginDto,
  ): Promise<InstalledPluginVo> {
    return this.pluginService.install(request.auth.userId, pluginId, dto)
  }

  @Post('publish')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_PLUGIN_PACKAGE_SIZE,
        files: 1,
      },
    }),
  )
  publish(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: UploadedPluginPackage | undefined,
    @Body() dto: PublishPluginDto,
  ): Promise<PublishedPluginVersionVo> {
    return this.pluginService.publish(request.auth.userId, file, dto)
  }
}

function extractPluginAssetPath(pathname: string, pluginId: string, versionId: string): string {
  const prefix = `/plugins/${pluginId}/versions/${versionId}/assets/`
  if (!pathname.startsWith(prefix)) {
    throw new BadRequestException('插件资源路径无效')
  }

  const assetPath = decodeURIComponent(pathname.slice(prefix.length))
  if (!assetPath) {
    throw new BadRequestException('插件资源路径不能为空')
  }

  return assetPath
}
