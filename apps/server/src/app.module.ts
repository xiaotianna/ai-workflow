import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth.module'
import { ENVConfigModule } from './config/config.module'
import { LogModule } from './config/log.module'
import { RedisModule } from './infra/redis/redis.module'
import { PrismaModule } from './infra/prisma/prisma.module'
import { AuthenticationModule } from './modules/authentication.module'

@Module({
  imports: [
    ENVConfigModule,
    LogModule,
    PrismaModule,
    RedisModule,
    AuthenticationModule,
    AuthModule,
  ],
  controllers: [],
})
export class AppModule {}
