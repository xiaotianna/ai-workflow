import type { KnowledgeApiAuthenticatedRequest } from '@/common/interfaces/knowledge-api-auth-context.interface'
import { RetrieveKnowledgeApiDto } from '@/dto/knowledge-api.dto'
import { KnowledgeApiKeyGuard } from '@/guards/knowledge-api-key.guard'
import { KnowledgeApiService } from '@/services/knowledge-api.service'
import type { KnowledgeApiRetrieveVo } from '@/vo/knowledge-api.vo'
import { Body, Controller, Headers, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { randomUUID } from 'node:crypto'

@UseGuards(KnowledgeApiKeyGuard)
@Controller('v1/knowledge')
export class KnowledgeApiController {
  constructor(private readonly knowledgeApiService: KnowledgeApiService) {}

  @Post('retrieve')
  @HttpCode(200)
  async retrieve(
    @Req() request: KnowledgeApiAuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Headers('x-request-id') suppliedRequestId: string | undefined,
    @Body() dto: RetrieveKnowledgeApiDto,
  ): Promise<KnowledgeApiRetrieveVo> {
    const requestId = normalizeRequestId(suppliedRequestId)
    response.setHeader('X-Request-Id', requestId)
    return this.knowledgeApiService.retrieve(request.knowledgeApiAuth, dto, requestId)
  }
}

function normalizeRequestId(value: string | undefined): string {
  const normalized = value?.trim()
  return normalized && normalized.length <= 128 ? normalized : randomUUID()
}
