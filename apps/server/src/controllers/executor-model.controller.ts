import { ResolveExecutorModelDto } from '@/dto/executor-model.dto'
import { ExecutorModelService } from '@/services/executor-model.service'
import type { ExecutorModelResolutionVo } from '@/vo/executor-model.vo'
import { Body, Controller, Header, Post } from '@nestjs/common'

@Controller('internal/executor/models')
export class ExecutorModelController {
  constructor(private readonly executorModelService: ExecutorModelService) {}

  @Post('resolve')
  @Header('Cache-Control', 'no-store')
  resolve(@Body() dto: ResolveExecutorModelDto): Promise<ExecutorModelResolutionVo> {
    return this.executorModelService.resolve(dto)
  }
}
