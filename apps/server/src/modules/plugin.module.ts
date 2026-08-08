import { PluginController } from '@/controllers/plugin.controller'
import { PluginArtifactStore } from '@/infra/plugin-artifact/plugin-artifact-store'
import { PluginPackageInspector } from '@/infra/plugin-artifact/plugin-package-inspector'
import { PluginRepository } from '@/repositories/plugin.repository'
import { PluginService } from '@/services/plugin.service'
import { Module } from '@nestjs/common'

import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [PluginController],
  providers: [PluginService, PluginRepository, PluginPackageInspector, PluginArtifactStore],
})
export class PluginModule {}
