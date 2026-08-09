import { ResolveExecutorPluginArtifactDto } from '@/dto/executor-plugin-artifact.dto'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import {
  ExecutorPluginArtifactService,
  type ExecutorPluginArtifactVo,
} from '@/services/executor-plugin-artifact.service'
import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common'

@Controller('internal/executor/plugin-artifacts')
@UseGuards(ExecutorInternalAuthGuard)
export class ExecutorPluginArtifactController {
  constructor(private readonly service: ExecutorPluginArtifactService) {}

  @Post('resolve')
  @Header('Cache-Control', 'no-store')
  resolve(@Body() dto: ResolveExecutorPluginArtifactDto): Promise<ExecutorPluginArtifactVo> {
    return this.service.resolve(dto)
  }
}
