import { spawn } from 'node:child_process'
import { lstat, mkdir, mkdtemp, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

import { pluginIdSchema } from '@ai-workflow/plugin'

import { inferPublisher, parsePackageName } from '../package/package-context'
import { formatSchemaIssues, PluginCliError } from '../shared/diagnostics'
import type { InitPluginOptions, InitPluginResult, PluginTemplate } from '../shared/types'
import { isPluginTemplate, pluginTemplateFactories } from '../templates'
import type { PluginTemplateContext, PluginTemplateFile } from '../templates'
import {
  REGISTRY_TEMPLATE_DEPENDENCIES,
  resolveLocalTemplateDependencies,
} from '../templates/dependencies'

interface TargetDirectoryState {
  readonly exists: boolean
  readonly path: string
}

function parsePluginId(value: string, label: '插件 ID' | 'publisher'): string {
  const result = pluginIdSchema.safeParse(value)
  if (!result.success) {
    throw new PluginCliError(`${label} 格式不合法`, {
      code: label === '插件 ID' ? 'INVALID_PLUGIN_ID' : 'INVALID_PUBLISHER',
      details: formatSchemaIssues(result.error),
    })
  }
  return result.data
}

function resolveTemplate(value: PluginTemplate = 'basic'): PluginTemplate {
  if (!isPluginTemplate(value)) {
    throw new PluginCliError(`不支持的插件模板：${String(value)}`, {
      code: 'INVALID_PLUGIN_TEMPLATE',
      details: ['支持的模板：basic、custom-ui、executor'],
    })
  }
  return value
}

async function inspectTargetDirectory(targetDirectory: string): Promise<TargetDirectoryState> {
  try {
    const targetStats = await lstat(targetDirectory)
    if (targetStats.isSymbolicLink() || !targetStats.isDirectory()) {
      throw new PluginCliError('插件目标路径必须是普通目录', {
        code: 'INVALID_INIT_TARGET',
        details: [targetDirectory],
      })
    }

    const entries = await readdir(targetDirectory)
    if (entries.length > 0) {
      throw new PluginCliError('拒绝覆盖非空目录', {
        code: 'INIT_TARGET_NOT_EMPTY',
        details: [targetDirectory],
      })
    }
    return { exists: true, path: targetDirectory }
  } catch (error) {
    if (error instanceof PluginCliError) throw error
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { exists: false, path: targetDirectory }
    }
    throw new PluginCliError('无法检查插件目标目录', {
      code: 'INIT_TARGET_CHECK_FAILED',
      details: [targetDirectory],
      cause: error,
    })
  }
}

function assertSafeTemplateFile(file: PluginTemplateFile): void {
  const normalizedPath = file.path.replaceAll('\\', '/')
  const segments = normalizedPath.split('/')
  if (
    normalizedPath.length === 0 ||
    isAbsolute(file.path) ||
    segments.includes('') ||
    segments.includes('..')
  ) {
    throw new PluginCliError('模板包含不安全的文件路径', {
      code: 'INVALID_TEMPLATE_FILE_PATH',
      details: [file.path],
    })
  }
}

async function writeTemplateFiles(
  stagingDirectory: string,
  files: readonly PluginTemplateFile[],
): Promise<void> {
  const writtenPaths = new Set<string>()
  for (const file of files) {
    assertSafeTemplateFile(file)
    if (writtenPaths.has(file.path)) {
      throw new PluginCliError('模板包含重复文件路径', {
        code: 'DUPLICATE_TEMPLATE_FILE',
        details: [file.path],
      })
    }
    writtenPaths.add(file.path)

    const outputPath = join(stagingDirectory, file.path)
    const relativePath = relative(stagingDirectory, outputPath)
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new PluginCliError('模板文件越过临时目录', {
        code: 'INVALID_TEMPLATE_FILE_PATH',
        details: [file.path],
      })
    }
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, file.content)
  }
}

async function publishTemplateDirectory(
  stagingDirectory: string,
  targetState: TargetDirectoryState,
): Promise<void> {
  if (targetState.exists) await rmdir(targetState.path)

  try {
    await rename(stagingDirectory, targetState.path)
  } catch (error) {
    if (targetState.exists) await mkdir(targetState.path)
    throw error
  }
}

async function installDependencies(targetDirectory: string): Promise<void> {
  await new Promise<void>((resolveInstall, rejectInstall) => {
    const child = spawn('pnpm', ['install'], {
      cwd: targetDirectory,
      shell: false,
      stdio: 'inherit',
    })

    child.once('error', (error) => {
      rejectInstall(
        new PluginCliError('无法启动 pnpm install', {
          code: 'PLUGIN_INSTALL_START_FAILED',
          details: [targetDirectory, '项目文件已经生成，可以稍后手动执行 pnpm install'],
          cause: error,
        }),
      )
    })
    child.once('close', (exitCode) => {
      if (exitCode === 0) resolveInstall()
      else {
        rejectInstall(
          new PluginCliError('pnpm install 执行失败', {
            code: 'PLUGIN_INSTALL_FAILED',
            details: [
              `退出码：${exitCode ?? '未知'}`,
              targetDirectory,
              '项目文件已经生成，可以稍后手动执行 pnpm install',
            ],
          }),
        )
      }
    })
  })
}

export async function initPlugin(options: InitPluginOptions): Promise<InitPluginResult> {
  if (options.targetDirectory.trim().length === 0) {
    throw new PluginCliError('init 命令需要目标目录', {
      code: 'MISSING_INIT_TARGET',
    })
  }

  const targetDirectory = resolve(options.cwd ?? process.cwd(), options.targetDirectory)
  const targetState = await inspectTargetDirectory(targetDirectory)
  const pluginId = parsePluginId(options.pluginId ?? basename(targetDirectory), '插件 ID')
  const packageName = parsePackageName(options.packageName ?? basename(targetDirectory))
  const scopedPublisher = inferPublisher(packageName)
  const requestedPublisher = options.publisher
    ? parsePluginId(options.publisher, 'publisher')
    : undefined

  if (scopedPublisher && requestedPublisher && scopedPublisher !== requestedPublisher) {
    throw new PluginCliError('publisher 与 scoped package 不一致', {
      code: 'PUBLISHER_SCOPE_MISMATCH',
      details: [`package scope：${scopedPublisher}`, `publisher：${requestedPublisher}`],
    })
  }

  const publisher = requestedPublisher ?? scopedPublisher ?? 'local'
  parsePluginId(publisher, 'publisher')
  const template = resolveTemplate(options.template)
  const dependencies = options.localDependencies
    ? await resolveLocalTemplateDependencies(options.cwd ?? process.cwd(), targetDirectory)
    : REGISTRY_TEMPLATE_DEPENDENCIES
  const context: PluginTemplateContext = {
    pluginId,
    packageName,
    publisher,
    publisherFromPackageScope: scopedPublisher !== undefined,
    sdkDependency: dependencies.sdk,
    cliDependency: dependencies.cli,
    localDependencies: dependencies.local,
  }
  const files = pluginTemplateFactories[template](context)

  await mkdir(dirname(targetDirectory), { recursive: true })
  const stagingDirectory = await mkdtemp(
    join(dirname(targetDirectory), `.${basename(targetDirectory)}-init-`),
  )
  let published = false

  try {
    await writeTemplateFiles(stagingDirectory, files)
    await publishTemplateDirectory(stagingDirectory, targetState)
    published = true
  } catch (error) {
    if (!published) await rm(stagingDirectory, { recursive: true, force: true })
    if (error instanceof PluginCliError) throw error
    throw new PluginCliError('无法生成插件项目', {
      code: 'PLUGIN_INIT_FAILED',
      details: [targetDirectory],
      cause: error,
    })
  }

  if (options.install) await installDependencies(targetDirectory)

  return {
    targetDirectory,
    template,
    pluginId,
    packageName,
    publisher,
    localDependencies: dependencies.local,
    installed: options.install ?? false,
  }
}
