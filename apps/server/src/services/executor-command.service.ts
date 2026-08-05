import type { ValidateExecutorCommandLeaseDto } from '@/dto/executor-command.dto'
import { ExecutorCommandRepository } from '@/repositories/executor-command.repository'
import type { ExecutorCommandLeaseVo } from '@/vo/executor-command.vo'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ExecutorCommandService {
  constructor(private readonly executorCommandRepository: ExecutorCommandRepository) {}

  async validateLease(dto: ValidateExecutorCommandLeaseDto): Promise<ExecutorCommandLeaseVo> {
    return {
      active: await this.executorCommandRepository.isLeaseActive(dto),
    }
  }
}
