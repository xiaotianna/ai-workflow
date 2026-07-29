import { AuthController } from '@/controllers/auth.controller'
import { UserRepository } from '@/repositories/user.repository'
import { AuthService } from '@/services/auth.service'
import { Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'
import { AuthSessionRepository } from '@/repositories/auth-session.repository'

@Module({
  imports: [JwtModule],
  controllers: [AuthController],
  providers: [AuthService, UserRepository, AuthSessionRepository],
})
export class AuthModule {}
