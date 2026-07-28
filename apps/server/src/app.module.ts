import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModel } from './modules/auth.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModel],
  controllers: [],
  providers: [],
})
export class AppModule {}
