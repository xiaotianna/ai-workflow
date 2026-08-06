import { EXECUTOR_INTERNAL_AUTH_TOKEN, EXECUTOR_REQUIRE_INTERNAL_AUTH } from '@/constant/env'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'node:crypto'

@Injectable()
export class ExecutorInternalAuthGuard implements CanActivate {
  private readonly token: string

  constructor(configService: ConfigService) {
    this.token = configService.get<string>(EXECUTOR_INTERNAL_AUTH_TOKEN) ?? ''
    if (configService.get<boolean>(EXECUTOR_REQUIRE_INTERNAL_AUTH) && !this.token) {
      throw new Error('EXECUTOR_REQUIRE_INTERNAL_AUTH 已启用，但未配置内部认证令牌')
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // 空配置保留现有本地部署行为；生产部署应配置独立的 Executor 内部认证令牌。
    if (!this.token) return true

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>
    }>()
    const authorization = request.headers.authorization
    const value = Array.isArray(authorization) ? authorization[0] : authorization
    const prefix = 'Bearer '
    const provided = value?.startsWith(prefix) ? value.slice(prefix.length) : ''

    if (!safeEqual(provided, this.token)) {
      throw new UnauthorizedException('Executor 内部认证失败')
    }
    return true
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
