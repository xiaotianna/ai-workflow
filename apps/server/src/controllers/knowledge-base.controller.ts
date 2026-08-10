import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import {
  CreateKnowledgeDocumentsDto,
  CreateKnowledgeBaseDto,
  ListKnowledgeChunksDto,
  ListKnowledgeBasesDto,
  ListKnowledgeDocumentsDto,
  RetrieveKnowledgeBaseDto,
  UpdateKnowledgeBaseSettingsDto,
  UpdateKnowledgeBaseDto,
  UpdateKnowledgeDocumentDto,
  UpdateKnowledgeChunkDto,
} from '@/dto/knowledge-base.dto'
import {
  KnowledgeBaseService,
  type UploadedKnowledgeDocument,
} from '@/services/knowledge-base.service'
import type {
  KnowledgeBaseListVo,
  KnowledgeBaseIndexVo,
  KnowledgeBaseIndexListVo,
  KnowledgeBaseSettingsVo,
  KnowledgeBaseVo,
  KnowledgeChunkListVo,
  KnowledgeChunkVo,
  KnowledgeDocumentListVo,
  KnowledgeDocumentPreviewVo,
  KnowledgeDocumentVo,
} from '@/vo/knowledge-base.vo'
import type { KnowledgeRetrievalVo } from '@/vo/knowledge-retrieval.vo'
import { KnowledgeRetrievalService } from '@/services/knowledge-retrieval.service'
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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'

const MAX_KNOWLEDGE_DOCUMENT_SIZE = 15 * 1024 * 1024
const MAX_KNOWLEDGE_DOCUMENT_FILES = 10

@JwtAuth()
@Controller('knowledge-bases')
export class KnowledgeBaseController {
  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly knowledgeRetrievalService: KnowledgeRetrievalService,
  ) {}

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

  @Get(':knowledgeBaseId/settings')
  getSettings(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
  ): Promise<KnowledgeBaseSettingsVo> {
    return this.knowledgeBaseService.getSettings(request.auth.userId, knowledgeBaseId)
  }

  @Patch(':knowledgeBaseId/settings')
  updateSettings(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Body() dto: UpdateKnowledgeBaseSettingsDto,
  ): Promise<KnowledgeBaseSettingsVo> {
    return this.knowledgeBaseService.updateSettings(request.auth.userId, knowledgeBaseId, dto)
  }

  @Get(':knowledgeBaseId/indexes')
  listIndexes(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
  ): Promise<KnowledgeBaseIndexListVo> {
    return this.knowledgeBaseService.listIndexes(request.auth.userId, knowledgeBaseId)
  }

  @Post(':knowledgeBaseId/indexes/rebuild')
  rebuildFailedIndex(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
  ): Promise<KnowledgeBaseIndexVo> {
    return this.knowledgeBaseService.rebuildFailedIndex(request.auth.userId, knowledgeBaseId)
  }

  @Post(':knowledgeBaseId/retrieve')
  retrieve(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Body() dto: RetrieveKnowledgeBaseDto,
  ): Promise<KnowledgeRetrievalVo> {
    return this.knowledgeRetrievalService.retrieve(
      request.auth.userId,
      [knowledgeBaseId],
      dto.query,
      dto.topK,
      { debug: true },
    )
  }

  @Get(':knowledgeBaseId/documents')
  listDocuments(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Query() query: ListKnowledgeDocumentsDto,
  ): Promise<KnowledgeDocumentListVo> {
    return this.knowledgeBaseService.listDocuments(request.auth.userId, knowledgeBaseId, query)
  }

  @Post(':knowledgeBaseId/documents')
  @UseInterceptors(
    FilesInterceptor('files', MAX_KNOWLEDGE_DOCUMENT_FILES, {
      limits: {
        fileSize: MAX_KNOWLEDGE_DOCUMENT_SIZE,
        files: MAX_KNOWLEDGE_DOCUMENT_FILES,
      },
    }),
  )
  createDocuments(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @UploadedFiles() files: UploadedKnowledgeDocument[] | undefined,
    @Body() dto: CreateKnowledgeDocumentsDto,
  ): Promise<KnowledgeDocumentVo[]> {
    return this.knowledgeBaseService.createDocuments(
      request.auth.userId,
      knowledgeBaseId,
      files ?? [],
      dto,
    )
  }

  @Post(':knowledgeBaseId/documents/preview')
  @UseInterceptors(
    FilesInterceptor('files', MAX_KNOWLEDGE_DOCUMENT_FILES, {
      limits: {
        fileSize: MAX_KNOWLEDGE_DOCUMENT_SIZE,
        files: MAX_KNOWLEDGE_DOCUMENT_FILES,
      },
    }),
  )
  previewDocuments(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @UploadedFiles() files: UploadedKnowledgeDocument[] | undefined,
    @Body() dto: CreateKnowledgeDocumentsDto,
  ): Promise<KnowledgeDocumentPreviewVo> {
    return this.knowledgeBaseService.previewDocuments(
      request.auth.userId,
      knowledgeBaseId,
      files ?? [],
      dto,
    )
  }

  @Get(':knowledgeBaseId/documents/:documentId')
  getDocument(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
  ): Promise<KnowledgeDocumentVo> {
    return this.knowledgeBaseService.getDocument(request.auth.userId, knowledgeBaseId, documentId)
  }

  @Patch(':knowledgeBaseId/documents/:documentId')
  updateDocument(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @Body() dto: UpdateKnowledgeDocumentDto,
  ): Promise<KnowledgeDocumentVo> {
    return this.knowledgeBaseService.updateDocument(
      request.auth.userId,
      knowledgeBaseId,
      documentId,
      dto,
    )
  }

  @Delete(':knowledgeBaseId/documents/:documentId')
  removeDocument(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
  ): Promise<void> {
    return this.knowledgeBaseService.removeDocument(
      request.auth.userId,
      knowledgeBaseId,
      documentId,
    )
  }

  @Post(':knowledgeBaseId/documents/:documentId/reindex')
  reindexDocument(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
  ): Promise<KnowledgeDocumentVo> {
    return this.knowledgeBaseService.reindexDocument(
      request.auth.userId,
      knowledgeBaseId,
      documentId,
    )
  }

  @Get(':knowledgeBaseId/documents/:documentId/chunks')
  listChunks(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @Query() query: ListKnowledgeChunksDto,
  ): Promise<KnowledgeChunkListVo> {
    return this.knowledgeBaseService.listChunks(
      request.auth.userId,
      knowledgeBaseId,
      documentId,
      query,
    )
  }

  @Patch(':knowledgeBaseId/documents/:documentId/chunks/:chunkId')
  updateChunk(
    @Req() request: AuthenticatedRequest,
    @Param('knowledgeBaseId', new ParseUUIDPipe({ version: '4' })) knowledgeBaseId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @Param('chunkId', new ParseUUIDPipe({ version: '4' })) chunkId: string,
    @Body() dto: UpdateKnowledgeChunkDto,
  ): Promise<KnowledgeChunkVo> {
    return this.knowledgeBaseService.updateChunk(
      request.auth.userId,
      knowledgeBaseId,
      documentId,
      chunkId,
      dto,
    )
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
