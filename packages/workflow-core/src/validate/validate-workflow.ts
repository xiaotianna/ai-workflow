import type { NodeRegistryReader } from '../node'
import type { Workflow } from '../workflow/workflow-schema'
import { validateAcyclicWorkflow } from './validate-cycle'
import { validateEdges } from './validate-edge'
import { validateLoopStructure } from './validate-loop-structure'
import { validateNodes, validateRequiredNodeInputs } from './validate-node'
import { validateRootExecution } from './validate-root-execution'
import { validateVariableReferences } from './validate-variable-references'
import type {
  EdgeValidationResult,
  NodeValidationResult,
  ReportValidationIssueFn,
  WorkflowValidationIssue,
} from './validate-types'

interface WorkflowValidationResult {
  issues: WorkflowValidationIssue[]
  nodes: NodeValidationResult
  edges: EdgeValidationResult
}

// 统一基础校验入口，负责依次校验所有节点和边，并收集校验结果
const collectWorkflowValidationResult = (
  workflow: Workflow,
  registry: NodeRegistryReader,
): WorkflowValidationResult => {
  const issues: WorkflowValidationIssue[] = []
  const report: ReportValidationIssueFn = (issue) => issues.push(issue)
  const nodes = validateNodes(workflow.nodes, registry, report)
  const edges = validateEdges(workflow.edges, nodes, report)

  // 校验loop是否合法
  validateLoopStructure(workflow.nodes, workflow.edges, report)
  // 校验节点输入与输出映射只能引用执行路径中的上游输出变量
  validateVariableReferences(
    workflow.nodes,
    workflow.environmentVariables,
    edges.resolvedEdges,
    report,
  )

  return { issues, nodes, edges }
}

// 校验编辑、保存阶段已经存在的节点和连线
export const validateWorkflow = (
  workflow: Workflow,
  registry: NodeRegistryReader, // 采用参数传入是为了后续可以扩展插件节点
): WorkflowValidationIssue[] => collectWorkflowValidationResult(workflow, registry).issues

// 执行完整校验，并追加必填输入和循环依赖规则
export const validateExecutorWorkflow = (
  workflow: Workflow,
  registry: NodeRegistryReader,
): WorkflowValidationIssue[] => {
  const result = collectWorkflowValidationResult(workflow, registry)
  const report: ReportValidationIssueFn = (issue) => {
    result.issues.push(issue)
  }

  // 该校验只针对于运行时候执行
  validateRequiredNodeInputs(result.nodes, result.edges.inputConnectionCounts, report)
  validateAcyclicWorkflow(result.nodes.nodeIds, result.edges.resolvedEdges, report)
  validateRootExecution(workflow.nodes, result.edges.resolvedEdges, report)

  return result.issues
}
