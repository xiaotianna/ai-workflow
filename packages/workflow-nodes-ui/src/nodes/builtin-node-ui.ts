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
  subWorkflowNode,
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
import { SubWorkflowNodeContent } from './sub-workflow'

export const builtinNodeUIRegistrations = [
  defineNodeUI(startNode, StartNodeContent),
  defineNodeUI(endNode, EndNodeContent),
  defineNodeRendererUI(codeNode, CodeNodeContent),
  defineNodeRendererUI(httpNode, HttpNodeContent),
  defineNodeRendererUI(llmNode, LlmNodeContent),
  defineNodeUI(ragNode, RagNodeContent),
  defineNodeUI(subWorkflowNode, SubWorkflowNodeContent),
  defineNodeRendererUI(conditionNode, ConditionNode),
  defineNodeRendererUI(loopNode, LoopNode),
]

export function createBuiltinNodeUIRegistry(
  coreRegistry: NodeRegistry = nodeRegistry,
): NodeUIRegistry {
  return new NodeUIRegistry(builtinNodeUIRegistrations).assertCompatible(coreRegistry)
}
