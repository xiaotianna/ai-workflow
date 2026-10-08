import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { timingSafeEqual } from 'node:crypto'

@Injectable()
export class AgentInternalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const token = this.config.get<string>('AGENT_RUNTIME_INTERNAL_AUTH_TOKEN')
    if (!token) throw new ServiceUnavailableException('Agent Runtime 尚未配置')
    const request = context.switchToHttp().getRequest<Request>(),
      expected = Buffer.from(`Bearer ${token}`),
      supplied = Buffer.from(request.headers.authorization ?? '')
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
      throw new UnauthorizedException('内部认证失败')
    return true
  }
}
