import { PluginController } from '@/controllers/plugin.controller'
import { PluginArtifactStore } from '@/infra/plugin-artifact/plugin-artifact-store'
import { PluginArtifactReader } from '@/infra/plugin-artifact/plugin-artifact-reader'
import { PluginPackageInspector } from '@/infra/plugin-artifact/plugin-package-inspector'
import { PluginRepository } from '@/repositories/plugin.repository'
import { PluginService } from '@/services/plugin.service'
import { PluginCatalogService } from '@/services/plugin-catalog.service'
import { Module } from '@nestjs/common'

import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [PluginController],
  providers: [
    PluginService,
    PluginCatalogService,
    PluginRepository,
    PluginPackageInspector,
    PluginArtifactStore,
    PluginArtifactReader,
  ],
  exports: [PluginCatalogService],
})
export class PluginModule {}
