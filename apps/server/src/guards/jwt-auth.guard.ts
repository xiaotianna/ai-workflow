import type {
  AccessTokenPayload,
  AuthenticatedRequest,
} from '@/common/interfaces/auth-context.interface'
import { AuthSessionRepository } from '@/repositories/auth-session.repository'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
// CanActivate判断是否能进入controller，为true可以
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authSessionRepository: AuthSessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.headers.authorization
    if (!authorization) {
      throw new UnauthorizedException('请先登录')
    }
    const [type, token] = authorization.split(' ')
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization 格式错误')
    }

    let payload: AccessTokenPayload
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token)
    } catch {
      throw new UnauthorizedException('Token 无效或已过期')
    }
    if (!payload.sub || !payload.jti) {
      throw new UnauthorizedException('Token 内容无效')
    }
    const isActive = await this.authSessionRepository.isActive(payload.jti, payload.sub)
    if (!isActive) {
      throw new UnauthorizedException('登录状态已失效')
    }
    request.auth = {
      userId: payload.sub,
      jti: payload.jti,
    }
    return true
  }
}
