import { Global, Module } from '@nestjs/common'
import { AuthModule } from './modules/auth.module'
import { ENVConfigModule } from './config/config.module'
import { LogModule } from './config/log.module'

@Global()
@Module({
  imports: [ENVConfigModule, LogModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
