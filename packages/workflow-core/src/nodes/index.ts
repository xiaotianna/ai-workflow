import { NodeType } from '../node/node-definition'
import { NodeRegistry } from '../node/node-registry'
import { BuiltinNodeType } from './builtin-node-types'
import { conditionNode } from './condition'
import { startNode } from './start'

export const builtinNodeStrategies = {
  [BuiltinNodeType.START]: startNode,
  // [BuiltinNodeType.END]: endNode,
  //   [BuiltinNodeType.LLM]: llmNode,
  //   [BuiltinNodeType.HTTP]: httpNode,
  [BuiltinNodeType.CONDITION]: conditionNode,
} satisfies Record<BuiltinNodeType, NodeType>

export const nodeRegistry = new NodeRegistry(Object.values(builtinNodeStrategies))
