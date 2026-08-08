import type { PluginTemplate, InitPluginResult } from '../shared/types'
import type { PluginTemplateContext, PluginTemplateFile } from './types'

const TYPESCRIPT_VERSION = '~6.0.2'
const REACT_VERSION = '^19.2.4'
const REACT_TYPES_VERSION = '^19.2.14'

interface CommonTemplateOptions {
  readonly template: PluginTemplate
  readonly description: string
  readonly react?: boolean
}

function createPackageJson(context: PluginTemplateContext, options: CommonTemplateOptions): string {
  const publisherArgument = context.publisherFromPackageScope
    ? ''
    : ` --publisher ${context.publisher}`
  const devDependencies: Record<string, string> = {
    '@ai-workflow/plugin': context.sdkDependency,
    '@ai-workflow/plugin-cli': context.cliDependency,
    typescript: TYPESCRIPT_VERSION,
  }

  if (options.react) {
    devDependencies['@types/react'] = REACT_TYPES_VERSION
    devDependencies.react = REACT_VERSION
  }

  const packageJson = {
    name: context.packageName,
    version: '0.1.0',
    private: true,
    type: 'module',
    packageManager: 'pnpm@10.33.2',
    exports: {
      '.': './src/index.ts',
    },
    scripts: {
      'plugin:check': 'ai-workflow-plugin check',
      'plugin:build': `ai-workflow-plugin build${publisherArgument}`,
      'plugin:pack': `ai-workflow-plugin pack${publisherArgument}`,
      'plugin:dev': `ai-workflow-plugin dev${publisherArgument}`,
      typecheck: 'tsc --noEmit',
    },
    devDependencies,
  }

  return `${JSON.stringify(packageJson, null, 2)}\n`
}

function createTsConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        jsx: 'react-jsx',
      },
      include: ['src'],
    },
    null,
    2,
  )}\n`
}

function createReadme(context: PluginTemplateContext, options: CommonTemplateOptions): string {
  const executorNotice =
    options.template === 'executor'
      ? '\n> 当前 Executor 只能由 CLI 构建，平台强沙箱落地前不能直接运行。\n'
      : ''
  const dependencyNotice = context.localDependencies
    ? '\n> 当前项目通过 `link:` 使用 AI Workflow 仓库中的本地 SDK 与 CLI，移动项目或仓库后需要重新生成链接路径。\n'
    : ''

  return `# ${context.packageName}

这是由 \`@ai-workflow/plugin-cli\` 生成的 \`${options.template}\` 插件模板。

${options.description}
${executorNotice}
${dependencyNotice}
## 开始使用

\`\`\`bash
pnpm install
pnpm plugin:check
pnpm plugin:build
pnpm plugin:dev
\`\`\`

## 项目信息

- 插件 ID：\`${context.pluginId}\`
- Publisher：\`${context.publisher}\`
- 模板：\`${options.template}\`

生成项目默认设置为 \`private: true\`。准备正式发布前，请确认 package 名、版本、Publisher 和平台发布流程。
`
}

function createIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Plugin icon">
  <rect width="64" height="64" rx="16" fill="#4f46e5" />
  <path d="M20 21h24v8H20zm0 14h16v8H20z" fill="#fff" />
</svg>
`
}

export function createCommonTemplateFiles(
  context: PluginTemplateContext,
  options: CommonTemplateOptions,
): readonly PluginTemplateFile[] {
  return [
    { path: 'package.json', content: createPackageJson(context, options) },
    { path: 'tsconfig.json', content: createTsConfig() },
    { path: 'README.md', content: createReadme(context, options) },
    { path: 'assets/icon.svg', content: createIcon() },
  ]
}

export function createPluginIndex(
  context: PluginTemplateContext,
  options: { readonly permissions?: readonly string[] },
): string {
  const displayName = context.pluginId
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
  const permissions = options.permissions
    ? `\n  permissions: ${JSON.stringify(options.permissions)},`
    : ''

  return `import { defineConfig } from '@ai-workflow/plugin'

import { exampleNode } from './nodes/example'

export default defineConfig({
  id: ${JSON.stringify(context.pluginId)},
  displayName: ${JSON.stringify(displayName)},
  description: '由 AI Workflow 插件脚手架生成的示例插件',
  hostVersionRange: '^1.0.0',${permissions}
  nodes: [exampleNode],
})
`
}

export function formatInitNextSteps(result: InitPluginResult): string {
  const installStep = result.installed ? '' : 'pnpm install\n'
  return `cd ${JSON.stringify(result.targetDirectory)}\n${installStep}pnpm plugin:check`
}
