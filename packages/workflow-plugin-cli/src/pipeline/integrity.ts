import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import type { IntegrityFileEntry } from '../shared/types'

function toArtifactPath(value: string): string {
  return value.split(sep).join('/')
}

async function listFiles(directory: string, currentDirectory = directory): Promise<string[]> {
  const entries = await readdir(currentDirectory, { withFileTypes: true }),
    files: string[] = []

  for (const entry of entries) {
    const entryPath = join(currentDirectory, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(directory, entryPath)))
    else if (entry.isFile()) files.push(entryPath)
  }
  return files.sort((left, right) => left.localeCompare(right))
}

export function sha256(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex')
}

export async function createFileIntegrityEntries(
  directory: string,
  excludedPaths: readonly string[] = [],
): Promise<IntegrityFileEntry[]> {
  const excluded = new Set(excludedPaths),
    files = await listFiles(directory),
    entries: IntegrityFileEntry[] = []

  for (const filePath of files) {
    const artifactPath = toArtifactPath(relative(directory, filePath))
    if (excluded.has(artifactPath)) continue
    const content = await readFile(filePath),
      fileStats = await stat(filePath)
    entries.push({
      path: artifactPath,
      size: fileStats.size,
      sha256: sha256(content),
    })
  }
  return entries
}

export function createIntegrityDigest(entries: readonly IntegrityFileEntry[]): string {
  const content = entries.map((entry) => `${entry.path}\0${entry.size}\0${entry.sha256}\n`).join('')
  return sha256(content)
}
