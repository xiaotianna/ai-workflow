import type { JsonValue, VariableValue, WorkflowNode } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import type { RuntimeVariableResolverContext } from '../runtime/runtime-types'
import { parseJsonObject } from '../utils/json-value'

export type RuntimeNodeConfigProjector = (
  node: WorkflowNode,
  context: RuntimeVariableResolverContext,
) => Record<string, JsonValue>

export interface RuntimeNodeConfigResolver {
  resolve(
    node: WorkflowNode,
    resolveValue: (value: VariableValue) => JsonValue,
  ): Record<string, JsonValue>
}

export function projectStaticJsonNodeConfig(
  node: WorkflowNode,
  _context: RuntimeVariableResolverContext,
): Record<string, JsonValue> {
  return parseJsonObject(node.config, `node.${node.id}.config`)
}

export function createRuntimeNodeConfigResolver(
  projectors: Readonly<Record<string, RuntimeNodeConfigProjector>>,
): RuntimeNodeConfigResolver {
  const projectorByNodeType = new Map(Object.entries(projectors))

  return {
    resolve(node, resolveValue) {
      const projector = projectorByNodeType.get(node.type)
      if (!projector) {
        throw new RuntimeError(
          RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG,
          `节点类型 ${node.type} 没有 Runtime Config projector`,
          { nodeId: node.id, nodeType: node.type },
        )
      }

      const config = projector(node, {
        node,
        resolveValue,
      })

      return parseJsonObject(config, `node.${node.id}.resolvedConfig`)
    },
  }
}
