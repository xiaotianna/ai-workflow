import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { gzipSync } from 'node:zlib'

import { buildPlugin } from './build'
import type { BuildPluginOptions, PackPluginResult } from '../shared/types'

const TAR_BLOCK_SIZE = 512

interface ArchiveFile {
  readonly path: string
  readonly content: Buffer
}

function writeTarString(buffer: Buffer, offset: number, length: number, value: string): void {
  buffer.write(value, offset, Math.min(length, Buffer.byteLength(value)), 'utf8')
}

function writeTarOctal(buffer: Buffer, offset: number, length: number, value: number): void {
  const encoded = `${value.toString(8).padStart(length - 1, '0')}\0`
  writeTarString(buffer, offset, length, encoded)
}

function splitTarPath(path: string): { readonly name: string; readonly prefix: string } {
  if (Buffer.byteLength(path) <= 100) return { name: path, prefix: '' }

  const separatorIndex = path.lastIndexOf('/')
  const prefix = path.slice(0, separatorIndex)
  const name = path.slice(separatorIndex + 1)
  if (separatorIndex < 1 || Buffer.byteLength(name) > 100 || Buffer.byteLength(prefix) > 155) {
    throw new Error(`Artifact 路径过长，无法写入 tar：${path}`)
  }
  return { name, prefix }
}

function createTarHeader(file: ArchiveFile): Buffer {
  const header = Buffer.alloc(TAR_BLOCK_SIZE)
  const { name, prefix } = splitTarPath(file.path)
  writeTarString(header, 0, 100, name)
  writeTarOctal(header, 100, 8, 0o644)
  writeTarOctal(header, 108, 8, 0)
  writeTarOctal(header, 116, 8, 0)
  writeTarOctal(header, 124, 12, file.content.byteLength)
  writeTarOctal(header, 136, 12, 0)
  header.fill(0x20, 148, 156)
  header.write('0', 156, 1, 'ascii')
  writeTarString(header, 257, 6, 'ustar\0')
  writeTarString(header, 263, 2, '00')
  writeTarString(header, 345, 155, prefix)

  const checksum = header.reduce((sum, byte) => sum + byte, 0)
  const encodedChecksum = `${checksum.toString(8).padStart(6, '0')}\0 `
  writeTarString(header, 148, 8, encodedChecksum)
  return header
}

async function collectArchiveFiles(
  rootDirectory: string,
  currentDirectory = rootDirectory,
): Promise<ArchiveFile[]> {
  const entries = await readdir(currentDirectory, { withFileTypes: true })
  const files: ArchiveFile[] = []

  for (const entry of entries) {
    const entryPath = join(currentDirectory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectArchiveFiles(rootDirectory, entryPath)))
    else if (entry.isFile() && !entry.name.endsWith('.tgz')) {
      files.push({
        path: relative(rootDirectory, entryPath).split(sep).join('/'),
        content: await readFile(entryPath),
      })
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function createTar(files: readonly ArchiveFile[]): Buffer {
  const chunks: Buffer[] = []
  for (const file of files) {
    chunks.push(createTarHeader(file), file.content)
    const paddingLength =
      (TAR_BLOCK_SIZE - (file.content.byteLength % TAR_BLOCK_SIZE)) % TAR_BLOCK_SIZE
    if (paddingLength > 0) chunks.push(Buffer.alloc(paddingLength))
  }
  chunks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2))
  return Buffer.concat(chunks)
}

export async function packPlugin(options: BuildPluginOptions = {}): Promise<PackPluginResult> {
  const buildResult = await buildPlugin(options)
  const archiveName = `${buildResult.manifest.plugin.id}-${buildResult.package.version}.tgz`
  const archivePath = join(buildResult.outDir, archiveName)
  const tar = createTar(await collectArchiveFiles(buildResult.outDir))
  const archive = gzipSync(tar, { level: 9 })
  archive[9] = 255
  await writeFile(archivePath, archive)
  const archiveDigest = createHash('sha256').update(archive).digest('hex')

  return { ...buildResult, archivePath, archiveDigest }
}
