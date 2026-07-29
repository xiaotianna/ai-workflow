import { LoginDto } from '@/dto/auth.dto'
import { AuthService } from '@/services/auth.service'
import { LoginVo } from '@/vo/auth.vo'
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'

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
}
