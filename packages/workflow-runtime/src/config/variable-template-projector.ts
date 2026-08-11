import {
  ENVIRONMENT_VARIABLE_NAMESPACE,
  SYSTEM_VARIABLE_NAMESPACE,
  variableReferenceSchema,
  type JsonValue,
  type VariableReference,
} from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import type { RuntimeVariableResolverContext } from '../runtime/runtime-types'

const VARIABLE_TOKEN_PATTERN = /\{\{#([^{}]+)#\}\}/g

function parseVariableReference(
  nodeId: string,
  token: string,
  invalidVariableMessage: string,
): VariableReference {
  const segments = token.split('.')
  const [namespace, key, ...path] = segments
  const reference: unknown =
    namespace === SYSTEM_VARIABLE_NAMESPACE
      ? { scope: 'system', key, path }
      : namespace === ENVIRONMENT_VARIABLE_NAMESPACE
        ? { scope: ENVIRONMENT_VARIABLE_NAMESPACE, variableId: key, path }
        : {
            scope: 'node',
            nodeId: namespace,
            outputKey: key,
            path,
          }

  const parsed = variableReferenceSchema.safeParse(reference)
  if (!parsed.success) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG, invalidVariableMessage, {
      nodeId,
      token,
    })
  }

  return parsed.data
}

function stringifyTemplateValue(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function projectVariableTemplate(
  nodeId: string,
  template: string,
  context: RuntimeVariableResolverContext,
  invalidVariableMessage: string,
): string {
  return template.replace(VARIABLE_TOKEN_PATTERN, (_match, token: string) => {
    const reference = parseVariableReference(nodeId, token, invalidVariableMessage)
    return stringifyTemplateValue(
      context.resolveValue({
        type: 'reference',
        reference,
      }),
    )
  })
}
