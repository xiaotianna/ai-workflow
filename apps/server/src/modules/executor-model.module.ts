import { ExecutorModelController } from '@/controllers/executor-model.controller'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import { ExecutorModelService } from '@/services/executor-model.service'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import { Module } from '@nestjs/common'

@Module({
  controllers: [ExecutorModelController],
  providers: [
    ExecutorModelService,
    ExecutorModelRepository,
    ModelGroupRepository,
    ModelCredentialService,
    ModelProviderRegistry,
    ExecutorInternalAuthGuard,
  ],
})
export class ExecutorModelModule {}
