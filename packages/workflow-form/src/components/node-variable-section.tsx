import type {
  DataType,
  NodeInputBindingsInput,
  NodeOutputDefinition,
  NodeVariableFormSection,
  VariableReference,
} from '@ai-workflow/core'
import type { ComponentType } from 'react'

import { builtinNodeVariableRenderers } from '../variables/node-variable-renderer-registry'

export interface AvailableVariableOption {
  id: string
  label: string
  sourceId: string
  sourceLabel: string
  variableName: string
  dataType: DataType
  reference: VariableReference
}

export type NodeVariableFieldErrors = Readonly<Record<string, string | undefined>>
export type NodeInputBindingsFormValue = Exclude<NodeInputBindingsInput, undefined>

export interface NodeVariableSectionRendererProps {
  section: NodeVariableFormSection
  inputs: NodeInputBindingsFormValue
  outputs: readonly NodeOutputDefinition[]
  availableVariables?: readonly AvailableVariableOption[]
  inputErrors?: NodeVariableFieldErrors
  outputErrors?: NodeVariableFieldErrors
  disabled?: boolean
  onInputsChange: (inputs: NodeInputBindingsFormValue) => void
  onOutputsChange: (outputs: NodeOutputDefinition[]) => void
}

export type NodeVariableSectionRenderer = ComponentType<NodeVariableSectionRendererProps>
export type NodeVariableRendererMap = Readonly<Record<string, NodeVariableSectionRenderer>>

export interface NodeVariableSectionProps extends NodeVariableSectionRendererProps {
  renderers?: NodeVariableRendererMap
}

export function NodeVariableSection({ section, renderers, ...props }: NodeVariableSectionProps) {
  const Renderer = renderers?.[section.renderer] ?? builtinNodeVariableRenderers[section.renderer]

  if (!Renderer) {
    return (
      <p className="text-destructive text-xs leading-4">
        未注册节点变量 renderer：{section.renderer}
      </p>
    )
  }

  return <Renderer section={section} {...props} />
}

export { NodeInputBindingsEditor } from '../variables/node-input-bindings-editor'
export { NodeOutputDefinitionsEditor } from '../variables/node-output-definitions-editor'
export { builtinNodeVariableRenderers } from '../variables/node-variable-renderer-registry'
export { StartInputVariablesEditor } from '../variables/start-input-variables-editor'
