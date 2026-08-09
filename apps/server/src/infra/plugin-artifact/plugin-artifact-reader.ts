import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PluginArtifactStore } from './plugin-artifact-store'
import { PluginPackageInspector } from './plugin-package-inspector'

const TAR_BLOCK_SIZE = 512
const MAX_UNPACKED_SIZE = 200 * 1024 * 1024
const MAX_ARCHIVE_FILES = 2048
const MAX_ASSET_SIZE = 512 * 1024

interface ArchiveEntry {
  path: string
  content: Buffer
}

export interface PluginArtifactAsset {
  content: Buffer
  contentType: string
}

@Injectable()
export class PluginArtifactReader {
  constructor(
    private readonly artifactStore: PluginArtifactStore,
    private readonly packageInspector: PluginPackageInspector,
  ) {}

  async readAsset(artifactReference: string, assetPath: string): Promise<PluginArtifactAsset> {
    const normalizedPath = validateAssetPath(assetPath)
    const archive = await readFile(this.artifactStore.resolveStoragePath(artifactReference))
    return this.readAssetFromArchive(archive, normalizedPath)
  }

  async readVerifiedAsset(
    artifactReference: string,
    expectedArtifactDigest: string,
    assetPath: string,
  ): Promise<PluginArtifactAsset> {
    const normalizedPath = validateAssetPath(assetPath)
    const archive = await readFile(this.artifactStore.resolveStoragePath(artifactReference))
    const inspected = this.packageInspector.inspect(archive)
    if (inspected.artifactDigest.toLowerCase() !== expectedArtifactDigest.toLowerCase()) {
      throw new BadRequestException('插件包产物摘要与运行版本不匹配')
    }
    return this.readAssetFromArchive(archive, normalizedPath)
  }

  private readAssetFromArchive(archive: Buffer, normalizedPath: string): PluginArtifactAsset {
    const entry = this.readArchiveEntry(archive, normalizedPath)

    if (!entry) {
      throw new NotFoundException(`插件资源不存在：${normalizedPath}`)
    }

    if (entry.content.byteLength > MAX_ASSET_SIZE) {
      throw new BadRequestException(`插件资源体积超过限制：${normalizedPath}`)
    }

    return {
      content: entry.content,
      contentType: resolveAssetContentType(normalizedPath),
    }
  }

  private readArchiveEntry(archive: Buffer, assetPath: string): ArchiveEntry | undefined {
    let tar: Buffer

    try {
      tar = gunzipSync(archive, { maxOutputLength: MAX_UNPACKED_SIZE })
    } catch {
      throw new BadRequestException('插件包不是有效的 .tgz 压缩包，或解压后体积超过限制')
    }

    const entries = new Map<string, ArchiveEntry>()
    let offset = 0

    while (offset + TAR_BLOCK_SIZE <= tar.length) {
      const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE)
      if (header.every((byte) => byte === 0)) break

      const name = readTarString(header, 0, 100)
      const prefix = readTarString(header, 345, 155)
      const path = prefix ? `${prefix}/${name}` : name
      const normalizedPath = validateAssetPath(path)
      const type = String.fromCharCode(header[156] ?? 0)
      const size = readTarOctal(header, 124, 12)
      const contentStart = offset + TAR_BLOCK_SIZE
      const contentEnd = contentStart + size

      if (contentEnd > tar.length) {
        throw new BadRequestException(`插件包内文件不完整：${normalizedPath}`)
      }

      if (type !== '\0' && type !== '0') {
        offset = contentStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE
        continue
      }

      if (entries.has(normalizedPath)) {
        throw new BadRequestException(`插件包包含重复文件：${normalizedPath}`)
      }

      entries.set(normalizedPath, {
        path: normalizedPath,
        content: Buffer.from(tar.subarray(contentStart, contentEnd)),
      })

      if (entries.size > MAX_ARCHIVE_FILES) {
        throw new BadRequestException(`插件包文件数量不能超过 ${MAX_ARCHIVE_FILES} 个`)
      }

      offset = contentStart + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE
      if (normalizedPath === assetPath) {
        return entries.get(assetPath)
      }
    }

    return entries.get(assetPath)
  }
}

function readTarString(buffer: Buffer, offset: number, length: number): string {
  const value = buffer.subarray(offset, offset + length)
  const nullIndex = value.indexOf(0)
  return value.subarray(0, nullIndex === -1 ? value.length : nullIndex).toString('utf8')
}

function readTarOctal(buffer: Buffer, offset: number, length: number): number {
  const value = readTarString(buffer, offset, length).trim()
  if (!/^[0-7]+$/.test(value)) throw new BadRequestException('插件包 TAR 数值字段格式不正确')
  return Number.parseInt(value, 8)
}

function validateAssetPath(path: string | undefined): string {
  if (typeof path !== 'string' || !path.trim()) {
    throw new BadRequestException('插件资源路径不能为空')
  }

  const segments = path.replaceAll('\\', '/').split('/')
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new BadRequestException('插件资源路径不安全')
  }
  return segments.join('/')
}

function resolveAssetContentType(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  switch (extension) {
    case 'svg': {
      return 'image/svg+xml'
    }
    case 'png': {
      return 'image/png'
    }
    case 'jpg':
    case 'jpeg': {
      return 'image/jpeg'
    }
    case 'webp': {
      return 'image/webp'
    }
    case 'gif': {
      return 'image/gif'
    }
    case 'js':
    case 'mjs': {
      return 'text/javascript; charset=utf-8'
    }
    case 'json': {
      return 'application/json; charset=utf-8'
    }
    default: {
      return 'application/octet-stream'
    }
  }
}
