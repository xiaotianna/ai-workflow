import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

import { pluginManifestSchema, type PluginManifest } from '@ai-workflow/plugin'
import { BadRequestException, Injectable } from '@nestjs/common'

const TAR_BLOCK_SIZE = 512,
  MAX_UNPACKED_SIZE = 200 * 1024 * 1024,
  MAX_ARCHIVE_FILES = 2048,
  SHA256_PATTERN = /^[a-f0-9]{64}$/i

interface ArchiveEntry {
  path: string
  content: Buffer
}

interface IntegrityEntry {
  path: string
  size: number
  sha256: string
}

interface IntegrityFile {
  algorithm: 'sha256'
  digest: string
  files: IntegrityEntry[]
}

export interface InspectedPluginPackage {
  manifest: PluginManifest
  archiveDigest: string
  artifactDigest: string
}

@Injectable()
export class PluginPackageInspector {
  inspect(archive: Buffer): InspectedPluginPackage {
    const entries = this.readArchive(archive),
      manifest = this.parseManifest(this.requireEntry(entries, 'plugin.manifest.json')),
      integrity = this.parseIntegrity(this.requireEntry(entries, 'integrity.json'))

    this.verifyIntegrity(entries, integrity, manifest)

    return {
      manifest,
      archiveDigest: sha256(archive),
      artifactDigest: integrity.digest,
    }
  }

  private readArchive(archive: Buffer): Map<string, ArchiveEntry> {
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

      this.verifyTarChecksum(header)

      const name = readTarString(header, 0, 100),
        prefix = readTarString(header, 345, 155),
        path = prefix ? `${prefix}/${name}` : name,
        normalizedPath = validateArchivePath(path),
        type = String.fromCharCode(header[156] ?? 0),
        size = readTarOctal(header, 124, 12),
        contentStart = offset + TAR_BLOCK_SIZE,
        contentEnd = contentStart + size

      if (contentEnd > tar.length) {
        throw new BadRequestException(`插件包内文件不完整：${normalizedPath}`)
      }

      if (type !== '\0' && type !== '0') {
        throw new BadRequestException(`插件包包含不支持的文件类型：${normalizedPath}`)
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
    }

    if (entries.size === 0) {
      throw new BadRequestException('插件包内容为空')
    }

    return entries
  }

  private verifyTarChecksum(header: Buffer): void {
    const expectedChecksum = readTarOctal(header, 148, 8),
      checksumHeader = Buffer.from(header)
    checksumHeader.fill(0x20, 148, 156)
    const actualChecksum = checksumHeader.reduce((sum, byte) => sum + byte, 0)

    if (actualChecksum !== expectedChecksum) {
      throw new BadRequestException('插件包 TAR 校验和不正确')
    }
  }

  private requireEntry(entries: Map<string, ArchiveEntry>, path: string): Buffer {
    const entry = entries.get(path)
    if (!entry) throw new BadRequestException(`插件包缺少 ${path}`)
    return entry.content
  }

  private parseManifest(content: Buffer): PluginManifest {
    const rawManifest = parseJson(content, 'plugin.manifest.json'),
      result = pluginManifestSchema.safeParse(rawManifest)

    if (!result.success) {
      throw new BadRequestException(`插件 Manifest 校验失败：${result.error.issues[0]?.message}`)
    }

    return result.data
  }

  private parseIntegrity(content: Buffer): IntegrityFile {
    const value = parseJson(content, 'integrity.json')

    if (!isRecord(value) || value.algorithm !== 'sha256' || !isSha256Digest(value.digest)) {
      throw new BadRequestException('插件包 integrity.json 格式不正确')
    }

    if (!Array.isArray(value.files)) {
      throw new BadRequestException('插件包 integrity.json 缺少文件清单')
    }

    const files = value.files.map((entry) => this.parseIntegrityEntry(entry))
    if (new Set(files.map((entry) => entry.path)).size !== files.length) {
      throw new BadRequestException('插件包 integrity.json 包含重复文件')
    }

    return {
      algorithm: 'sha256',
      digest: value.digest,
      files,
    }
  }

  private parseIntegrityEntry(value: unknown): IntegrityEntry {
    if (
      !isRecord(value) ||
      typeof value.path !== 'string' ||
      !Number.isSafeInteger(value.size) ||
      Number(value.size) < 0 ||
      !isSha256Digest(value.sha256)
    ) {
      throw new BadRequestException('插件包 integrity.json 文件条目格式不正确')
    }

    return {
      path: validateArchivePath(value.path),
      size: Number(value.size),
      sha256: value.sha256,
    }
  }

  private verifyIntegrity(
    archiveEntries: Map<string, ArchiveEntry>,
    integrity: IntegrityFile,
    manifest: PluginManifest,
  ): void {
    const expectedPaths = [...archiveEntries.keys()]
        .filter((path) => path !== 'integrity.json')
        .sort((left, right) => left.localeCompare(right)),
      integrityPaths = integrity.files
        .map((entry) => entry.path)
        .sort((left, right) => left.localeCompare(right))

    if (expectedPaths.join('\0') !== integrityPaths.join('\0')) {
      throw new BadRequestException('插件包文件与 integrity.json 清单不一致')
    }

    for (const integrityEntry of integrity.files) {
      const archiveEntry = archiveEntries.get(integrityEntry.path)
      if (
        !archiveEntry ||
        archiveEntry.content.byteLength !== integrityEntry.size ||
        sha256(archiveEntry.content) !== integrityEntry.sha256
      ) {
        throw new BadRequestException(`插件包文件摘要校验失败：${integrityEntry.path}`)
      }
    }

    const artifactEntries = integrity.files
        .filter((entry) => entry.path !== 'plugin.manifest.json')
        .sort((left, right) => left.path.localeCompare(right.path)),
      artifactDigest = sha256(
        artifactEntries.map((entry) => `${entry.path}\0${entry.size}\0${entry.sha256}\n`).join(''),
      )

    if (artifactDigest !== integrity.digest || artifactDigest !== manifest.integrity.digest) {
      throw new BadRequestException('插件包产物摘要与 Manifest 不一致')
    }
  }
}

function readTarString(buffer: Buffer, offset: number, length: number): string {
  const value = buffer.subarray(offset, offset + length),
    nullIndex = value.indexOf(0)
  return value.subarray(0, nullIndex === -1 ? value.length : nullIndex).toString('utf8')
}

function readTarOctal(buffer: Buffer, offset: number, length: number): number {
  const value = readTarString(buffer, offset, length).trim()
  if (!/^[0-7]+$/.test(value)) throw new BadRequestException('插件包 TAR 数值字段格式不正确')
  return Number.parseInt(value, 8)
}

function validateArchivePath(path: string): string {
  const segments = path.split('/')
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new BadRequestException('插件包包含不安全的文件路径')
  }
  return path
}

function parseJson(content: Buffer, fileName: string): unknown {
  try {
    return JSON.parse(content.toString('utf8')) as unknown
  } catch {
    throw new BadRequestException(`插件包内 ${fileName} 不是有效 JSON`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sha256(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex')
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value)
}
