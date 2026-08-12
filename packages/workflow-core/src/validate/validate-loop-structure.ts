import type { WorkflowEdge } from '../edge/workflow-edge-schema'
import type { WorkflowNode } from '../node/workflow-node-schema'
import { BuiltinNodeType } from '../nodes/builtin-node-types'
import type { ReportValidationIssueFn } from './validate-types'

// 判断一个节点是不是 Loop 专用的系统节点（只有loop_start和loop_exit）
const isLoopSystemNode = (node: WorkflowNode): boolean =>
    node.type === BuiltinNodeType.LOOP_START || node.type === BuiltinNodeType.LOOP_EXIT,
  // 检查每个节点的 parentId 引用是否合法
  validateParentReferences = (
    nodes: readonly WorkflowNode[],
    nodeById: ReadonlyMap<string, WorkflowNode>,
    report: ReportValidationIssueFn,
  ): void => {
    for (const node of nodes) {
      // loop系统节点必须要有父loop
      if (!node.parentId) {
        if (isLoopSystemNode(node)) {
          report({
            scope: 'node',
            nodeId: node.id,
            field: 'parentId',
            message: `${node.type} 必须属于一个 Loop`,
          })
        }
        continue
      }

      const parent = nodeById.get(node.parentId)
      // parentId指向的节点必须存在
      if (!parent) {
        report({
          scope: 'node',
          nodeId: node.id,
          field: 'parentId',
          message: `父节点不存在：${node.parentId}`,
        })
        continue
      }

      // 当前节点不能把自己设为父节点
      if (parent.id === node.id) {
        report({
          scope: 'node',
          nodeId: node.id,
          field: 'parentId',
          message: '节点不能将自己设置为父节点',
        })
        continue
      }

      // 父节点的类型必须是loop
      if (parent.type !== BuiltinNodeType.LOOP) {
        report({
          scope: 'node',
          nodeId: node.id,
          field: 'parentId',
          message: `父节点必须是 Loop：${node.parentId}`,
        })
      }
    }
  },
  /**
   * 检查parentId形成的父子关系中是否存在循环，例如下面是非法的：
   * loopA.parentId = 'loop-b'，loopB.parentId = 'loop-a'
   * 会形成：loop-a → loop-b → loop-a
   */
  validateParentCycles = (
    nodes: readonly WorkflowNode[],
    nodeById: ReadonlyMap<string, WorkflowNode>,
    report: ReportValidationIssueFn,
  ): void => {
    for (const node of nodes) {
      const visited = new Set<string>([node.id])
      let parentId = node.parentId

      while (parentId) {
        if (visited.has(parentId)) {
          report({
            scope: 'node',
            nodeId: node.id,
            field: 'parentId',
            message: '节点父子关系中存在循环',
          })
          break
        }

        visited.add(parentId)
        parentId = nodeById.get(parentId)?.parentId
      }
    }
  },
  /**
 * 检查每个 Loop 直接包含的子节点是否合法
 * 主要包含三项校验：
    - 必须恰好有一个 Loop Start
    - 必须恰好有一个 Loop Exit
    - 内部不能出现主工作流的 Start 或 End
 */
  validateLoopChildren = (
    nodes: readonly WorkflowNode[],
    edges: readonly WorkflowEdge[],
    report: ReportValidationIssueFn,
  ): void => {
    const childrenByParentId = new Map<string, WorkflowNode[]>()

    for (const node of nodes) {
      if (!node.parentId) continue

      const children = childrenByParentId.get(node.parentId) ?? []
      children.push(node)
      childrenByParentId.set(node.parentId, children)
    }

    for (const loop of nodes) {
      if (loop.type !== BuiltinNodeType.LOOP) continue

      const children = childrenByParentId.get(loop.id) ?? [],
        loopStarts = children.filter((node) => node.type === BuiltinNodeType.LOOP_START),
        loopExits = children.filter((node) => node.type === BuiltinNodeType.LOOP_EXIT)

      if (loopStarts.length !== 1) {
        report({
          scope: 'node',
          nodeId: loop.id,
          message: `Loop 必须包含且只包含一个 Loop Start，当前数量：${loopStarts.length}`,
        })
      }

      if (loopExits.length !== 1) {
        report({
          scope: 'node',
          nodeId: loop.id,
          message: `Loop 必须包含且只包含一个 Loop Exit，当前数量：${loopExits.length}`,
        })
      }

      for (const child of children) {
        if (child.type === BuiltinNodeType.START || child.type === BuiltinNodeType.END) {
          report({
            scope: 'node',
            nodeId: child.id,
            field: 'type',
            message: 'Loop 内不能使用主工作流 Start 或 End',
          })
        }
      }

      if (loopStarts.length !== 1 || loopExits.length !== 1) continue

      const childIds = new Set(children.map((child) => child.id)),
        scopedEdges = edges.filter(
          (edge) => childIds.has(edge.source) && childIds.has(edge.target),
        ),
        walk = (initialId: string, direction: 'forward' | 'backward') => {
          const visited = new Set<string>([initialId]),
            queue = [initialId]
          while (queue.length > 0) {
            const currentId = queue.shift()!
            for (const edge of scopedEdges) {
              const nextId =
                direction === 'forward' && edge.source === currentId
                  ? edge.target
                  : direction === 'backward' && edge.target === currentId
                    ? edge.source
                    : undefined
              if (nextId && !visited.has(nextId)) {
                visited.add(nextId)
                queue.push(nextId)
              }
            }
          }
          return visited
        },
        reachableFromStart = walk(loopStarts[0]!.id, 'forward'),
        canReachExit = walk(loopExits[0]!.id, 'backward')
      for (const child of children) {
        if (!reachableFromStart.has(child.id)) {
          report({
            scope: 'node',
            nodeId: child.id,
            message: 'Loop 内节点必须从 Loop Start 可达',
          })
        }
        if (!canReachExit.has(child.id)) {
          report({
            scope: 'node',
            nodeId: child.id,
            message: 'Loop 内节点必须能到达 Loop Exit',
          })
        }
      }
    }
  },
  // 表示工作流的根作用域，只是用来标识最外层节点的
  ROOT_SCOPE = 'root',
  getScopeId = (node: WorkflowNode): string => node.parentId ?? ROOT_SCOPE,
  // 禁止工作流边跨越 Loop 作用域
  // 例如：一个根作用域中的 HTTP 节点，直接连接到了 Loop 内部的 LLM 节，这样是不允许的
  validateEdgeScopes = (
    edges: readonly WorkflowEdge[],
    nodeById: ReadonlyMap<string, WorkflowNode>,
    report: ReportValidationIssueFn,
  ): void => {
    for (const edge of edges) {
      const source = nodeById.get(edge.source),
        target = nodeById.get(edge.target)

      if (!source || !target) continue

      if (getScopeId(source) !== getScopeId(target)) {
        report({
          scope: 'edge',
          edgeId: edge.id,
          message: '边不能跨越 Loop 作用域，外部节点必须通过 Loop 自身的端口传值',
        })
      }
    }
  }

// 保证 Loop 在持久化数据中形成合法的“作用域树”，并禁止边直接穿透 Loop 边界
export const validateLoopStructure = (
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
  report: ReportValidationIssueFn,
): void => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  // 检查父节点引用是否存在、类型是否合法
  validateParentReferences(nodes, nodeById, report)
  // 检查parentId形成的父子关系中是否存在循环
  validateParentCycles(nodes, nodeById, report)
  // 检查每个 Loop 内部是否有正确的 Start/Exit 组成
  validateLoopChildren(nodes, edges, report)
  // 检查边是否遵守前面建立的作用域边界，不能跨作用域连接
  validateEdgeScopes(edges, nodeById, report)
}
