import { ExecutorCommandController } from '@/controllers/executor-command.controller'
import { ExecutorCommandRepository } from '@/repositories/executor-command.repository'
import { ExecutorCommandService } from '@/services/executor-command.service'
import { Module } from '@nestjs/common'

@Module({
  controllers: [ExecutorCommandController],
  providers: [ExecutorCommandService, ExecutorCommandRepository],
})
export class ExecutorCommandModule {}
