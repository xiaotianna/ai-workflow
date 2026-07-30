import { StudioAppController } from '@/controllers/studio-app.controller'
import { WorkflowDraftController } from '@/controllers/workflow-draft.controller'
import { StudioAppRepository } from '@/repositories/studio-app.repository'
import { WorkflowDraftRepository } from '@/repositories/workflow-draft.repository'
import { StudioAppService } from '@/services/studio-app.service'
import { WorkflowDraftService } from '@/services/workflow-draft.service'
import { Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [StudioAppController, WorkflowDraftController],
  providers: [StudioAppService, StudioAppRepository, WorkflowDraftService, WorkflowDraftRepository],
})
export class StudioModule {}
