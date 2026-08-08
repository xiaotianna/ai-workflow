import type { PluginManifest } from '@ai-workflow/plugin'
import type { PluginWebModule } from '@ai-workflow/plugin/ui'

import { getAuthToken } from '@/features/auth'
import {
  assertPluginSharedModuleScope,
  resolvePluginSharedModuleKey,
} from './install-plugin-shared-scope'

const REMOTE_ENTRY_PATH = 'web/remoteEntry.js'

export function pluginManifestNeedsWebRemote(manifest: PluginManifest): boolean {
  return manifest.nodes.some(
    (node) => node.ui.node.custom || node.ui.node.remoteExport !== undefined || node.ui.form.custom,
  )
}

export function getPluginRemoteEntryAssetPath(): string {
  return REMOTE_ENTRY_PATH
}

function convertImportBindingsToDestructuring(bindings: string): string {
  return bindings
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^type\s+/u.test(part))
    .map((part) => {
      const renamedBinding = part.match(/^([\w$]+)\s+as\s+([\w$]+)$/u)
      if (renamedBinding) {
        return `${renamedBinding[1]}: ${renamedBinding[2]}`
      }

      return part.replace(/^type\s+/u, '')
    })
    .join(', ')
}

function rewriteRemoteEntrySource(source: string): string {
  assertPluginSharedModuleScope()

  let rewritten = source.replace(
    /import\s+\*\s+as\s+([\w$]+)\s+from\s*["']([^"']+)["'];?\s*/gu,
    (match, localName: string, specifier: string) => {
      const sharedKey = resolvePluginSharedModuleKey(specifier)
      if (!sharedKey) return match
      return `const ${localName} = __shared__[${JSON.stringify(sharedKey)}];\n`
    },
  )

  rewritten = rewritten.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?\s*/gu,
    (match, bindings: string, specifier: string) => {
      const sharedKey = resolvePluginSharedModuleKey(specifier)
      if (!sharedKey) return match

      const destructuring = convertImportBindingsToDestructuring(bindings)
      if (!destructuring) return ''

      return `const {${destructuring}} = __shared__[${JSON.stringify(sharedKey)}];\n`
    },
  )

  rewritten = rewritten.replace(
    /import\s+(?!type\s)([\w$]+)\s+from\s*["']([^"']+)["'];?\s*/gu,
    (match, localName: string, specifier: string) => {
      const sharedKey = resolvePluginSharedModuleKey(specifier)
      if (!sharedKey) return match

      const sharedRef = `__shared__[${JSON.stringify(sharedKey)}]`
      return `const ${localName} = ${sharedRef}?.default ?? ${sharedRef};\n`
    },
  )

  return `const __shared__ = globalThis.__AI_WORKFLOW_PLUGIN_SHARED__;
if (!__shared__) throw new Error('插件共享模块作用域未初始化');
${rewritten}`
}

function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url

  const baseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
  if (!baseUrl) return url
  return `${baseUrl}/${url.replace(/^\/+/, '')}`
}

async function fetchPluginAssetText(assetUrl: string, signal?: AbortSignal): Promise<string> {
  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(resolveApiUrl(assetUrl), { headers, signal })
  if (!response.ok) {
    throw new Error(`插件 Web Remote 加载失败（${response.status}）`)
  }

  return response.text()
}

function isPluginWebModule(value: unknown): value is PluginWebModule {
  if (!value || typeof value !== 'object') return false
  return 'nodes' in value && typeof (value as PluginWebModule).nodes === 'object'
}

export async function loadPluginWebRemote(
  assetUrl: string,
  signal?: AbortSignal,
): Promise<PluginWebModule> {
  const source = await fetchPluginAssetText(assetUrl, signal)
  const rewrittenSource = rewriteRemoteEntrySource(source)
  const blobUrl = URL.createObjectURL(new Blob([rewrittenSource], { type: 'text/javascript' }))

  try {
    const loadedModule: Record<string, unknown> = await import(/* @vite-ignore */ blobUrl)
    const webModule = isPluginWebModule(loadedModule.default)
      ? loadedModule.default
      : isPluginWebModule(loadedModule.pluginWebModule)
        ? loadedModule.pluginWebModule
        : undefined

    if (!webModule) {
      throw new Error('插件 Web Remote 未导出 pluginWebModule')
    }

    return webModule
  } catch (error) {
    const reason = error instanceof Error ? error.message : '未知错误'
    throw new Error(`插件 Web Remote 执行失败：${reason}`, { cause: error })
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
