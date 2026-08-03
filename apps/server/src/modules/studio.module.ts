import { StudioAppController } from '@/controllers/studio-app.controller'
import { WorkflowDraftController } from '@/controllers/workflow-draft.controller'
import { WorkflowRunController } from '@/controllers/workflow-run.controller'
import { WorkflowMqService } from '@/infra/workflow-mq/workflow-mq.service'
import { WorkflowOutboxPublisher } from '@/infra/workflow-mq/workflow-outbox.publisher'
import { WorkflowResultConsumer } from '@/infra/workflow-mq/workflow-result.consumer'
import { StudioAppRepository } from '@/repositories/studio-app.repository'
import { WorkflowDraftRepository } from '@/repositories/workflow-draft.repository'
import { WorkflowRunRepository } from '@/repositories/workflow-run.repository'
import { StudioAppService } from '@/services/studio-app.service'
import { WorkflowDraftService } from '@/services/workflow-draft.service'
import { WorkflowRunService } from '@/services/workflow-run.service'
import { WorkflowRunEventStreamService } from '@/services/workflow-run-event-stream.service'
import { WorkflowRunTimeoutScanner } from '@/services/workflow-run-timeout-scanner.service'
import { Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [StudioAppController, WorkflowDraftController, WorkflowRunController],
  providers: [
    StudioAppService,
    StudioAppRepository,
    WorkflowDraftService,
    WorkflowDraftRepository,
    WorkflowRunService,
    WorkflowRunEventStreamService,
    WorkflowRunTimeoutScanner,
    WorkflowRunRepository,
    WorkflowMqService,
    WorkflowOutboxPublisher,
    WorkflowResultConsumer,
  ],
})
export class StudioModule {}
