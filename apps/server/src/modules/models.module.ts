import { ModelController } from '@/controllers/model.controller'
import { ModelCredentialService } from '@/infra/model-provider/model-credential.service'
import { ModelProviderRegistry } from '@/infra/model-provider/model-provider.registry'
import { ModelGroupRepository } from '@/repositories/model-group.repository'
import { ModelConnectionTestService } from '@/services/model-connection-test.service'
import { ModelGroupService } from '@/services/model-group.service'
import { Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [ModelController],
  providers: [
    ModelGroupService,
    ModelConnectionTestService,
    ModelGroupRepository,
    ModelCredentialService,
    ModelProviderRegistry,
  ],
  exports: [ModelGroupRepository, ModelCredentialService, ModelProviderRegistry],
})
export class ModelsModule {}
