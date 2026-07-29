import { AuthController } from '@/controllers/auth.controller'
import { PrismaModule } from '@/infra/prisma/prisma.module'
import { UserRepository } from '@/repository/user.repository'
import { AuthService } from '@/services/auth.service'
import { Module } from '@nestjs/common'

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, UserRepository],
})
export class AuthModule {}
