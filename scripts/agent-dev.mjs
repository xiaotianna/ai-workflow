import { spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { existsSync, linkSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url))

export function getAgentDevEnvironment(component, environment = process.env) {
  if (!['server', 'runtime'].includes(component)) throw new Error('未知 Agent 开发服务')
  const mode = environment.NODE_ENV ?? 'development'
  let serverConfig = {}
  for (const name of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    const path = resolve(workspaceRoot, 'apps/server', name)
    if (existsSync(path))
      serverConfig = { ...serverConfig, ...parseEnv(readFileSync(path, 'utf8')) }
  }
  if ((environment.NODE_ENV ?? serverConfig.NODE_ENV) === 'production') return environment
  const settings = { ...serverConfig, ...environment },
    runtimeUrl = settings.AGENT_RUNTIME_URL || 'http://127.0.0.1:3100'
  let token = settings.AGENT_RUNTIME_INTERNAL_AUTH_TOKEN
  if (!token) {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(runtimeUrl).hostname))
      throw new Error('远程 Agent Runtime 需要配置内部认证令牌')
    const tokenPath = resolve(workspaceRoot, '.agent-runtime.auth.local')
    if (!existsSync(tokenPath)) {
      // 两个 Turbo 任务同时启动时，通过硬链接只发布一个完整令牌。
      const temporaryPath = resolve(workspaceRoot, `.agent-runtime.auth.${randomUUID()}.local`)
      writeFileSync(temporaryPath, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' })
      try {
        linkSync(temporaryPath, tokenPath)
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
      } finally {
        unlinkSync(temporaryPath)
      }
    }
    token = readFileSync(tokenPath, 'utf8').trim()
  }
  if (token.length < 32) throw new Error('Agent 内部认证令牌无效')
  return {
    ...environment,
    AGENT_RUNTIME_URL: runtimeUrl,
    AGENT_RUNTIME_INTERNAL_AUTH_TOKEN: token,
    ...(settings.AGENT_RUN_TIMEOUT_MS
      ? { AGENT_RUN_TIMEOUT_MS: settings.AGENT_RUN_TIMEOUT_MS }
      : {}),
    ...(component === 'runtime'
      ? {
          PORT: environment.PORT || new URL(runtimeUrl).port || '3100',
          AI_WORKFLOW_SERVER_URL:
            environment.AI_WORKFLOW_SERVER_URL || `http://127.0.0.1:${serverConfig.PORT || '3000'}`,
        }
      : {}),
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const [component, command, ...args] = process.argv.slice(2)
  if (!command) throw new Error('缺少开发服务启动命令')
  const child = spawn(command, args, {
    env: getAgentDevEnvironment(component),
    stdio: 'inherit',
  })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
  child.on('error', () => {
    console.error(`无法启动 ${component} 开发服务`)
    process.exit(1)
  })
  child.on('exit', (code, signal) => process.exit(code ?? (signal === 'SIGINT' ? 130 : 1)))
}
