import type { AuthenticatedRequest } from '@/common/interfaces/auth-context.interface'
import { JwtAuth } from '@/decorators/jwt-auth.decorator'
import { LoginDto, UpdateCurrentUserDto } from '@/dto/auth.dto'
import { AuthService } from '@/services/auth.service'
import { CurrentUserVo, LoginVo } from '@/vo/auth.vo'
import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req } from '@nestjs/common'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  // 统一成功返回的请求状态码，post在nestjs默认为201
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginVo> {
    const user = await this.authService.login(dto)
    return user
  }

  @Post('logout')
  @JwtAuth()
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.authService.logout(request.auth.jti)
  }

  @Get('me')
  @JwtAuth()
  async getCurrentUser(@Req() request: AuthenticatedRequest): Promise<CurrentUserVo> {
    return this.authService.getCurrentUser(request.auth.userId)
  }

  @Patch('me')
  @JwtAuth()
  async updateCurrentUser(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateCurrentUserDto,
  ): Promise<CurrentUserVo> {
    return this.authService.updateCurrentUser(request.auth.userId, dto)
  }
}
