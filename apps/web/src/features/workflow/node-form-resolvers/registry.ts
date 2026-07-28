import type { NodeType } from '@ai-workflow/core'
import type { NodeConfigFieldMap } from '@ai-workflow/form/components/node-config-fields'

export type NodeFormFieldsResolver = (fields: NodeConfigFieldMap) => NodeConfigFieldMap

export type NodeFormFieldsResolverRegistry = Readonly<
  Record<string, NodeFormFieldsResolver | undefined>
>

export function resolveNodeFormFields(
  nodeType: NodeType,
  registry: NodeFormFieldsResolverRegistry,
): NodeConfigFieldMap | undefined {
  const fields = nodeType.form

  if (!fields) return undefined

  return registry[nodeType.definition.type]?.(fields) ?? fields
}
