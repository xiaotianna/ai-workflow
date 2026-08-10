import { KnowledgeBaseController } from '@/controllers/knowledge-base.controller'
import { KnowledgeSourceStore } from '@/infra/knowledge/knowledge-source-store'
import { KnowledgeBaseRepository } from '@/repositories/knowledge-base.repository'
import { KnowledgeChunkerService } from '@/services/knowledge-chunker.service'
import { KnowledgeBaseService } from '@/services/knowledge-base.service'
import { Module } from '@nestjs/common'

import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService,
    KnowledgeBaseRepository,
    KnowledgeSourceStore,
    KnowledgeChunkerService,
  ],
})
export class KnowledgeBaseModule {}
