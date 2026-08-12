import { watch } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'

import { buildPlugin } from './build'
import { resolvePackageOutputDirectory } from '../package/package-context'
import { formatPluginCliError } from '../shared/diagnostics'
import type { DevPluginOptions } from '../shared/types'

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}

interface DevBuildState {
  status: 'ready' | 'building' | 'failed'
  builtAt?: string
  error?: string
}

function isPathInside(rootDirectory: string, targetPath: string): boolean {
  const relativePath = relative(rootDirectory, targetPath)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function shouldIgnoreChange(
  rootDirectory: string,
  outDir: string,
  fileName: string | null,
): boolean {
  if (!fileName) return false
  const normalizedName = fileName.split(sep).join('/')
  if (
    normalizedName === 'node_modules' ||
    normalizedName.startsWith('node_modules/') ||
    normalizedName === '.git' ||
    normalizedName.startsWith('.git/')
  ) {
    return true
  }

  const outputRelativePath = relative(rootDirectory, outDir).split(sep).join('/')
  if (
    normalizedName === outputRelativePath ||
    normalizedName.startsWith(`${outputRelativePath}/`)
  ) {
    return true
  }

  const outputDirectoryName = outputRelativePath.slice(outputRelativePath.lastIndexOf('/') + 1)
  return normalizedName.split('/').some((segment) => segment.startsWith(`.${outputDirectoryName}-`))
}

export async function devPlugin(options: DevPluginOptions = {}): Promise<void> {
  const initialBuild = await buildPlugin(options),
    rootDirectory = initialBuild.package.rootDir,
    outDir = resolvePackageOutputDirectory(rootDirectory, options.outDir),
    host = options.host ?? '127.0.0.1',
    port = options.port ?? 4174
  let state: DevBuildState = { status: 'ready', builtAt: new Date().toISOString() },
    activeBuild = false,
    queuedBuild = false,
    debounceTimer: NodeJS.Timeout | undefined

  const rebuild = async (): Promise<void> => {
      if (activeBuild) {
        queuedBuild = true
        return
      }

      activeBuild = true
      state = { ...state, status: 'building', error: undefined }
      try {
        await buildPlugin(options)
        state = { status: 'ready', builtAt: new Date().toISOString() }
        process.stdout.write('插件开发产物已更新\n')
      } catch (error) {
        const message = formatPluginCliError(error)
        state = { ...state, status: 'failed', error: message }
        process.stderr.write(`${message}\n`)
      } finally {
        activeBuild = false
        if (queuedBuild) {
          queuedBuild = false
          await rebuild()
        }
      }
    },
    server = createServer(async (request, response) => {
      try {
        const url = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`)
        if (url.pathname === '/__ai_workflow_plugin/status') {
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          response.end(`${JSON.stringify(state, null, 2)}\n`)
          return
        }

        const requestPath =
            url.pathname === '/'
              ? 'plugin.manifest.json'
              : decodeURIComponent(url.pathname.slice(1)),
          filePath = resolve(outDir, requestPath)
        if (!isPathInside(outDir, filePath)) {
          response.writeHead(404)
          response.end('Not Found')
          return
        }
        const fileStats = await stat(filePath)
        if (!fileStats.isFile()) {
          response.writeHead(404)
          response.end('Not Found')
          return
        }

        response.writeHead(200, {
          'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        })
        response.end(await readFile(filePath))
      } catch {
        response.writeHead(404)
        response.end('Not Found')
      }
    })

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(port, host, () => resolveListen())
  })

  const address = server.address(),
    actualPort = typeof address === 'object' && address ? address.port : port
  process.stdout.write(`插件开发服务：http://${host}:${actualPort}\n`)

  const watcher = watch(rootDirectory, { recursive: true }, (_eventType, fileName) => {
    if (shouldIgnoreChange(rootDirectory, outDir, fileName)) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void rebuild(), 120)
  })

  await new Promise<void>((resolveDev, rejectDev) => {
    const close = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      watcher.close()
      server.close((error) => {
        process.off('SIGINT', close)
        process.off('SIGTERM', close)
        if (error) rejectDev(error)
        else resolveDev()
      })
    }

    watcher.once('error', rejectDev)
    process.once('SIGINT', close)
    process.once('SIGTERM', close)
  })
}
