import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import {
  CreateKnowledgeBaseDto,
  ListKnowledgeBasesDto,
  UpdateKnowledgeBaseDto,
} from '@/dto/knowledge-base.dto'
import { KnowledgeBaseService } from '@/services/knowledge-base.service'
import type { KnowledgeBaseListVo, KnowledgeBaseVo } from '@/vo/knowledge-base.vo'
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
  Query,
  Req,
} from '@nestjs/common'

@JwtAuth()
@Controller('knowledge-bases')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListKnowledgeBasesDto,
  ): Promise<KnowledgeBaseListVo> {
    return this.knowledgeBaseService.list(request.auth.userId, query)
  }

  @Get(':knowledgeBaseId')
  getById(
    @Req() request: AuthenticatedRequest,
    @Param(
      'knowledgeBaseId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('知识库不存在'),
      }),
    )
    knowledgeBaseId: string,
  ): Promise<KnowledgeBaseVo> {
    return this.knowledgeBaseService.getById(request.auth.userId, knowledgeBaseId)
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseVo> {
    return this.knowledgeBaseService.create(request.auth.userId, dto)
  }

  @Patch(':knowledgeBaseId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param(
      'knowledgeBaseId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('知识库不存在'),
      }),
    )
    knowledgeBaseId: string,
    @Body() dto: UpdateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseVo> {
    return this.knowledgeBaseService.update(request.auth.userId, knowledgeBaseId, dto)
  }

  @Delete(':knowledgeBaseId')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param(
      'knowledgeBaseId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () => new BadRequestException('知识库不存在'),
      }),
    )
    knowledgeBaseId: string,
  ): Promise<void> {
    return this.knowledgeBaseService.remove(request.auth.userId, knowledgeBaseId)
  }
}
