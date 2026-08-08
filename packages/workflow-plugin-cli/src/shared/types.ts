import type { ParsedPluginConfig, PluginManifest } from '@ai-workflow/plugin'

export interface PluginPackageJson {
  readonly name?: unknown
  readonly version?: unknown
  readonly exports?: unknown
}

export interface PluginPackageContext {
  readonly rootDir: string
  readonly packageJsonPath: string
  readonly name: string
  readonly version: string
  readonly entryPath: string
  readonly packageJson: PluginPackageJson
}

export interface CheckedPlugin {
  readonly package: PluginPackageContext
  readonly config: ParsedPluginConfig
}

export interface CheckPluginOptions {
  readonly cwd?: string
}

export type PluginTemplate = 'basic' | 'custom-ui' | 'executor'

export interface InitPluginOptions {
  readonly targetDirectory: string
  readonly cwd?: string
  readonly template?: PluginTemplate
  readonly pluginId?: string
  readonly packageName?: string
  readonly publisher?: string
  readonly localDependencies?: boolean
  readonly install?: boolean
}

export interface InitPluginResult {
  readonly targetDirectory: string
  readonly template: PluginTemplate
  readonly pluginId: string
  readonly packageName: string
  readonly publisher: string
  readonly localDependencies: boolean
  readonly installed: boolean
}

export interface BuildPluginOptions extends CheckPluginOptions {
  readonly outDir?: string
  readonly publisher?: string
}

export interface IntegrityFileEntry {
  readonly path: string
  readonly size: number
  readonly sha256: string
}

export interface IntegrityFile {
  readonly algorithm: 'sha256'
  readonly digest: string
  readonly files: readonly IntegrityFileEntry[]
}

export interface BuildPluginResult {
  readonly package: PluginPackageContext
  readonly manifest: PluginManifest
  readonly outDir: string
  readonly integrity: IntegrityFile
}

export interface PackPluginResult extends BuildPluginResult {
  readonly archivePath: string
  readonly archiveDigest: string
}

export interface DevPluginOptions extends BuildPluginOptions {
  readonly host?: string
  readonly port?: number
}
