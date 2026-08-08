import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { PluginCliError } from '../shared/diagnostics'
import type { PluginTemplateDependencies } from './types'

export const REGISTRY_TEMPLATE_DEPENDENCIES: PluginTemplateDependencies = {
  sdk: '^1.0.0',
  cli: '^1.0.0',
  local: false,
}

function createLinkSpecifier(targetDirectory: string, dependencyDirectory: string): string {
  const relativePath = relative(targetDirectory, dependencyDirectory)
  if (relativePath.length === 0 || isAbsolute(relativePath)) {
    throw new PluginCliError('无法为本地 package 生成相对链接', {
      code: 'LOCAL_DEPENDENCY_LINK_FAILED',
      details: [dependencyDirectory, targetDirectory],
    })
  }
  const normalizedPath = relativePath.split(sep).join('/')
  return `link:${normalizedPath.startsWith('.') ? normalizedPath : `./${normalizedPath}`}`
}

async function readPackageName(packageJsonPath: string): Promise<string | undefined> {
  try {
    const packageJson: unknown = JSON.parse(await readFile(packageJsonPath, 'utf8'))
    if (typeof packageJson !== 'object' || packageJson === null || Array.isArray(packageJson)) {
      return undefined
    }
    const name = Reflect.get(packageJson, 'name')
    return typeof name === 'string' ? name : undefined
  } catch {
    return undefined
  }
}

export async function resolveLocalTemplateDependencies(
  startDirectory: string,
  targetDirectory: string,
): Promise<PluginTemplateDependencies> {
  let currentDirectory = resolve(startDirectory)

  while (true) {
    const sdkDirectory = join(currentDirectory, 'packages/workflow-plugin')
    const cliDirectory = join(currentDirectory, 'packages/workflow-plugin-cli')
    const [sdkName, cliName] = await Promise.all([
      readPackageName(join(sdkDirectory, 'package.json')),
      readPackageName(join(cliDirectory, 'package.json')),
    ])

    if (sdkName === '@ai-workflow/plugin' && cliName === '@ai-workflow/plugin-cli') {
      return {
        sdk: createLinkSpecifier(targetDirectory, sdkDirectory),
        cli: createLinkSpecifier(targetDirectory, cliDirectory),
        local: true,
      }
    }

    const parentDirectory = dirname(currentDirectory)
    if (parentDirectory === currentDirectory) break
    currentDirectory = parentDirectory
  }

  throw new PluginCliError('无法定位 AI Workflow 本地 workspace package', {
    code: 'LOCAL_WORKSPACE_NOT_FOUND',
    details: [startDirectory, '请在 AI Workflow 仓库内使用 --local，或移除该参数改用已发布依赖'],
  })
}
