import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

import { PLUGIN_ARTIFACT_DIRECTORY } from '@/constant/env'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface StorePluginArchiveOptions {
  packageName: string
  version: string
  content: Buffer
}

export interface StoredPluginArchive {
  storageKey: string
}

@Injectable()
export class PluginArtifactStore {
  private readonly rootDirectory: string

  constructor(configService: ConfigService) {
    this.rootDirectory = resolve(
      configService.get<string>(PLUGIN_ARTIFACT_DIRECTORY) ?? 'var/plugin-artifacts',
    )
  }

  async storeArchive(options: StorePluginArchiveOptions): Promise<StoredPluginArchive> {
    const storageKey = join(
      options.packageName.replace(/^@/, '').replaceAll('/', '--'),
      options.version,
      `${randomUUID()}.tgz`,
    )
    const targetPath = this.resolveStoragePath(storageKey)

    try {
      await mkdir(dirname(targetPath), { recursive: true })
      await writeFile(targetPath, options.content, { flag: 'wx', mode: 0o600 })
    } catch {
      throw new InternalServerErrorException('插件产物保存失败')
    }

    return { storageKey: storageKey.split(sep).join('/') }
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveStoragePath(storageKey))
    } catch {
      // 数据库发布失败后的补偿清理属于尽力而为，遗留文件后续由孤儿产物 GC 清理。
    }
  }

  private resolveStoragePath(storageKey: string): string {
    const targetPath = resolve(this.rootDirectory, storageKey)
    const relativePath = relative(this.rootDirectory, targetPath)

    if (!relativePath || relativePath.startsWith('..') || relativePath.startsWith(sep)) {
      throw new InternalServerErrorException('插件产物存储路径不安全')
    }

    return targetPath
  }
}
