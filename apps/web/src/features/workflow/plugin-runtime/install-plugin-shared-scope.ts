import * as React from 'react'
import * as ReactJSXDevRuntime from 'react/jsx-dev-runtime'
import * as ReactJSXRuntime from 'react/jsx-runtime'
import * as ReactDOM from 'react-dom'
import * as ReactDOMClient from 'react-dom/client'
import * as PluginRoot from '@ai-workflow/plugin'
import * as PluginUI from '@ai-workflow/plugin/ui'

const PLUGIN_SHARED_MODULE_KEYS = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  '@ai-workflow/plugin',
  '@ai-workflow/plugin/ui',
] as const

export type PluginSharedModuleKey = (typeof PLUGIN_SHARED_MODULE_KEYS)[number]

declare global {
  interface Window {
    __AI_WORKFLOW_PLUGIN_SHARED__?: Readonly<Record<PluginSharedModuleKey, unknown>>
  }
}

export function installPluginSharedModuleScope(): void {
  if (window.__AI_WORKFLOW_PLUGIN_SHARED__) return

  window.__AI_WORKFLOW_PLUGIN_SHARED__ = Object.freeze({
    react: React,
    'react/jsx-runtime': ReactJSXRuntime,
    'react/jsx-dev-runtime': ReactJSXDevRuntime,
    'react-dom': ReactDOM,
    'react-dom/client': ReactDOMClient,
    '@ai-workflow/plugin': PluginRoot,
    '@ai-workflow/plugin/ui': PluginUI,
  })
}

export function assertPluginSharedModuleScope(): Record<PluginSharedModuleKey, unknown> {
  const shared = window.__AI_WORKFLOW_PLUGIN_SHARED__
  if (!shared) {
    throw new Error('插件共享模块作用域未初始化')
  }
  return shared
}

export function resolvePluginSharedModuleKey(specifier: string): PluginSharedModuleKey | undefined {
  if (PLUGIN_SHARED_MODULE_KEYS.includes(specifier as PluginSharedModuleKey)) {
    return specifier as PluginSharedModuleKey
  }

  if (specifier.startsWith('@ai-workflow/plugin/')) {
    return '@ai-workflow/plugin/ui'
  }

  if (specifier.startsWith('react-dom/')) {
    return 'react-dom'
  }

  if (specifier.startsWith('react/')) {
    return 'react/jsx-runtime'
  }

  return undefined
}
