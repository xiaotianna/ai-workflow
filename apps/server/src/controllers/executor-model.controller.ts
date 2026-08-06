import { ResolveExecutorModelDto } from '@/dto/executor-model.dto'
import { ExecutorModelService } from '@/services/executor-model.service'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import type { ExecutorModelResolutionVo } from '@/vo/executor-model.vo'
import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common'

@Controller('internal/executor/models')
@UseGuards(ExecutorInternalAuthGuard)
export class ExecutorModelController {
  constructor(private readonly executorModelService: ExecutorModelService) {}

  @Post('resolve')
  @Header('Cache-Control', 'no-store')
  resolve(@Body() dto: ResolveExecutorModelDto): Promise<ExecutorModelResolutionVo> {
    return this.executorModelService.resolve(dto)
  }
}
