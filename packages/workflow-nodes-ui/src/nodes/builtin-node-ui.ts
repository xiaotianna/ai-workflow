import {
  codeNode,
  conditionNode,
  endNode,
  httpNode,
  llmNode,
  loopNode,
  nodeRegistry,
  ragNode,
  startNode,
} from '@ai-workflow/core'
import type { NodeRegistry } from '@ai-workflow/core'
import { defineNodeRendererUI, defineNodeUI } from '../contracts/node-content'
import { NodeUIRegistry } from '../registry'
import { CodeNodeContent } from './code'
import { ConditionNode } from './condition'
import { EndNodeContent } from './end'
import { HttpNodeContent } from './http'
import { LlmNodeContent } from './llm'
import { LoopNode } from './loop'
import { RagNodeContent } from './rag'
import { StartNodeContent } from './start'

export const builtinNodeUIRegistrations = [
  defineNodeUI(startNode, StartNodeContent),
  defineNodeUI(endNode, EndNodeContent),
  defineNodeUI(codeNode, CodeNodeContent),
  defineNodeUI(httpNode, HttpNodeContent),
  defineNodeUI(llmNode, LlmNodeContent),
  defineNodeUI(ragNode, RagNodeContent),
  defineNodeRendererUI(conditionNode, ConditionNode),
  defineNodeRendererUI(loopNode, LoopNode),
]

export function createBuiltinNodeUIRegistry(
  coreRegistry: NodeRegistry = nodeRegistry,
): NodeUIRegistry {
  return new NodeUIRegistry(builtinNodeUIRegistrations).assertCompatible(coreRegistry)
}
