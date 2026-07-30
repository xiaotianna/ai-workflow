import { StudioAppController } from '@/controllers/studio-app.controller'
import { StudioAppRepository } from '@/repositories/studio-app.repository'
import { StudioAppService } from '@/services/studio-app.service'
import { Module } from '@nestjs/common'
import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [StudioAppController],
  providers: [StudioAppService, StudioAppRepository],
})
export class StudioModule {}
