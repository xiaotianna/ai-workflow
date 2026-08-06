import { ValidateExecutorCommandLeaseDto } from '@/dto/executor-command.dto'
import { ExecutorCommandService } from '@/services/executor-command.service'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import type { ExecutorCommandLeaseVo } from '@/vo/executor-command.vo'
import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common'

@Controller('internal/executor/commands')
@UseGuards(ExecutorInternalAuthGuard)
export class ExecutorCommandController {
  constructor(private readonly executorCommandService: ExecutorCommandService) {}

  @Post('lease')
  @Header('Cache-Control', 'no-store')
  validateLease(@Body() dto: ValidateExecutorCommandLeaseDto): Promise<ExecutorCommandLeaseVo> {
    return this.executorCommandService.validateLease(dto)
  }
}
