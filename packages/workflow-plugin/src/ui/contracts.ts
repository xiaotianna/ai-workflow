import type { AvailableVariableOption } from '@ai-workflow/form/components/node-variable-section'
import type {
  NodeContentComponent,
  NodeContentProps,
  NodeRendererComponent,
  NodeRendererProps,
} from '@ai-workflow/nodes-ui'
import type { ComponentType } from 'react'

export interface PluginConfigRendererProps<TConfig extends object = Record<string, unknown>> {
  readonly config: Readonly<TConfig>
  readonly availableVariables?: readonly AvailableVariableOption[]
  readonly errors?: Readonly<Record<string, string | undefined>>
  readonly disabled?: boolean
  readonly onConfigChange: (config: TConfig) => void
}

export type PluginConfigRendererComponent<TConfig extends object = Record<string, unknown>> =
  ComponentType<PluginConfigRendererProps<TConfig>>

export type PluginNodeContentProps<TConfig = unknown> = NodeContentProps<TConfig>
export type PluginNodeContentComponent<TConfig = unknown> = NodeContentComponent<TConfig>
export type PluginNodeRendererProps<TConfig = unknown> = NodeRendererProps<TConfig>
export type PluginNodeRendererComponent<TConfig = unknown> = NodeRendererComponent<TConfig>

export interface PluginWebNodeModule<TConfig extends object = Record<string, unknown>> {
  readonly content?: PluginNodeContentComponent<TConfig>
  readonly renderer?: PluginNodeRendererComponent<TConfig>
  readonly configRenderer?: PluginConfigRendererComponent<TConfig>
}

export interface PluginWebModule {
  readonly nodes: Readonly<Record<string, PluginWebNodeModule>>
}
