import { StudioAppController } from '@/controllers/studio-app.controller'
import { WorkflowDeploymentController } from '@/controllers/workflow-deployment.controller'
import { WorkflowDraftController } from '@/controllers/workflow-draft.controller'
import { WorkflowRunController } from '@/controllers/workflow-run.controller'
import { WorkflowVersionController } from '@/controllers/workflow-version.controller'
import { WorkflowMqService } from '@/infra/workflow-mq/workflow-mq.service'
import { WorkflowOutboxPublisher } from '@/infra/workflow-mq/workflow-outbox.publisher'
import { WorkflowResultConsumer } from '@/infra/workflow-mq/workflow-result.consumer'
import { StudioAppRepository } from '@/repositories/studio-app.repository'
import { WorkflowDeploymentRepository } from '@/repositories/workflow-deployment.repository'
import { WorkflowDraftRepository } from '@/repositories/workflow-draft.repository'
import { WorkflowRunRepository } from '@/repositories/workflow-run.repository'
import { WorkflowVersionRepository } from '@/repositories/workflow-version.repository'
import { StudioAppService } from '@/services/studio-app.service'
import { WorkflowDeploymentService } from '@/services/workflow-deployment.service'
import { WorkflowDraftService } from '@/services/workflow-draft.service'
import { WorkflowRunService } from '@/services/workflow-run.service'
import { WorkflowRunEventStreamService } from '@/services/workflow-run-event-stream.service'
import { WorkflowRunTimeoutScanner } from '@/services/workflow-run-timeout-scanner.service'
import { WorkflowVersionService } from '@/services/workflow-version.service'
import { Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [
    StudioAppController,
    WorkflowDeploymentController,
    WorkflowDraftController,
    WorkflowRunController,
    WorkflowVersionController,
  ],
  providers: [
    StudioAppService,
    StudioAppRepository,
    WorkflowDeploymentService,
    WorkflowDeploymentRepository,
    WorkflowDraftService,
    WorkflowDraftRepository,
    WorkflowRunService,
    WorkflowRunEventStreamService,
    WorkflowRunTimeoutScanner,
    WorkflowRunRepository,
    WorkflowVersionService,
    WorkflowVersionRepository,
    WorkflowMqService,
    WorkflowOutboxPublisher,
    WorkflowResultConsumer,
  ],
})
export class StudioModule {}
