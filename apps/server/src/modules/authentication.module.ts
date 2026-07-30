import { JwtAuthGuard } from '@/guards/jwt-auth.guard'
import { AuthSessionRepository } from '@/repositories/auth-session.repository'
import { Global, Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'

@Global()
@Module({
  imports: [JwtModule],
  providers: [AuthSessionRepository, JwtAuthGuard],
  exports: [AuthSessionRepository, JwtAuthGuard],
})
export class AuthenticationModule {}
