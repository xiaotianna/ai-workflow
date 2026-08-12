import { KnowledgeBaseController } from '@/controllers/knowledge-base.controller'
import { KnowledgeApiController } from '@/controllers/knowledge-api.controller'
import { KnowledgeApiManagementController } from '@/controllers/knowledge-api-management.controller'
import { ExecutorKnowledgeController } from '@/controllers/executor-knowledge.controller'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import { KnowledgeSourceStore } from '@/infra/knowledge/knowledge-source-store'
import { KnowledgeSearchProjectionStore } from '@/infra/knowledge/knowledge-search-projection.store'
import { KnowledgeVectorStore } from '@/infra/knowledge/knowledge-vector.store'
import { KnowledgeCommandConsumer } from '@/infra/knowledge-mq/knowledge-command.consumer'
import { KnowledgeOutboxPublisher } from '@/infra/knowledge-mq/knowledge-outbox.publisher'
import { WorkflowMqModule } from '@/infra/workflow-mq/workflow-mq.module'
import { KnowledgeBaseRepository } from '@/repositories/knowledge-base.repository'
import { KnowledgeApiRepository } from '@/repositories/knowledge-api.repository'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import { KnowledgeIngestionRepository } from '@/repositories/knowledge-ingestion.repository'
import { KnowledgeOutboxRepository } from '@/repositories/knowledge-outbox.repository'
import { KnowledgeRetrievalRepository } from '@/repositories/knowledge-retrieval.repository'
import { KnowledgeChunkerService } from '@/services/knowledge-chunker.service'
import { KnowledgeBaseService } from '@/services/knowledge-base.service'
import { KnowledgeApiService } from '@/services/knowledge-api.service'
import { KnowledgeApiKeyGuard } from '@/guards/knowledge-api-key.guard'
import { KnowledgeEmbeddingService } from '@/services/knowledge-embedding.service'
import { KnowledgeIngestionService } from '@/services/knowledge-ingestion.service'
import { KnowledgeRetrievalService } from '@/services/knowledge-retrieval.service'
import { KnowledgeRetrievalProfileService } from '@/services/knowledge-retrieval-profile.service'
import { KnowledgeRerankerService } from '@/services/knowledge-reranker.service'
import { KnowledgeSourceGcScanner } from '@/services/knowledge-source-gc-scanner.service'
import { Module } from '@nestjs/common'

import { JwtModule } from './jwt.module'
import { ModelsModule } from './models.module'

@Module({
  imports: [JwtModule, ModelsModule, WorkflowMqModule],
  controllers: [
    KnowledgeBaseController,
    KnowledgeApiManagementController,
    KnowledgeApiController,
    ExecutorKnowledgeController,
  ],
  providers: [
    KnowledgeBaseService,
    KnowledgeBaseRepository,
    KnowledgeApiService,
    KnowledgeApiRepository,
    KnowledgeApiKeyGuard,
    KnowledgeSourceStore,
    KnowledgeSearchProjectionStore,
    KnowledgeVectorStore,
    KnowledgeChunkerService,
    KnowledgeIngestionService,
    KnowledgeEmbeddingService,
    KnowledgeRetrievalService,
    KnowledgeRetrievalProfileService,
    KnowledgeRerankerService,
    KnowledgeSourceGcScanner,
    KnowledgeIngestionRepository,
    KnowledgeRetrievalRepository,
    ExecutorModelRepository,
    KnowledgeOutboxRepository,
    KnowledgeOutboxPublisher,
    KnowledgeCommandConsumer,
    ExecutorInternalAuthGuard,
  ],
})
export class KnowledgeBaseModule {}
