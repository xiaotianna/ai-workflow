#!/usr/bin/env node

import { parseArgs } from 'node:util'

import { buildPlugin } from './commands/build'
import { checkPlugin } from './commands/check'
import { devPlugin } from './commands/dev'
import { initPlugin } from './commands/init'
import { packPlugin } from './commands/pack'
import { formatPluginCliError, PluginCliError } from './shared/diagnostics'
import type { InitPluginOptions, PluginTemplate } from './shared/types'
import { formatInitNextSteps } from './templates/shared'
import { isPluginTemplate } from './templates'

const HELP = `@ai-workflow/plugin-cli

用法：
  ai-workflow-plugin init <目录> [--template <模板>] [--plugin-id <ID>] [--package-name <名称>] [--publisher <ID>] [--local] [--install]
  ai-workflow-plugin check [--cwd <目录>]
  ai-workflow-plugin build [--cwd <目录>] [--out-dir <目录>] [--publisher <ID>]
  ai-workflow-plugin pack  [--cwd <目录>] [--out-dir <目录>] [--publisher <ID>]
  ai-workflow-plugin dev   [--cwd <目录>] [--out-dir <目录>] [--publisher <ID>] [--host <地址>] [--port <端口>]

选项：
  --template   init 模板：basic、custom-ui、executor，默认 basic
  --plugin-id  生成插件的 ID，默认使用目标目录名
  --package-name 生成 package 名称，默认使用目标目录名
  --local      使用当前 AI Workflow 仓库中的本地 SDK 和 CLI
  --install    init 完成后执行 pnpm install，默认不安装
  --cwd        插件 package 内的起始目录，默认当前目录
  --out-dir    package 内的输出目录，默认 dist
  --publisher  发布者 ID；scoped package 可从 scope 推导
  --host       dev 服务监听地址，默认 127.0.0.1
  --port       dev 服务端口，默认 4174
  -h, --help   显示帮助
`

interface CliOptions {
  readonly cwd?: string
  readonly outDir?: string
  readonly publisher?: string
  readonly host?: string
  readonly port?: number
}

function parseInitOptions(args: readonly string[]): InitPluginOptions & { readonly help: boolean } {
  const { values, positionals } = parseArgs({
    args: [...args],
    allowPositionals: true,
    strict: true,
    options: {
      template: { type: 'string' },
      'plugin-id': { type: 'string' },
      'package-name': { type: 'string' },
      publisher: { type: 'string' },
      local: { type: 'boolean' },
      install: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  const help = values.help ?? false
  if (!help && positionals.length !== 1) {
    throw new PluginCliError('init 命令需要且只能指定一个目标目录', {
      code: 'INVALID_INIT_TARGET_ARGUMENT',
      details: ['用法：ai-workflow-plugin init <目录> [选项]'],
    })
  }

  let template: PluginTemplate | undefined
  if (values.template !== undefined) {
    if (!isPluginTemplate(values.template)) {
      throw new PluginCliError(`不支持的插件模板：${values.template}`, {
        code: 'INVALID_PLUGIN_TEMPLATE',
        details: ['支持的模板：basic、custom-ui、executor'],
      })
    }
    template = values.template
  }

  return {
    targetDirectory: positionals[0] ?? '',
    ...(template === undefined ? {} : { template }),
    ...(values['plugin-id'] === undefined ? {} : { pluginId: values['plugin-id'] }),
    ...(values['package-name'] === undefined ? {} : { packageName: values['package-name'] }),
    ...(values.publisher === undefined ? {} : { publisher: values.publisher }),
    localDependencies: values.local ?? false,
    install: values.install ?? false,
    help,
  }
}

// 解析cli命令参数
function parseCliOptions(args: readonly string[]): CliOptions & { readonly help: boolean } {
  const { values } = parseArgs({
    args: [...args],
    allowPositionals: false,
    strict: true,
    options: {
      cwd: { type: 'string' },
      'out-dir': { type: 'string' },
      publisher: { type: 'string' },
      host: { type: 'string' },
      port: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  let port: number | undefined
  if (values.port !== undefined) {
    port = Number(values.port)
    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
      throw new PluginCliError('--port 必须是 0 到 65535 之间的整数', {
        code: 'INVALID_CLI_ARGUMENT',
      })
    }
  }

  return {
    ...(values.cwd === undefined ? {} : { cwd: values.cwd }),
    ...(values['out-dir'] === undefined ? {} : { outDir: values['out-dir'] }),
    ...(values.publisher === undefined ? {} : { publisher: values.publisher }),
    ...(values.host === undefined ? {} : { host: values.host }),
    ...(port === undefined ? {} : { port }),
    help: values.help ?? false,
  }
}

// 运行插件cli
export async function runPluginCli(args = process.argv.slice(2)): Promise<number> {
  const [command, ...commandArgs] = args
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(HELP)
    return 0
  }

  try {
    if (command === 'init') {
      const options = parseInitOptions(commandArgs)
      if (options.help) {
        process.stdout.write(HELP)
        return 0
      }

      const result = await initPlugin(options)
      process.stdout.write(
        `插件项目已创建：${result.targetDirectory}\n模板：${result.template}\nPublisher：${result.publisher}\n\n接下来：\n${formatInitNextSteps(result)}\n`,
      )
      return 0
    }

    const options = parseCliOptions(commandArgs)
    if (options.help) {
      process.stdout.write(HELP)
      return 0
    }

    if (command === 'check') {
      const result = await checkPlugin(options)
      process.stdout.write(
        `检查通过：${result.package.name}@${result.package.version}，${result.config.nodes.length} 个节点\n`,
      )
      return 0
    }

    if (command === 'build') {
      const result = await buildPlugin(options)
      process.stdout.write(`构建完成：${result.outDir}\n摘要：${result.integrity.digest}\n`)
      return 0
    }

    if (command === 'pack') {
      const result = await packPlugin(options)
      process.stdout.write(`打包完成：${result.archivePath}\n摘要：${result.archiveDigest}\n`)
      return 0
    }

    if (command === 'dev') {
      await devPlugin(options)
      return 0
    }

    throw new PluginCliError(`未知命令：${command}`, {
      code: 'UNKNOWN_COMMAND',
      details: ['支持的命令：init、check、build、pack、dev'],
    })
  } catch (error) {
    process.stderr.write(`${formatPluginCliError(error)}\n`)
    return 1
  }
}

void runPluginCli().then((exitCode) => {
  process.exitCode = exitCode
})
