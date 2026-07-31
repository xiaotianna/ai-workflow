import type { NodeConfigRendererType } from '@ai-workflow/core'
import type { ComponentType } from 'react'

import type { NodeConfigFieldErrors } from './node-config-fields'
import type { AvailableVariableOption } from './node-variable-section'
import { builtinNodeConfigRenderers } from '../config/node-config-renderer-registry'

export interface NodeConfigRendererProps {
  config: Readonly<Record<string, unknown>>
  availableVariables?: readonly AvailableVariableOption[]
  errors?: NodeConfigFieldErrors
  disabled?: boolean
  onConfigChange: (config: Record<string, unknown>) => void
}

export type NodeConfigRenderer = ComponentType<NodeConfigRendererProps>
export type NodeConfigRendererMap = Readonly<Record<string, NodeConfigRenderer>>

export interface NodeConfigSectionProps extends NodeConfigRendererProps {
  renderer: NodeConfigRendererType
  renderers?: NodeConfigRendererMap
}

export function NodeConfigSection({ renderer, renderers, ...props }: NodeConfigSectionProps) {
  const Renderer = renderers?.[renderer] ?? builtinNodeConfigRenderers[renderer]

  if (!Renderer) {
    return <p className="text-destructive text-xs leading-4">未注册节点配置 renderer：{renderer}</p>
  }

  return <Renderer {...props} />
}

export { builtinNodeConfigRenderers } from '../config/node-config-renderer-registry'
export { ConditionConfigEditor } from '../config/condition-config-editor'
