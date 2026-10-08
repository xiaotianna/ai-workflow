import { AgentController, AgentToolGatewayController } from '@/controllers/agent.controller'
import { AgentInternalAuthGuard } from '@/guards/agent-internal-auth.guard'
import { AgentRunService } from '@/services/agent-run.service'
import { AgentContextService } from '@/services/agent-context.service'
import { AgentToolGatewayService } from '@/services/agent-tool-gateway.service'
import { ModelsModule } from './models.module'
import { KnowledgeBaseModule } from './knowledge-base.module'
import { AppApiController } from '@/controllers/app-api.controller'
import { AppApiManagementController } from '@/controllers/app-api-management.controller'
import { PublicAppApiController } from '@/controllers/public-app-api.controller'
import { StudioAppController } from '@/controllers/studio-app.controller'
import { WorkflowDeploymentController } from '@/controllers/workflow-deployment.controller'
import { WorkflowDraftController } from '@/controllers/workflow-draft.controller'
import { WorkflowRunController } from '@/controllers/workflow-run.controller'
import { WorkflowVersionController } from '@/controllers/workflow-version.controller'
import { AppApiKeyGuard } from '@/guards/app-api-key.guard'
import { WorkflowMqModule } from '@/infra/workflow-mq/workflow-mq.module'
import { WorkflowExecutionRoutingService } from '@/infra/workflow-mq/workflow-execution-routing.service'
import { WorkflowOutboxPublisher } from '@/infra/workflow-mq/workflow-outbox.publisher'
import { WorkflowResultConsumer } from '@/infra/workflow-mq/workflow-result.consumer'
import { AppApiCallLogInterceptor } from '@/interceptors/app-api-call-log.interceptor'
import { AppApiRepository } from '@/repositories/app-api.repository'
import { StudioAppRepository } from '@/repositories/studio-app.repository'
import { WorkflowDeploymentRepository } from '@/repositories/workflow-deployment.repository'
import { WorkflowDraftRepository } from '@/repositories/workflow-draft.repository'
import { WorkflowRunRepository } from '@/repositories/workflow-run.repository'
import { WorkflowVersionRepository } from '@/repositories/workflow-version.repository'
import { AppApiService } from '@/services/app-api.service'
import { StudioAppService } from '@/services/studio-app.service'
import { WorkflowDeploymentService } from '@/services/workflow-deployment.service'
import { WorkflowDraftService } from '@/services/workflow-draft.service'
import { WorkflowRunService } from '@/services/workflow-run.service'
import { WorkflowRunEventStreamService } from '@/services/workflow-run-event-stream.service'
import { WorkflowRunTimeoutScanner } from '@/services/workflow-run-timeout-scanner.service'
import { WorkflowRunSseService } from '@/services/workflow-run-sse.service'
import { WorkflowVersionService } from '@/services/workflow-version.service'
import { WorkflowCatalogResolver } from '@/workflow-catalog/workflow-server-catalog'
import { Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'
import { PluginModule } from './plugin.module'

@Module({
  imports: [JwtModule, PluginModule, WorkflowMqModule, ModelsModule, KnowledgeBaseModule],
  controllers: [
    AgentController,
    AgentToolGatewayController,
    AppApiController,
    AppApiManagementController,
    PublicAppApiController,
    StudioAppController,
    WorkflowDeploymentController,
    WorkflowDraftController,
    WorkflowRunController,
    WorkflowVersionController,
  ],
  providers: [
    AgentInternalAuthGuard,
    AgentRunService,
    AgentContextService,
    AgentToolGatewayService,
    AppApiService,
    AppApiRepository,
    AppApiKeyGuard,
    AppApiCallLogInterceptor,
    StudioAppService,
    StudioAppRepository,
    WorkflowDeploymentService,
    WorkflowDeploymentRepository,
    WorkflowDraftService,
    WorkflowDraftRepository,
    WorkflowRunService,
    WorkflowRunEventStreamService,
    WorkflowRunSseService,
    WorkflowRunTimeoutScanner,
    WorkflowRunRepository,
    WorkflowVersionService,
    WorkflowVersionRepository,
    WorkflowExecutionRoutingService,
    WorkflowOutboxPublisher,
    WorkflowResultConsumer,
    WorkflowCatalogResolver,
  ],
})
export class StudioModule {}
