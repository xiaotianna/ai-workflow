import { PluginController } from '@/controllers/plugin.controller'
import { ExecutorPluginArtifactController } from '@/controllers/executor-plugin-artifact.controller'
import { ExecutorInternalAuthGuard } from '@/guards/executor-internal-auth.guard'
import { PluginArtifactStore } from '@/infra/plugin-artifact/plugin-artifact-store'
import { PluginArtifactReader } from '@/infra/plugin-artifact/plugin-artifact-reader'
import { PluginPackageInspector } from '@/infra/plugin-artifact/plugin-package-inspector'
import { PluginRepository } from '@/repositories/plugin.repository'
import { ExecutorPluginArtifactRepository } from '@/repositories/executor-plugin-artifact.repository'
import { PluginService } from '@/services/plugin.service'
import { PluginCatalogService } from '@/services/plugin-catalog.service'
import { ExecutorPluginArtifactService } from '@/services/executor-plugin-artifact.service'
import { Module } from '@nestjs/common'

import { JwtModule } from './jwt.module'

@Module({
  imports: [JwtModule],
  controllers: [PluginController, ExecutorPluginArtifactController],
  providers: [
    PluginService,
    PluginCatalogService,
    PluginRepository,
    PluginPackageInspector,
    PluginArtifactStore,
    PluginArtifactReader,
    ExecutorPluginArtifactRepository,
    ExecutorPluginArtifactService,
    ExecutorInternalAuthGuard,
  ],
  exports: [PluginCatalogService],
})
export class PluginModule {}
