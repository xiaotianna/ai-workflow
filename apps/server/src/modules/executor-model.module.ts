import { ModelsModule } from './models.module'
import { ExecutorModelController } from '@/controllers/executor-model.controller'
import { ExecutorModelRepository } from '@/repositories/executor-model.repository'
import { ExecutorModelService } from '@/services/executor-model.service'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import { Module } from '@nestjs/common'

import { PluginModule } from './plugin.module'

@Module({
  imports: [PluginModule, ModelsModule],
  controllers: [ExecutorModelController],
  providers: [ExecutorModelService, ExecutorModelRepository, ExecutorInternalAuthGuard],
})
export class ExecutorModelModule {}
