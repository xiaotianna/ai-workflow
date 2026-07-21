import { conditionNode, nodeRegistry, startNode } from '@ai-workflow/core'
import type { NodeRegistry } from '@ai-workflow/core'
import { defineNodeUI } from '../contracts/node-content'
import { NodeUIRegistry } from '../registry'
import { ConditionNodeContent } from './condition'
import { StartNodeContent } from './start'

export const builtinNodeUIRegistrations = [
  defineNodeUI(startNode, StartNodeContent),
  defineNodeUI(conditionNode, ConditionNodeContent),
]

export function createBuiltinNodeUIRegistry(
  coreRegistry: NodeRegistry = nodeRegistry,
): NodeUIRegistry {
  return new NodeUIRegistry(builtinNodeUIRegistrations).assertCompatible(coreRegistry)
}
