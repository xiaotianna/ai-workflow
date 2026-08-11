import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { UpdateKnowledgeApiAccessDto } from '@/dto/knowledge-api.dto'
import { KnowledgeApiService } from '@/services/knowledge-api.service'
import type {
  CreatedKnowledgeApiKeyVo,
  KnowledgeApiKeyVo,
  KnowledgeApiOverviewVo,
} from '@/vo/knowledge-api.vo'
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

const knowledgeBaseIdPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('知识库不存在'),
})

@JwtAuth()
@Controller('knowledge-bases/:knowledgeBaseId/api')
export class KnowledgeApiManagementController {
  constructor(private readonly knowledgeApiService: KnowledgeApiService) {}

  @Get()
  getOverview(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', knowledgeBaseIdPipe) knowledgeBaseId: string,
  ): Promise<KnowledgeApiOverviewVo> {
    return this.knowledgeApiService.getOverview(request.auth.userId, knowledgeBaseId)
  }

  @Patch()
  updateAccess(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', knowledgeBaseIdPipe) knowledgeBaseId: string,
    @Body() dto: UpdateKnowledgeApiAccessDto,
  ): Promise<KnowledgeApiOverviewVo> {
    return this.knowledgeApiService.updateAccess(request.auth.userId, knowledgeBaseId, dto.enabled)
  }

  @Get('keys')
  @Header('Cache-Control', 'no-store')
  listKeys(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', knowledgeBaseIdPipe) knowledgeBaseId: string,
  ): Promise<KnowledgeApiKeyVo[]> {
    return this.knowledgeApiService.listKeys(request.auth.userId, knowledgeBaseId)
  }

  @Post('keys')
  @Header('Cache-Control', 'no-store')
  createKey(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', knowledgeBaseIdPipe) knowledgeBaseId: string,
  ): Promise<CreatedKnowledgeApiKeyVo> {
    return this.knowledgeApiService.createKey(request.auth.userId, knowledgeBaseId)
  }

  @Delete('keys/:apiKeyId')
  revokeKey(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', knowledgeBaseIdPipe) knowledgeBaseId: string,
    @Param('apiKeyId', new ParseUUIDPipe({ version: '4' })) apiKeyId: string,
  ): Promise<void> {
    return this.knowledgeApiService.revokeKey(request.auth.userId, knowledgeBaseId, apiKeyId)
  }
}
