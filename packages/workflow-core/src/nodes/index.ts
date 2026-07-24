import { NodeType } from '../node/node-definition'
import { NodeRegistry } from '../node/node-registry'
import { BuiltinNodeType } from './builtin-node-types'
import { codeNode } from './code'
import { conditionNode } from './condition'
import { endNode } from './end'
import { httpNode } from './http'
import { llmNode } from './llm'
import { loopNode } from './loop'
import { loopExitNode } from './loop-exit'
import { loopStartNode } from './loop-start'
import { ragNode } from './rag'
import { startNode } from './start'
import { subWorkflowNode } from './sub-workflow'

export const builtinNodeStrategies = {
  [BuiltinNodeType.START]: startNode,
  [BuiltinNodeType.END]: endNode,
  [BuiltinNodeType.LLM]: llmNode,
  [BuiltinNodeType.RAG]: ragNode,
  [BuiltinNodeType.CODE]: codeNode,
  [BuiltinNodeType.HTTP]: httpNode,
  [BuiltinNodeType.LOOP]: loopNode,
  [BuiltinNodeType.LOOP_START]: loopStartNode,
  [BuiltinNodeType.LOOP_EXIT]: loopExitNode,
  [BuiltinNodeType.CONDITION]: conditionNode,
  [BuiltinNodeType.SUB_WORKFLOW]: subWorkflowNode,
} satisfies Record<BuiltinNodeType, NodeType>

export const nodeRegistry = new NodeRegistry(
  Object.values(builtinNodeStrategies)
)
