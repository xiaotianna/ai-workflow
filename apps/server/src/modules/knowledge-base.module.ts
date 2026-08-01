import { KnowledgeBaseController } from '@/controllers/knowledge-base.controller'
import { KnowledgeBaseRepository } from '@/repositories/knowledge-base.repository'
import { KnowledgeBaseService } from '@/services/knowledge-base.service'
import { Module } from '@nestjs/common'

import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, KnowledgeBaseRepository],
})
export class KnowledgeBaseModule {}
