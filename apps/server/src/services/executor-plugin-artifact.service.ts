import { createHash } from 'node:crypto'

import type { ResolveExecutorPluginArtifactDto } from '@/dto/executor-plugin-artifact.dto'
import { PluginArtifactReader } from '@/infra/plugin-artifact/plugin-artifact-reader'
import { ExecutorPluginArtifactRepository } from '@/repositories/executor-plugin-artifact.repository'
import { pluginManifestSchema } from '@ai-workflow/plugin'
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'

export interface ExecutorPluginArtifactVo {
  source: string
  sha256: string
}

@Injectable()
export class ExecutorPluginArtifactService {
  constructor(
    private readonly repository: ExecutorPluginArtifactRepository,
    private readonly artifactReader: PluginArtifactReader,
  ) {}

  async resolve(dto: ResolveExecutorPluginArtifactDto): Promise<ExecutorPluginArtifactVo> {
    const context = await this.repository.findResolutionContext(dto),
      dependency = context?.run.version.pluginDependencies[0]
    if (!context || !dependency) {
      throw new NotFoundException('插件运行上下文不存在、租约已失效或制品版本不匹配')
    }
    const manifest = pluginManifestSchema.safeParse(dependency.manifest)
    if (
      !manifest.success ||
      manifest.data.integrity.digest.toLowerCase() !== dto.artifactDigest.toLowerCase()
    ) {
      throw new UnprocessableEntityException('插件运行 Manifest 或制品摘要无效')
    }
    const node = manifest.data.nodes.find((candidate) => candidate.type === context.nodeType)
    if (
      !node ||
      node.execution.kind !== 'sandbox-js' ||
      node.execution.artifact !== dto.artifactPath
    ) {
      throw new NotFoundException('插件节点没有绑定请求的 Executor 制品')
    }
    const artifact = await this.artifactReader.readVerifiedAsset(
        dependency.artifactReference,
        dependency.artifactDigest,
        dto.artifactPath,
      ),
      source = artifact.content.toString('utf8')
    if (!Buffer.from(source, 'utf8').equals(artifact.content)) {
      throw new UnprocessableEntityException('插件 Executor 不是有效的 UTF-8 ESM')
    }
    return {
      source,
      sha256: createHash('sha256').update(artifact.content).digest('hex'),
    }
  }
}
