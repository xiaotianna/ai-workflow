import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import { pluginIdSchema } from '@ai-workflow/plugin'

import { buildPluginArtifacts } from '../pipeline/artifacts'
import { createFileIntegrityEntries, createIntegrityDigest } from '../pipeline/integrity'
import { createPluginBuildPlan, finalizePluginManifest } from '../pipeline/manifest'
import { formatSchemaIssues, PluginCliError } from '../shared/diagnostics'
import type { BuildPluginOptions, BuildPluginResult, IntegrityFile } from '../shared/types'
import { checkPlugin } from './check'
import {
  ensureSafePackageDirectory,
  inferPublisher,
  resolvePackageOutputDirectory,
} from '../package/package-context'

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function resolvePublisher(packageName: string, requestedPublisher?: string): string {
  const publisher = requestedPublisher ?? inferPublisher(packageName)
  if (!publisher) {
    throw new PluginCliError('构建插件时必须明确 publisher', {
      code: 'MISSING_PUBLISHER',
      details: ['传入 --publisher，或使用可推导 publisher 的 scoped package 名称'],
    })
  }

  const result = pluginIdSchema.safeParse(publisher)
  if (!result.success) {
    throw new PluginCliError('publisher 格式不合法', {
      code: 'INVALID_PUBLISHER',
      details: formatSchemaIssues(result.error),
    })
  }
  return result.data
}

async function replaceOutputDirectory(stagingDirectory: string, outDir: string): Promise<void> {
  const backupDirectory = join(
    dirname(outDir),
    `.${basename(outDir)}-backup-${process.pid}-${Date.now()}`,
  )
  let hasBackup = false

  try {
    await rename(outDir, backupDirectory)
    hasBackup = true
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }

  try {
    await rename(stagingDirectory, outDir)
  } catch (error) {
    if (hasBackup) await rename(backupDirectory, outDir)
    throw error
  }

  if (hasBackup) await rm(backupDirectory, { recursive: true, force: true })
}

export async function buildPlugin(options: BuildPluginOptions = {}): Promise<BuildPluginResult> {
  const checkedPlugin = await checkPlugin(options)
  const publisher = resolvePublisher(checkedPlugin.package.name, options.publisher)
  const outDir = resolvePackageOutputDirectory(checkedPlugin.package.rootDir, options.outDir)
  await ensureSafePackageDirectory(checkedPlugin.package.rootDir, dirname(outDir))
  const stagingDirectory = await mkdtemp(join(dirname(outDir), `.${basename(outDir)}-stage-`))

  try {
    const plan = createPluginBuildPlan(checkedPlugin, publisher)
    await buildPluginArtifacts(checkedPlugin, plan, stagingDirectory)

    const artifactEntries = await createFileIntegrityEntries(stagingDirectory)
    const artifactDigest = createIntegrityDigest(artifactEntries)
    const manifest = finalizePluginManifest(plan, artifactDigest)
    const manifestPath = join(stagingDirectory, 'plugin.manifest.json')
    await writeJson(manifestPath, manifest)

    const files = await createFileIntegrityEntries(stagingDirectory)
    const integrity: IntegrityFile = {
      algorithm: 'sha256',
      digest: artifactDigest,
      files,
    }
    await writeJson(join(stagingDirectory, 'integrity.json'), integrity)
    await replaceOutputDirectory(stagingDirectory, outDir)

    return { package: checkedPlugin.package, manifest, outDir, integrity }
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true })
    throw error
  }
}
