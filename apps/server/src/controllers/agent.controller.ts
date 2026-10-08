import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { AgentInternalAuthGuard } from '@/guards/agent-internal-auth.guard'
import { AgentRunService } from '@/services/agent-run.service'
import { AgentToolGatewayService } from '@/services/agent-tool-gateway.service'

@JwtAuth()
@Controller('studio/apps/:appId/agent')
export class AgentController {
  constructor(private readonly runs: AgentRunService) {}
  @Post('runs')
  stream(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
    @Body() body: unknown,
    @Res() response: Response,
  ) {
    return this.runs.stream(request.auth.userId, appId, body, response)
  }
  @Post('sessions/:sessionId/abort')
  abort(
    @Req() request: AuthenticatedRequest,
    @Param('appId', new ParseUUIDPipe({ version: '4' })) appId: string,
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
  ) {
    return this.runs.abort(request.auth.userId, appId, sessionId)
  }
}

@UseGuards(AgentInternalAuthGuard)
@Controller('internal/agent/tools')
export class AgentToolGatewayController {
  constructor(private readonly gateway: AgentToolGatewayService) {}
  @Post('execute')
  async execute(
    @Headers('x-agent-context') token: string,
    @Body() body: unknown,
    @Res() response: Response,
  ) {
    // 内部协议直接返回，避免全局 ApiResponse 包装改变 Gateway Schema。
    const result = await this.gateway.execute(token, body)
    response.setHeader('Cache-Control', 'no-store')
    response.json(result)
  }
}
