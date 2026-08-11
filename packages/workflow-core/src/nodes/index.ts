import type { NodeType } from '../node/node-definition'
import { createWorkflowNodeCatalog } from '../node/workflow-node-catalog'
import type { NodeRegistryReader } from '../node/node-registry'
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

export function createBuiltinNodeRegistry(): NodeRegistryReader {
  return createBuiltinWorkflowNodeCatalog().nodeRegistry
}

export const BUILTIN_WORKFLOW_NODE_CATALOG_VERSION = 'workflow-core-builtin-v2'

export function createBuiltinWorkflowNodeCatalog() {
  return createWorkflowNodeCatalog({
    hostVersion: BUILTIN_WORKFLOW_NODE_CATALOG_VERSION,
    nodes: Object.values(builtinNodeStrategies),
  })
}

/** @deprecated 新代码应从工作流 Catalog 获取 Registry。 */
export const nodeRegistry = createBuiltinNodeRegistry()

export * from './loop'
