import { AccessTokenPayload } from '@/common/interfaces/auth-context.interface'
import { LoginDto } from '@/dto/auth.dto'
import { AuthSessionRepository } from '@/repository/auth-session.repository'
import { UserRepository } from '@/repository/user.repository'
import { LoginVo } from '@/vo/auth.vo'
import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { hash, verify } from 'argon2'
import { randomUUID } from 'node:crypto'

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly authSessionRepository: AuthSessionRepository,
  ) {}

  async login(dto: LoginDto): Promise<LoginVo> {
    const credential = await this.userRepository.findByPhone(dto.phone)
    // 用户不存在自动注册
    if (!credential) {
      const password = await hash(dto.password)
      const user = await this.userRepository.create({
        phone: dto.phone,
        password,
        username: `用户${dto.phone.slice(-4)}`,
      })

      const token = await this.issueToken(user.id)

      return {
        ...user,
        token,
      }
    }

    const password = await verify(credential.password, dto.password)
    if (!password) {
      throw new UnauthorizedException('手机号或密码错误')
    }

    const user = await this.userRepository.findById(credential.id)

    if (!user) {
      throw new UnauthorizedException('手机号或密码错误')
    }

    const token = await this.issueToken(user.id)

    return {
      ...user,
      token,
    }
  }

  async logout(jti: string): Promise<void> {
    await this.authSessionRepository.delete(jti)
  }

  private async issueToken(userId: string): Promise<string> {
    const jti = randomUUID()

    const token = await this.jwtService.signAsync({
      sub: userId,
      jti,
    })

    // 从已经生成的 token 中获取真实过期时间，避免 Redis TTL 和 JWT 配置分别维护。
    const payload = this.jwtService.decode<Partial<AccessTokenPayload> | null>(token)

    if (!payload || typeof payload.exp !== 'number') {
      throw new InternalServerErrorException('JWT 未配置有效期')
    }

    const ttlSeconds = payload.exp - Math.floor(Date.now() / 1000)

    if (ttlSeconds <= 0) {
      throw new InternalServerErrorException('JWT 有效期配置无效')
    }

    // 写入成功后才把 token 返回客户端
    await this.authSessionRepository.create(jti, userId, ttlSeconds)

    return token
  }
}
