import { lstat, mkdir, readFile, realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

import { valid } from 'semver'

import { PluginCliError } from '../shared/diagnostics'
import type { PluginPackageContext, PluginPackageJson } from '../shared/types'

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const ROOT_EXPORT_CONDITIONS = ['source', 'import', 'default'] as const

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePackageJson(content: string, packageJsonPath: string): PluginPackageJson {
  try {
    const parsed: unknown = JSON.parse(content)
    if (!isRecord(parsed)) throw new Error('package.json 顶层必须是对象')
    return parsed
  } catch (error) {
    throw new PluginCliError(`无法解析 ${packageJsonPath}`, {
      code: 'INVALID_PACKAGE_JSON',
      cause: error,
    })
  }
}

export function parsePackageName(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 214 ||
    !PACKAGE_NAME_PATTERN.test(value)
  ) {
    throw new PluginCliError('插件 package 名称不合法', {
      code: 'INVALID_PACKAGE_NAME',
      details: ['package.json#name 必须是合法的小写 npm package 名称'],
    })
  }
  return value
}

function parsePackageVersion(value: unknown): string {
  if (typeof value !== 'string' || valid(value) === null) {
    throw new PluginCliError('插件 package 版本不合法', {
      code: 'INVALID_PACKAGE_VERSION',
      details: ['package.json#version 必须是完整 SemVer，例如 1.0.0'],
    })
  }
  return value
}

function resolveRootExport(exportsValue: unknown): string {
  if (typeof exportsValue === 'string') return exportsValue

  if (!isRecord(exportsValue)) {
    throw new PluginCliError('缺少可解析的 package.json#exports["."]', {
      code: 'INVALID_ROOT_EXPORT',
      details: ['根导出只支持字符串或 source/import/default 条件对象'],
    })
  }

  const rootExport = exportsValue['.']
  if (typeof rootExport === 'string') return rootExport

  if (!isRecord(rootExport)) {
    throw new PluginCliError('package.json#exports["."] 格式不受支持', {
      code: 'INVALID_ROOT_EXPORT',
      details: ['不支持数组、通配根导出或缺少根导出的配置'],
    })
  }

  for (const condition of ROOT_EXPORT_CONDITIONS) {
    const candidate = rootExport[condition]
    if (typeof candidate === 'string') return candidate
    if (candidate !== undefined) {
      throw new PluginCliError(`根导出条件 ${condition} 必须直接指向文件`, {
        code: 'INVALID_ROOT_EXPORT',
      })
    }
  }

  throw new PluginCliError('package.json#exports["."] 缺少可用入口', {
    code: 'INVALID_ROOT_EXPORT',
    details: ['条件对象至少需要 source、import 或 default 中的一项'],
  })
}

function isPathInside(rootDir: string, targetPath: string): boolean {
  const relativePath = relative(rootDir, targetPath)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

export async function findPluginPackage(
  startDirectory = process.cwd(),
): Promise<PluginPackageContext> {
  let currentDirectory = await realpath(resolve(startDirectory))

  while (true) {
    const packageJsonPath = resolve(currentDirectory, 'package.json')
    let packageJsonContent: string | undefined
    try {
      packageJsonContent = await readFile(packageJsonPath, 'utf8')
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw new PluginCliError(`无法读取 ${packageJsonPath}`, {
          code: 'PACKAGE_JSON_READ_FAILED',
          cause: error,
        })
      }
    }

    if (packageJsonContent !== undefined) {
      const packageJson = parsePackageJson(packageJsonContent, packageJsonPath)
      const name = parsePackageName(packageJson.name)
      const version = parsePackageVersion(packageJson.version)
      const rootExport = resolveRootExport(packageJson.exports)
      const entryPath = await resolveExistingPackageFile(currentDirectory, rootExport, '插件根入口')

      return {
        rootDir: currentDirectory,
        packageJsonPath,
        name,
        version,
        entryPath,
        packageJson,
      }
    }

    const parentDirectory = dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
      throw new PluginCliError('未找到插件 package.json', {
        code: 'PACKAGE_NOT_FOUND',
        details: [`起始目录：${startDirectory}`],
      })
    }
    currentDirectory = parentDirectory
  }
}

export async function resolveExistingPackageFile(
  rootDir: string,
  filePath: string,
  label: string,
): Promise<string> {
  if (isAbsolute(filePath)) {
    throw new PluginCliError(`${label}不能使用绝对路径`, { code: 'UNSAFE_PACKAGE_PATH' })
  }

  const resolvedPath = resolve(rootDir, filePath.replaceAll('\\', '/'))
  if (!isPathInside(rootDir, resolvedPath)) {
    throw new PluginCliError(`${label}不能越过插件 package 根目录`, {
      code: 'UNSAFE_PACKAGE_PATH',
      details: [filePath],
    })
  }

  let realFilePath: string
  try {
    realFilePath = await realpath(resolvedPath)
  } catch (error) {
    throw new PluginCliError(`${label}不存在`, {
      code: 'PACKAGE_FILE_NOT_FOUND',
      details: [filePath],
      cause: error,
    })
  }

  const realRootDir = await realpath(rootDir)
  if (!isPathInside(realRootDir, realFilePath)) {
    throw new PluginCliError(`${label}通过符号链接越过了插件 package 根目录`, {
      code: 'UNSAFE_PACKAGE_PATH',
      details: [filePath],
    })
  }

  const fileStats = await stat(realFilePath)
  if (!fileStats.isFile()) {
    throw new PluginCliError(`${label}必须指向文件`, {
      code: 'INVALID_PACKAGE_FILE',
      details: [filePath],
    })
  }

  return realFilePath
}

export function inferPublisher(packageName: string): string | undefined {
  if (!packageName.startsWith('@')) return undefined
  return packageName.slice(1).split('/')[0]
}

export function resolvePackageOutputDirectory(rootDir: string, outDir = 'dist'): string {
  if (isAbsolute(outDir)) {
    throw new PluginCliError('输出目录必须是插件 package 内的相对路径', {
      code: 'UNSAFE_OUTPUT_PATH',
      details: [outDir],
    })
  }

  const resolvedPath = resolve(rootDir, outDir)
  if (!isPathInside(rootDir, resolvedPath) || resolvedPath === rootDir) {
    throw new PluginCliError('输出目录不能越过或覆盖插件 package 根目录', {
      code: 'UNSAFE_OUTPUT_PATH',
      details: [outDir],
    })
  }
  return resolvedPath
}

export async function ensureSafePackageDirectory(
  rootDir: string,
  directory: string,
): Promise<void> {
  const relativePath = relative(rootDir, directory)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new PluginCliError('目录不能越过插件 package 根目录', {
      code: 'UNSAFE_OUTPUT_PATH',
      details: [directory],
    })
  }

  let currentDirectory = rootDir
  for (const segment of relativePath.split(/[/\\]/).filter(Boolean)) {
    currentDirectory = resolve(currentDirectory, segment)
    try {
      const entryStats = await lstat(currentDirectory)
      if (!entryStats.isDirectory() && !entryStats.isSymbolicLink()) {
        throw new PluginCliError('输出目录的父路径必须是目录', {
          code: 'INVALID_OUTPUT_PARENT',
          details: [currentDirectory],
        })
      }
    } catch (error) {
      if (error instanceof PluginCliError) throw error
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      await mkdir(currentDirectory)
    }

    const realCurrentDirectory = await realpath(currentDirectory)
    const realRootDir = await realpath(rootDir)
    if (!isPathInside(realRootDir, realCurrentDirectory)) {
      throw new PluginCliError('输出目录通过符号链接越过了插件 package 根目录', {
        code: 'UNSAFE_OUTPUT_PATH',
        details: [currentDirectory],
      })
    }
  }
}
