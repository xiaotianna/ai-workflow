import { RetrieveExecutorKnowledgeDto } from '@/dto/executor-knowledge.dto'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import { KnowledgeRetrievalService } from '@/services/knowledge-retrieval.service'
import type { KnowledgeRetrievalVo } from '@/vo/knowledge-retrieval.vo'
import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common'

@Controller('internal/executor/knowledge')
@UseGuards(ExecutorInternalAuthGuard)
export class ExecutorKnowledgeController {
  constructor(private readonly knowledgeRetrievalService: KnowledgeRetrievalService) {}

  @Post('retrieve')
  @Header('Cache-Control', 'no-store')
  retrieve(@Body() dto: RetrieveExecutorKnowledgeDto): Promise<KnowledgeRetrievalVo> {
    return this.knowledgeRetrievalService.retrieveForExecutor(dto)
  }
}
