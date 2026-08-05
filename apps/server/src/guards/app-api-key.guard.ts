import type { AppApiAuthenticatedRequest } from '@/common/interfaces/app-api-auth-context.interface'
import { AppApiService } from '@/services/app-api.service'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class AppApiKeyGuard implements CanActivate {
  constructor(private readonly appApiService: AppApiService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppApiAuthenticatedRequest>()
    const authorization = request.headers.authorization
    const match = typeof authorization === 'string' ? /^Bearer\s+(.+)$/i.exec(authorization) : null
    const rawKey = match?.[1]?.trim()

    if (!rawKey) throw new UnauthorizedException('请在 Authorization Header 中提供 API 密钥')
    request.appApiAuth = await this.appApiService.authenticate(rawKey)
    return true
  }
}
