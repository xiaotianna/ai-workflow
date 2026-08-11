import type { KnowledgeApiAuthenticatedRequest } from '@/common/interfaces/knowledge-api-auth-context.interface'
import { KnowledgeApiService } from '@/services/knowledge-api.service'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class KnowledgeApiKeyGuard implements CanActivate {
  constructor(private readonly knowledgeApiService: KnowledgeApiService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<KnowledgeApiAuthenticatedRequest>()
    const authorization = request.headers.authorization
    const match = typeof authorization === 'string' ? /^Bearer\s+(.+)$/i.exec(authorization) : null
    const rawKey = match?.[1]?.trim()

    if (!rawKey) throw new UnauthorizedException('请在 Authorization Header 中提供 API 密钥')
    request.knowledgeApiAuth = await this.knowledgeApiService.authenticate(rawKey)
    return true
  }
}
