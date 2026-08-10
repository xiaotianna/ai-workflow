import { Module } from '@nestjs/common'

import { WorkflowMqService } from './workflow-mq.service'

@Module({
  providers: [WorkflowMqService],
  exports: [WorkflowMqService],
})
export class WorkflowMqModule {}
