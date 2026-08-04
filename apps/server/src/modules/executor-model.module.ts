import { ExecutorModelController } from '@/controllers/executor-model.controller'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import { ModelEndpointPolicyService } from '@/infra/model-provider/model-endpoint-policy.service'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import { ExecutorModelService } from '@/services/executor-model.service'
import { Module } from '@nestjs/common'

@Module({
  controllers: [ExecutorModelController],
  providers: [
    ExecutorModelService,
    ExecutorModelRepository,
    ModelGroupRepository,
    ModelCredentialService,
    ModelEndpointPolicyService,
    ModelProviderRegistry,
  ],
})
export class ExecutorModelModule {}
