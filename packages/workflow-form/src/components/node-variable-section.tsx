import type {
  NodeInputBindingsInput,
  NodeOutputDefinition,
  NodeOutputDefinitionInput,
  NodeVariableFormSection,
} from '@ai-workflow/core'
import type { ComponentType } from 'react'

import type { AvailableVariableOption } from '../contracts/available-variable-option'
import { builtinNodeVariableRenderers } from '../variables/node-variable-renderer-registry'

export type NodeVariableFieldErrors = Readonly<Record<string, string | undefined>>
export type NodeInputBindingsFormValue = Exclude<NodeInputBindingsInput, undefined>

export interface NodeVariableSectionRendererProps {
  section: NodeVariableFormSection
  inputs: NodeInputBindingsFormValue
  outputs: readonly NodeOutputDefinitionInput[]
  fixedOutputs?: readonly NodeOutputDefinition[]
  availableVariables?: readonly AvailableVariableOption[]
  inputErrors?: NodeVariableFieldErrors
  outputErrors?: NodeVariableFieldErrors
  disabled?: boolean
  onInputsChange: (inputs: NodeInputBindingsFormValue) => void
  onOutputsChange: (outputs: NodeOutputDefinitionInput[]) => void
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
export { NodeVariablePicker, type NodeVariablePickerProps } from '../variables/node-variable-picker'
export type { AvailableVariableOption } from '../contracts/available-variable-option'
