import { conditionNode, loopNode, nodeRegistry, startNode } from '@ai-workflow/core'
import type { NodeRegistry } from '@ai-workflow/core'
import { defineNodeRendererUI, defineNodeUI } from '../contracts/node-content'
import { NodeUIRegistry } from '../registry'
import { ConditionNodeContent } from './condition'
import { LoopNode } from './loop'
import { StartNodeContent } from './start'

export const builtinNodeUIRegistrations = [
  defineNodeUI(startNode, StartNodeContent),
  defineNodeUI(conditionNode, ConditionNodeContent),
  defineNodeRendererUI(loopNode, LoopNode),
]

export function createBuiltinNodeUIRegistry(
  coreRegistry: NodeRegistry = nodeRegistry,
): NodeUIRegistry {
  return new NodeUIRegistry(builtinNodeUIRegistrations).assertCompatible(coreRegistry)
}
