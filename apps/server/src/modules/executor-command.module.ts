import { ExecutorCommandController } from '@/controllers/executor-command.controller'
import { ExecutorCommandRepository } from '@/repositories/executor-command.repository'
import { ExecutorCommandService } from '@/services/executor-command.service'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import { Module } from '@nestjs/common'

@Module({
  controllers: [ExecutorCommandController],
  providers: [ExecutorCommandService, ExecutorCommandRepository, ExecutorInternalAuthGuard],
})
export class ExecutorCommandModule {}
