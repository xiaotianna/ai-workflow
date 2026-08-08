import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth.module'
import { ENVConfigModule } from './config/config.module'
import { LogModule } from './config/log.module'
import { RedisModule } from './infra/redis/redis.module'
import { PrismaModule } from './infra/prisma/prisma.module'
import { AuthenticationModule } from './modules/authentication.module'
import { StudioModule } from './modules/studio.module'
import { ModelsModule } from './modules/models.module'
import { KnowledgeBaseModule } from './modules/knowledge-base.module'
import { ExecutorModelModule } from './modules/executor-model.module'
import { ExecutorCommandModule } from './modules/executor-command.module'
import { PluginModule } from './modules/plugin.module'

@Module({
  imports: [
    ENVConfigModule,
    LogModule,
    PrismaModule,
    RedisModule,
    AuthenticationModule,
    AuthModule,
    StudioModule,
    ModelsModule,
    KnowledgeBaseModule,
    ExecutorCommandModule,
    ExecutorModelModule,
    PluginModule,
  ],
  controllers: [],
})
export class AppModule {}
