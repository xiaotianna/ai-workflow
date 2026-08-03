import type { Workflow, WorkflowEdge, WorkflowNode } from '@ai-workflow/core'

// 定义 Runtime 使用的 Scope 标识
export type StaticScopeKey = 'root' | WorkflowNode['id']

/**
 * 把原始工作流Workflow快照处理成Runtime容易查询的只读索引结构
 * 接收一个已经通过 Core 校验的 Workflow，生成 ExecutionPlan
 * 作用是：工作流运行过程中会反复调度，如果每次都遍历 workflow.nodes 和 workflow.edges，
 *      效率低且逻辑分散；提前建立索引后，可以直接通过 Map 或邻接边集合查询
 */
export interface ExecutionPlan {
  // 本次运行的工作流快照
  readonly workflow: Workflow
  // 按照节点标识快速查找节点定义的只读索引
  readonly nodeById: ReadonlyMap<WorkflowNode['id'], WorkflowNode>
  // 节点的入边集合，其长度就是该节点的入度
  readonly incomingEdges: ReadonlyMap<WorkflowNode['id'], readonly WorkflowEdge[]>
  // 节点的出边集合
  readonly outgoingEdges: ReadonlyMap<WorkflowNode['id'], readonly WorkflowEdge[]>
  // 记录每个scope包含哪些节点
  readonly childrenByScope: ReadonlyMap<StaticScopeKey, readonly WorkflowNode['id'][]>
  // 记录每个scope包含哪些边
  readonly edgesByScope: ReadonlyMap<StaticScopeKey, readonly WorkflowEdge[]>
}
