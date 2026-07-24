# Loop 容器节点完整实现示例

> 本文是实现方案与代码示例，不代表相关源码已经完成。
>
> 目标是在尽量少改动现有模型的前提下，实现可嵌套、可包含普通节点和 Workflow Node
> 的 Loop 容器。当前仓库已经存在部分草稿，包括 `WorkflowNode.parentId`、Loop
> Schema/Definition、`loop_start` 和 `loop_exit` 类型及部分定义；实际实现时应以源码为准，
> 按本文逐项补齐，不要重复创建已有文件。

## 1. 目标

Loop V1 需要满足：

- Loop 是一个可以承载子节点的容器节点。
- Loop 内可以添加已有的业务节点。
- Loop 内可以添加嵌套 Loop。
- Loop 内可以添加 Workflow Node，复用独立子工作流。
- 每个 Loop 自动包含且只包含一个 Loop Start。
- 每个 Loop 自动包含且只包含一个 Loop Exit。
- Loop Start 和 Loop Exit 在 V1 中均不可删除。
- Loop Schema 配置最大循环次数。
- Loop 内部不使用回边，内部图仍然是 DAG。
- 运行时每完成一轮内部 DAG 后，隐式开始下一轮。
- 执行路径到达 Loop Exit 时退出最近一层 Loop。
- 达到最大循环次数时正常结束 Loop。

V1 暂不实现：

- 并行循环。
- 把外部节点拖入 Loop。
- 把内部节点拖出 Loop。
- 多个 Loop Exit。
- 上一轮结果自动作为下一轮状态。
- Loop 内部节点独立保存为另一份 Workflow。
- Loop 自身保存 `nodes` 和 `edges`。

## 2. 核心设计结论

### 2.1 使用扁平节点模型

不要把内部节点嵌套到 Loop Config：

```ts
// 不推荐
{
  id: 'loop-1',
  type: 'loop',
  config: {
    maxIterations: 100,
    nodes: [],
    edges: [],
  },
}
```

继续复用 Workflow 顶层的 `nodes` 和 `edges`，通过 `parentId` 表示节点属于哪个 Loop：

```ts
{
  id: 'llm-1',
  type: 'llm',
  parentId: 'loop-1',
  config: {},
}
```

优点：

- 继续复用现有 NodeRegistry。
- 继续复用现有 WorkflowEdge。
- 继续复用现有节点配置 Schema。
- 继续复用现有端口解析和边校验。
- 嵌套 Loop 只需要继续设置 `parentId`。
- Workflow Node 在根画布和 Loop 内使用同一种数据结构。

### 2.2 Loop 是内联子图，不是独立子工作流

Loop 内部节点属于当前 Workflow，与当前 Workflow 一起保存和版本化。

Workflow Node 引用另一份独立 Workflow：

```ts
{
  id: 'workflow-node-1',
  type: 'workflow',
  parentId: 'loop-1',
  config: {
    workflowId: 'child-workflow-1',
  },
}
```

两者在 Runtime 中最终都可以转换为可执行图，但持久化所有权不同：

| 类型 | 数据来源 | 是否独立保存 | 是否可复用 |
| --- | --- | --- | --- |
| Loop 内联子图 | 当前 Workflow 的子节点 | 否 | 否 |
| Workflow Node | `workflowId` 指向的 Workflow | 是 | 是 |

## 3. 建议的文件结构

```text
packages/workflow-core/src/
├── node/
│   └── workflow-node-schema.ts
├── nodes/
│   ├── builtin-node-types.ts
│   ├── index.ts
│   ├── loop/
│   │   ├── schema.ts
│   │   ├── definition.ts
│   │   └── index.ts
│   ├── loop-start/
│   │   ├── schema.ts
│   │   ├── definition.ts
│   │   └── index.ts
│   ├── loop-exit/
│   │   ├── schema.ts
│   │   ├── definition.ts
│   │   └── index.ts
│   └── workflow/
│       ├── schema.ts
│       ├── definition.ts
│       └── index.ts
└── validate/
    ├── validate-loop-structure.ts
    └── validate-workflow.ts
```

Web 侧建议：

```text
apps/web/src/
├── components/workflow/
│   ├── types.ts
│   └── workflow-nodes.tsx
├── features/workflow/
│   ├── components/
│   │   └── workflow-loop-node.tsx
│   └── hooks/
│       └── use-workflow-editor.ts
└── utils/workflow/
    ├── editor-elements.ts
    └── editor-transform.ts
```

Runtime 侧建议：

```text
packages/workflow-runtime/src/
├── executor/
│   ├── graph-executor.ts
│   └── execution-types.ts
├── graph/
│   └── get-child-graph.ts
└── nodes/
    ├── loop-executor.ts
    ├── loop-start-executor.ts
    ├── loop-exit-executor.ts
    └── workflow-executor.ts
```

## 4. Core 数据模型

### 4.1 WorkflowNode 增加 parentId

`packages/workflow-core/src/node/workflow-node-schema.ts`

```ts
import { z } from 'zod'

export const workflowNodeSchema = z.object({
  id: z.string().min(1, '节点 ID 不能为空'),
  type: z.string().min(1, '节点类型不能为空'),
  config: z.record(z.string(), z.unknown()).default({}),

  // 当前 V1 只允许指向 Loop 节点。
  // Runtime 需要使用该字段区分不同执行作用域，因此不能只保存在 Web layout 中。
  parentId: z.string().min(1).optional(),
})

export type WorkflowNode = z.infer<typeof workflowNodeSchema>
```

位置仍然保存在编辑器 Layout 中，不放入 Core：

```ts
interface WorkflowEditorSnapshot {
  workflow: Workflow
  layout: {
    positions: Record<string, XYPosition>
    sizes?: Record<string, { width: number; height: number }>
    viewport?: Viewport
  }
}
```

`sizes` 只需要保存 Loop 容器尺寸。普通节点尺寸继续由 React Flow 测量。

### 4.2 注册内置类型

`packages/workflow-core/src/nodes/builtin-node-types.ts`

```ts
export const BuiltinNodeType = {
  START: 'start',
  END: 'end',
  LLM: 'llm',
  RAG: 'rag',
  CODE: 'code',
  HTTP: 'http',
  LOOP: 'loop',
  LOOP_START: 'loop_start',
  LOOP_EXIT: 'loop_exit',
  CONDITION: 'condition',
  WORKFLOW: 'workflow',
} as const

export type BuiltinNodeType = (typeof BuiltinNodeType)[keyof typeof BuiltinNodeType]
```

## 5. Loop 节点

### 5.1 Schema

`packages/workflow-core/src/nodes/loop/schema.ts`

```ts
import { z } from 'zod'

export const loopNodeSchema = z.object({
  maxIterations: z
    .number()
    .int('最大循环次数必须是整数')
    .min(1, '最大循环次数不能小于 1')
    .max(10_000, '最大循环次数不能超过 10000')
    .default(100),
})

export type LoopNodeConfig = z.output<typeof loopNodeSchema>
```

V1 只保存 `maxIterations`，不增加并发、错误策略或子图字段。

### 5.2 Definition

`packages/workflow-core/src/nodes/loop/definition.ts`

```ts
import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const loopNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.LOOP,
  label: '循环',
  description: '重复执行容器内部的节点',
  icon: BuiltinNodeType.LOOP,
  inputPort: {
    id: 'input',
    label: '循环输入',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
  },
  outputPort: {
    id: 'result',
    label: '循环结果',
    dataType: DATA_TYPE_KINDS.JSON,
    multiple: true,
  },
})
```

建议对外端口统一使用 `input/result`。`loop-start/loop-end` 更像节点类型或控制概念，
不适合作为数据端口 ID。

### 5.3 NodeType

`packages/workflow-core/src/nodes/loop/index.ts`

```ts
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { loopNodeDefinition } from './definition'
import { loopNodeSchema } from './schema'

export const loopNode = {
  schema: loopNodeSchema,
  definition: loopNodeDefinition,
  createInitialConfig: () => createInitialConfig(loopNodeSchema),
} satisfies NodeType<typeof loopNodeSchema>

export type { LoopNodeConfig } from './schema'
```

## 6. Loop Start 节点

### 6.1 Schema

`packages/workflow-core/src/nodes/loop-start/schema.ts`

```ts
import { z } from 'zod'

export const loopStartNodeSchema = z.object({})

export type LoopStartNodeConfig = z.output<typeof loopStartNodeSchema>
```

### 6.2 Definition

Loop Start 没有输入端口。每一轮由 Loop Executor 主动激活它。

`packages/workflow-core/src/nodes/loop-start/definition.ts`

```ts
import type { NodeDefinition } from '../../node/node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const loopStartNodeDefinition = {
  type: BuiltinNodeType.LOOP_START,
  label: '循环开始',
  description: '提供当前循环的输入和次数',
  icon: BuiltinNodeType.LOOP_START,
  ports: {
    inputs: {},
    outputs: {
      input: {
        label: '循环输入',
        description: 'Loop 节点从外部收到的原始输入',
        dataType: DATA_TYPE_KINDS.JSON,
        multiple: true,
      },
      iteration: {
        label: '当前循环次数',
        description: '从 0 开始的当前循环索引',
        dataType: DATA_TYPE_KINDS.NUMBER,
        multiple: true,
      },
    },
  },
} satisfies NodeDefinition
```

### 6.3 NodeType

`packages/workflow-core/src/nodes/loop-start/index.ts`

```ts
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { loopStartNodeDefinition } from './definition'
import { loopStartNodeSchema } from './schema'

export const loopStartNode = {
  schema: loopStartNodeSchema,
  definition: loopStartNodeDefinition,
  createInitialConfig: () => createInitialConfig(loopStartNodeSchema),
} satisfies NodeType<typeof loopStartNodeSchema>

export type { LoopStartNodeConfig } from './schema'
```

## 7. Loop Exit 节点

### 7.1 Schema

`packages/workflow-core/src/nodes/loop-exit/schema.ts`

```ts
import { z } from 'zod'

export const loopExitNodeSchema = z.object({})

export type LoopExitNodeConfig = z.output<typeof loopExitNodeSchema>
```

### 7.2 Definition

Loop Exit 表示控制流退出，不向 Loop 内的其他节点输出数据。

`packages/workflow-core/src/nodes/loop-exit/definition.ts`

```ts
import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const loopExitNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.LOOP_EXIT,
  label: '退出循环',
  description: '当前执行路径到达后退出循环',
  icon: BuiltinNodeType.LOOP_EXIT,
  inputPort: {
    id: 'result',
    label: '退出结果',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
    multiple: true,
  },
  outputPort: false,
})
```

`multiple: true` 允许多个条件分支连接同一个 Loop Exit。

### 7.3 NodeType

`packages/workflow-core/src/nodes/loop-exit/index.ts`

```ts
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { loopExitNodeDefinition } from './definition'
import { loopExitNodeSchema } from './schema'

export const loopExitNode = {
  schema: loopExitNodeSchema,
  definition: loopExitNodeDefinition,
  createInitialConfig: () => createInitialConfig(loopExitNodeSchema),
} satisfies NodeType<typeof loopExitNodeSchema>

export type { LoopExitNodeConfig } from './schema'
```

## 8. 节点注册与导出

`packages/workflow-core/src/nodes/index.ts`

```ts
import { NodeRegistry } from '../node/node-registry'
import { BuiltinNodeType } from './builtin-node-types'
import { conditionNode } from './condition'
import { loopNode } from './loop'
import { loopExitNode } from './loop-exit'
import { loopStartNode } from './loop-start'
import { startNode } from './start'

export const builtinNodeStrategies = {
  [BuiltinNodeType.START]: startNode,
  [BuiltinNodeType.CONDITION]: conditionNode,
  [BuiltinNodeType.LOOP]: loopNode,
  [BuiltinNodeType.LOOP_START]: loopStartNode,
  [BuiltinNodeType.LOOP_EXIT]: loopExitNode,
  // 其他已经完成的节点继续在这里注册。
}

export const nodeRegistry = new NodeRegistry(Object.values(builtinNodeStrategies))
```

如果 `BuiltinNodeType` 中存在尚未实现的节点，不要使用要求覆盖全部 key 的
`Record<BuiltinNodeType, NodeType>`；可以暂时使用：

```ts
satisfies Partial<Record<BuiltinNodeType, NodeType>>
```

等所有内置类型实现后，再改回完整 `Record`。

根入口：

```ts
export * from './nodes/loop'
export * from './nodes/loop-start'
export * from './nodes/loop-exit'
```

## 9. Loop 结构校验

新增：

`packages/workflow-core/src/validate/validate-loop-structure.ts`

```ts
import type { WorkflowEdge } from '../edge/workflow-edge-schema'
import type { WorkflowNode } from '../node/workflow-node-schema'
import { BuiltinNodeType } from '../nodes/builtin-node-types'
import type { ReportValidationIssueFn } from './validate-types'

const ROOT_SCOPE = 'root'

const getScopeId = (node: WorkflowNode): string => node.parentId ?? ROOT_SCOPE

const isLoopSystemNode = (node: WorkflowNode): boolean =>
  node.type === BuiltinNodeType.LOOP_START || node.type === BuiltinNodeType.LOOP_EXIT

const validateParentReferences = (
  nodes: readonly WorkflowNode[],
  nodeById: ReadonlyMap<string, WorkflowNode>,
  report: ReportValidationIssueFn,
): void => {
  for (const node of nodes) {
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

    if (!parent) {
      report({
        scope: 'node',
        nodeId: node.id,
        field: 'parentId',
        message: `父节点不存在：${node.parentId}`,
      })
      continue
    }

    if (parent.id === node.id) {
      report({
        scope: 'node',
        nodeId: node.id,
        field: 'parentId',
        message: '节点不能将自己设置为父节点',
      })
      continue
    }

    if (parent.type !== BuiltinNodeType.LOOP) {
      report({
        scope: 'node',
        nodeId: node.id,
        field: 'parentId',
        message: `父节点必须是 Loop：${node.parentId}`,
      })
    }
  }
}

const validateParentCycles = (
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
}

const validateLoopChildren = (
  nodes: readonly WorkflowNode[],
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

    const children = childrenByParentId.get(loop.id) ?? []
    const loopStarts = children.filter((node) => node.type === BuiltinNodeType.LOOP_START)
    const loopExits = children.filter((node) => node.type === BuiltinNodeType.LOOP_EXIT)

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
  }
}

const validateEdgeScopes = (
  edges: readonly WorkflowEdge[],
  nodeById: ReadonlyMap<string, WorkflowNode>,
  report: ReportValidationIssueFn,
): void => {
  for (const edge of edges) {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)

    // 节点不存在的问题由现有边校验负责，避免重复报告。
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

export const validateLoopStructure = (
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
  report: ReportValidationIssueFn,
): void => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  validateParentReferences(nodes, nodeById, report)
  validateParentCycles(nodes, nodeById, report)
  validateLoopChildren(nodes, report)
  validateEdgeScopes(edges, nodeById, report)
}
```

在基础校验收集阶段调用：

```ts
const collectWorkflowValidationResult = (
  workflow: Workflow,
  registry: NodeRegistry,
): WorkflowValidationResult => {
  const issues: WorkflowValidationIssue[] = []
  const report: ReportValidationIssueFn = (issue) => issues.push(issue)

  const nodes = validateNodes(workflow.nodes, registry, report)
  const edges = validateEdges(workflow.edges, nodes, report)

  validateLoopStructure(workflow.nodes, workflow.edges, report)

  return { issues, nodes, edges }
}
```

由于跨作用域边被禁止，现有 Kahn 环检测可以继续对全部节点和边运行，无需为了 Loop
立即重写。所有作用域都是互不相交的 DAG，并集无环等价于每个作用域无环。

## 10. 完整 Workflow 数据示例

```ts
const workflow = {
  id: 'workflow-1',
  name: 'Loop 示例',
  description: '包含普通节点和子 Workflow 的循环',
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      config: {},
    },
    {
      id: 'loop-1',
      type: 'loop',
      config: {
        maxIterations: 100,
      },
    },
    {
      id: 'loop-start-1',
      type: 'loop_start',
      parentId: 'loop-1',
      config: {},
    },
    {
      id: 'llm-1',
      type: 'llm',
      parentId: 'loop-1',
      config: {},
    },
    {
      id: 'condition-1',
      type: 'condition',
      parentId: 'loop-1',
      config: {
        conditions: [
          {
            portId: 'completed',
            conditionLabel: '已经完成',
            condition: 'result.completed === true',
            isFallback: false,
          },
          {
            portId: 'continue',
            conditionLabel: '继续',
            isFallback: true,
          },
        ],
      },
    },
    {
      id: 'workflow-node-1',
      type: 'workflow',
      parentId: 'loop-1',
      config: {
        workflowId: 'reusable-workflow-1',
      },
    },
    {
      id: 'loop-exit-1',
      type: 'loop_exit',
      parentId: 'loop-1',
      config: {},
    },
    {
      id: 'end-1',
      type: 'end',
      config: {},
    },
  ],
  edges: [
    {
      id: 'start-loop',
      source: 'start-1',
      sourceHandle: 'variables',
      target: 'loop-1',
      targetHandle: 'input',
    },
    {
      id: 'loop-end',
      source: 'loop-1',
      sourceHandle: 'result',
      target: 'end-1',
      targetHandle: 'result',
    },
    {
      id: 'loop-start-llm',
      source: 'loop-start-1',
      sourceHandle: 'input',
      target: 'llm-1',
      targetHandle: 'input',
    },
    {
      id: 'llm-condition',
      source: 'llm-1',
      sourceHandle: 'result',
      target: 'condition-1',
      targetHandle: 'entry',
    },
    {
      id: 'condition-exit',
      source: 'condition-1',
      sourceHandle: 'completed',
      target: 'loop-exit-1',
      targetHandle: 'result',
    },
    {
      id: 'condition-workflow',
      source: 'condition-1',
      sourceHandle: 'continue',
      target: 'workflow-node-1',
      targetHandle: 'input',
    },
  ],
  outputs: [],
}
```

Workflow Node 所在作用域由 `parentId` 决定，引用的子 Workflow 本身仍然是独立资源。

## 11. 嵌套 Loop 示例

```ts
const nodes = [
  {
    id: 'outer-loop',
    type: 'loop',
    config: {
      maxIterations: 10,
    },
  },
  {
    id: 'outer-start',
    type: 'loop_start',
    parentId: 'outer-loop',
    config: {},
  },
  {
    id: 'inner-loop',
    type: 'loop',
    parentId: 'outer-loop',
    config: {
      maxIterations: 5,
    },
  },
  {
    id: 'outer-exit',
    type: 'loop_exit',
    parentId: 'outer-loop',
    config: {},
  },
  {
    id: 'inner-start',
    type: 'loop_start',
    parentId: 'inner-loop',
    config: {},
  },
  {
    id: 'inner-exit',
    type: 'loop_exit',
    parentId: 'inner-loop',
    config: {},
  },
]
```

获取 Loop 子图时只取直接子节点：

```ts
const directChildren = workflow.nodes.filter((node) => node.parentId === loopNode.id)
```

外层 Loop 的执行器把 `inner-loop` 当作一个普通复合节点。内层 Loop 自己负责
`inner-start` 和 `inner-exit`，避免外层执行器越过边界执行孙节点。

## 12. Web 数据转换

本节涉及两个现有文件：

| 内容 | 目标文件 |
| --- | --- |
| 编辑器快照和 Canvas Node 类型 | `apps/web/src/components/workflow/types.ts` |
| Core、Canvas 和 Layout 双向转换 | `apps/web/src/utils/workflow/editor-transform.ts` |

### 12.1 Canvas Node 类型

目标文件：`apps/web/src/components/workflow/types.ts`

现有 `WorkflowCanvasNode` 可以继续继承 React Flow `Node`，因为 React Flow Node 已支持
`parentId`、`extent` 和 `expandParent`。

```ts
export interface WorkflowCanvasNode extends Node<WorkflowNode['config']> {
  type: WorkflowNode['type']
}
```

### 12.2 Core 转 Canvas

目标文件：`apps/web/src/utils/workflow/editor-transform.ts`

父节点必须排在子节点之前交给 React Flow。

```ts
const getNodeDepth = (
  node: WorkflowNode,
  nodeById: ReadonlyMap<string, WorkflowNode>,
): number => {
  let depth = 0
  let parentId = node.parentId
  const visited = new Set<string>()

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    depth += 1
    parentId = nodeById.get(parentId)?.parentId
  }

  return depth
}

export const toCanvasNodes = (
  snapshot: WorkflowEditorSnapshot,
): WorkflowCanvasNode[] => {
  const nodeById = new Map(snapshot.workflow.nodes.map((node) => [node.id, node]))

  return [...snapshot.workflow.nodes]
    .sort((left, right) => getNodeDepth(left, nodeById) - getNodeDepth(right, nodeById))
    .map((workflowNode, index) => {
      const size = snapshot.layout.sizes?.[workflowNode.id]

      return {
        id: workflowNode.id,
        type: workflowNode.type,
        position:
          snapshot.layout.positions[workflowNode.id] ??
          getDefaultNodePosition(index),
        data: workflowNode.config,
        parentId: workflowNode.parentId,
        extent: workflowNode.parentId ? 'parent' : undefined,
        expandParent: workflowNode.parentId ? true : undefined,
        ...(size
          ? {
              style: {
                width: size.width,
                height: size.height,
              },
            }
          : {}),
      }
    })
}
```

### 12.3 Canvas 转 Core

目标文件：`apps/web/src/utils/workflow/editor-transform.ts`

```ts
export const toWorkflowNode = (
  node: WorkflowCanvasNode,
): WorkflowNode => ({
  id: node.id,
  type: node.type,
  config: node.data,
  ...(node.parentId ? { parentId: node.parentId } : {}),
})
```

### 12.4 保存 Layout

Layout 类型中的 `sizes` 字段写入：

`apps/web/src/components/workflow/types.ts`

```ts
export interface WorkflowEditorSnapshot {
  workflow: Workflow
  layout: {
    positions: Record<string, XYPosition>
    sizes?: Record<string, { width: number; height: number }>
    viewport?: Viewport
  }
}
```

Layout 转换函数写入：

`apps/web/src/utils/workflow/editor-transform.ts`

```ts
export const toWorkflowEditorLayout = (
  nodes: readonly WorkflowCanvasNode[],
  viewport: Viewport | undefined,
): WorkflowEditorSnapshot['layout'] => ({
  positions: Object.fromEntries(
    nodes.map((node) => [node.id, node.position]),
  ),
  sizes: Object.fromEntries(
    nodes
      .filter((node) => node.type === BuiltinNodeType.LOOP)
      .flatMap((node) => {
        const width = node.measured?.width
        const height = node.measured?.height

        return width && height
          ? [[node.id, { width, height }]]
          : []
      }),
  ),
  ...(viewport ? { viewport } : {}),
})
```

子节点的 `position` 是相对直接父 Loop 的坐标。

## 13. 创建 Loop

目标文件：`apps/web/src/utils/workflow/editor-elements.ts`

创建 Loop 必须一次生成三个节点，避免产生暂时不合法的 Loop。

```ts
const DEFAULT_LOOP_SIZE = {
  width: 680,
  height: 420,
}

interface CreateLoopCanvasNodesOptions {
  position: XYPosition
  parentId?: string
}

export const createLoopCanvasNodes = ({
  position,
  parentId,
}: CreateLoopCanvasNodesOptions): WorkflowCanvasNode[] => {
  const loopId = generateUuid()

  const loopNode: WorkflowCanvasNode = {
    id: loopId,
    type: BuiltinNodeType.LOOP,
    position,
    data: nodeRegistry.getOrThrow(BuiltinNodeType.LOOP).createInitialConfig(),
    ...(parentId
      ? {
          parentId,
          extent: 'parent',
          expandParent: true,
        }
      : {}),
    style: DEFAULT_LOOP_SIZE,
  }

  const loopStartNode: WorkflowCanvasNode = {
    id: generateUuid(),
    type: BuiltinNodeType.LOOP_START,
    parentId: loopId,
    extent: 'parent',
    position: {
      x: 32,
      y: 96,
    },
    data: nodeRegistry
      .getOrThrow(BuiltinNodeType.LOOP_START)
      .createInitialConfig(),
  }

  const loopExitNode: WorkflowCanvasNode = {
    id: generateUuid(),
    type: BuiltinNodeType.LOOP_EXIT,
    parentId: loopId,
    extent: 'parent',
    position: {
      x: 260,
      y: 96,
    },
    data: nodeRegistry
      .getOrThrow(BuiltinNodeType.LOOP_EXIT)
      .createInitialConfig(),
  }

  return [loopNode, loopStartNode, loopExitNode]
}
```

当用户在某个 Loop 内添加嵌套 Loop 时，把外层 Loop ID 传入 `parentId`。

## 14. 在 Loop 内添加节点

本节涉及：

| 内容 | 目标文件 |
| --- | --- |
| 添加普通节点和嵌套 Loop 的编辑器操作 | `apps/web/src/features/workflow/hooks/use-workflow-editor.ts` |
| 根画布节点菜单过滤 | `apps/web/src/features/workflow/hooks/use-workflow-editor.ts` |
| Loop 内节点菜单过滤 | `apps/web/src/components/workflow/workflow-loop-node.tsx` |

V1 不实现拖入和拖出，通过 Loop 内的“添加节点”按钮创建子节点。

目标文件：`apps/web/src/features/workflow/hooks/use-workflow-editor.ts`

```ts
function addNodeToLoop(
  type: string,
  loopId: string,
  position: XYPosition,
) {
  if (type === BuiltinNodeType.START || type === BuiltinNodeType.END) {
    return
  }

  if (type === BuiltinNodeType.LOOP) {
    const created = createLoopCanvasNodes({
      position,
      parentId: loopId,
    })

    setNodes((current) => [...current, ...created])
    return
  }

  const nodeType = nodeRegistry.getOrThrow(type)

  setNodes((current) => [
    ...current,
    {
      id: generateUuid(),
      type,
      parentId: loopId,
      extent: 'parent',
      expandParent: true,
      position,
      data: nodeType.createInitialConfig(),
    },
  ])
}
```

根画布的节点菜单不展示 `loop_start` 和 `loop_exit`：

目标文件：`apps/web/src/features/workflow/hooks/use-workflow-editor.ts`

```ts
const hiddenNodeTypes = new Set([
  BuiltinNodeType.LOOP_START,
  BuiltinNodeType.LOOP_EXIT,
])

const availableNodeTypes = nodeRegistry
  .list()
  .filter((nodeType) => !hiddenNodeTypes.has(nodeType.definition.type))
```

Loop 内部菜单额外排除主工作流 Start 和 End：

目标文件：`apps/web/src/components/workflow/workflow-loop-node.tsx`

```ts
const loopUnavailableNodeTypes = new Set([
  BuiltinNodeType.START,
  BuiltinNodeType.END,
  BuiltinNodeType.LOOP_START,
  BuiltinNodeType.LOOP_EXIT,
])
```

## 15. 删除节点

本节涉及：

| 内容 | 目标文件 |
| --- | --- |
| 收集后代节点的纯函数 | `apps/web/src/utils/workflow/editor-elements.ts` |
| 删除操作和编辑器状态更新 | `apps/web/src/features/workflow/hooks/use-workflow-editor.ts` |

删除 Loop 时必须递归删除全部后代节点。

纯函数写入：

`apps/web/src/utils/workflow/editor-elements.ts`

```ts
const collectDescendantNodeIds = (
  rootNodeIds: ReadonlySet<string>,
  nodes: readonly WorkflowCanvasNode[],
): Set<string> => {
  const result = new Set(rootNodeIds)
  let changed = true

  while (changed) {
    changed = false

    for (const node of nodes) {
      if (node.parentId && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id)
        changed = true
      }
    }
  }

  return result
}
```

删除操作写入：

`apps/web/src/features/workflow/hooks/use-workflow-editor.ts`

```ts
function deleteNodes(requestedNodeIds: ReadonlySet<string>) {
  const protectedTypes = new Set([
    BuiltinNodeType.LOOP_START,
    BuiltinNodeType.LOOP_EXIT,
  ])

  const allowedRootIds = new Set(
    nodes
      .filter(
        (node) =>
          requestedNodeIds.has(node.id) &&
          !protectedTypes.has(node.type),
      )
      .map((node) => node.id),
  )

  const deletedNodeIds = collectDescendantNodeIds(allowedRootIds, nodes)

  setNodes((current) =>
    current.filter((node) => !deletedNodeIds.has(node.id)),
  )
  setEdges((current) =>
    removeEdgesConnectedToNodes(current, deletedNodeIds),
  )
}
```

如果删除的是 Loop，受保护的 Loop Start/Exit 会作为其后代被级联删除；用户不能单独删除它们。

## 16. Loop 专用渲染

本节涉及：

| 内容 | 目标文件 |
| --- | --- |
| 根据节点类型选择普通渲染器或 Loop 渲染器 | `apps/web/src/components/workflow/workflow-nodes.tsx` |
| Loop 容器组件 | `apps/web/src/components/workflow/workflow-loop-node.tsx` |

Loop 容器依赖 React Flow 的嵌套布局，因此 V1 建议在 Web 中做专用渲染，不改造
`@ai-workflow/nodes-ui` 的通用 `BaseNode`。

目标文件：`apps/web/src/components/workflow/workflow-nodes.tsx`

```tsx
const WorkflowNode = (props: NodeProps<WorkflowCanvasNode>) => {
  if (props.type === BuiltinNodeType.LOOP) {
    return <WorkflowLoopNode {...props} />
  }

  return (
    <RenderNode
      node={{
        id: props.id,
        type: props.type,
        config: props.data,
        parentId: props.parentId,
      }}
      nodeRegistry={nodeRegistry}
      uiRegistry={nodeUIRegistry}
      selected={props.selected}
      renderPort={(portProps) => <WorkflowNodeHandle {...portProps} />}
    />
  )
}
```

简化的容器示例：

目标文件：`apps/web/src/components/workflow/workflow-loop-node.tsx`

```tsx
export function WorkflowLoopNode({
  id,
  data,
  selected,
}: NodeProps<WorkflowCanvasNode>) {
  return (
    <section
      aria-label="循环节点"
      className={cn(
        'relative size-full min-h-[420px] min-w-[680px]',
        'rounded-[28px] border bg-card/80 shadow-xs',
        'transition-[border-color,box-shadow,background-color]',
        selected && 'border-primary shadow-lg',
      )}
    >
      <header className="drag-handle flex h-16 items-center gap-3 px-5">
        <NodeIcon icon={BuiltinNodeType.LOOP} />
        <div>
          <div className="text-sm font-semibold">循环</div>
          <div className="text-xs text-muted-foreground">
            最大循环次数：{String(data.maxIterations ?? 100)}
          </div>
        </div>
      </header>

      <div className="mx-3 mb-3 h-[calc(100%-76px)] rounded-[22px] bg-muted/30" />

      <WorkflowNodeHandle
        nodeId={id}
        portId="input"
        direction="input"
        port={{
          dataType: DATA_TYPE_KINDS.JSON,
          required: true,
        }}
      />

      <WorkflowNodeHandle
        nodeId={id}
        portId="result"
        direction="output"
        port={{
          dataType: DATA_TYPE_KINDS.JSON,
          multiple: true,
        }}
      />
    </section>
  )
}
```

实际样式应使用项目语义 Token。Loop 折叠、展开和尺寸变化如果后续加入，应使用 Motion。

## 17. Runtime 执行契约

本节示例对应的新文件如下：

| 内容 | 目标文件 |
| --- | --- |
| 节点执行结果和控制信号 | `packages/workflow-runtime/src/executor/execution-types.ts` |
| Loop Exit 执行器 | `packages/workflow-runtime/src/nodes/loop-exit-executor.ts` |
| 提取 Loop 直接子图 | `packages/workflow-runtime/src/graph/get-child-graph.ts` |
| Loop Start 执行器 | `packages/workflow-runtime/src/nodes/loop-start-executor.ts` |
| Loop 输出类型与 Loop 执行器 | `packages/workflow-runtime/src/nodes/loop-executor.ts` |

### 17.1 执行结果

不要通过图中的回边表达下一轮循环。循环是 Loop Executor 的控制行为。

目标文件：`packages/workflow-runtime/src/executor/execution-types.ts`

```ts
export interface NodeExecutionOutput {
  outputs: Record<string, unknown>
  control?: ExecutionControl
}

export type ExecutionControl =
  | {
      kind: 'break-loop'
      loopId: string
      value: unknown
    }
```

Loop Exit 返回控制信号，而不是抛出通用 Error：

目标文件：`packages/workflow-runtime/src/nodes/loop-exit-executor.ts`

```ts
export interface NodeExecutorContext {
  node: WorkflowNode
  inputs: Record<string, unknown>
}

export const executeLoopExit = ({
  node,
  inputs,
}: NodeExecutorContext): NodeExecutionOutput => {
  if (!node.parentId) {
    throw new Error('Loop Exit 缺少 parentId')
  }

  return {
    outputs: {},
    control: {
      kind: 'break-loop',
      loopId: node.parentId,
      value: inputs.result,
    },
  }
}
```

### 17.2 提取直接子图

目标文件：`packages/workflow-runtime/src/graph/get-child-graph.ts`

```ts
export interface ExecutableGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export const getChildGraph = (
  workflow: Workflow,
  parentId: string,
): ExecutableGraph => {
  const nodes = workflow.nodes.filter((node) => node.parentId === parentId)
  const nodeIds = new Set(nodes.map((node) => node.id))

  const edges = workflow.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  )

  return {
    nodes,
    edges,
  }
}
```

不要递归加入孙节点。嵌套 Loop 在当前子图中只是一个普通的 Loop 节点。

### 17.3 Loop Start 执行

目标文件：`packages/workflow-runtime/src/nodes/loop-start-executor.ts`

```ts
interface LoopIterationInput {
  input: unknown
  iteration: number
}

export const executeLoopStart = (
  iterationInput: LoopIterationInput,
): NodeExecutionOutput => ({
  outputs: {
    input: iterationInput.input,
    iteration: iterationInput.iteration,
  },
})
```

### 17.4 Loop 输出

目标文件：`packages/workflow-runtime/src/nodes/loop-executor.ts`

```ts
export type LoopExecutionResult =
  | {
      reason: 'exit'
      iterations: number
      value: unknown
    }
  | {
      reason: 'max_iterations'
      iterations: number
    }
```

### 17.5 Loop Executor

目标文件：`packages/workflow-runtime/src/nodes/loop-executor.ts`

```ts
interface LoopExecutorContext {
  workflow: Workflow
  graphExecutor: GraphExecutor
}

export const executeLoop = async (
  loopNode: WorkflowNode,
  inputs: Record<string, unknown>,
  context: LoopExecutorContext,
): Promise<NodeExecutionOutput> => {
  const config = loopNodeSchema.parse(loopNode.config)
  const body = getChildGraph(context.workflow, loopNode.id)

  for (let iteration = 0; iteration < config.maxIterations; iteration += 1) {
    const execution = await context.graphExecutor.execute(body, {
      systemNodeInputs: {
        [BuiltinNodeType.LOOP_START]: {
          input: inputs.input,
          iteration,
        },
      },
    })

    if (
      execution.control?.kind === 'break-loop' &&
      execution.control.loopId === loopNode.id
    ) {
      const result: LoopExecutionResult = {
        reason: 'exit',
        iterations: iteration + 1,
        value: execution.control.value,
      }

      return {
        outputs: {
          result,
        },
      }
    }
  }

  const result: LoopExecutionResult = {
    reason: 'max_iterations',
    iterations: config.maxIterations,
  }

  return {
    outputs: {
      result,
    },
  }
}
```

V1 使用确定性顺序调度，不执行并行分支。Loop Exit 被激活时停止调度本轮尚未执行的节点。

嵌套 Loop 中，内层 Loop Executor 只捕获 `loopId === innerLoop.id` 的控制信号。内层退出后，
外层 Loop 可以继续运行，不会误退出外层。

## 18. Workflow Node 兼容实现

本节示例对应的新文件如下：

| 内容 | 目标文件 |
| --- | --- |
| Workflow Node Schema | `packages/workflow-core/src/nodes/workflow/schema.ts` |
| Workflow Node Definition | `packages/workflow-core/src/nodes/workflow/definition.ts` |
| Workflow Node NodeType | `packages/workflow-core/src/nodes/workflow/index.ts` |
| Workflow Resolver 契约 | `packages/workflow-runtime/src/contracts/workflow-resolver.ts` |
| Workflow Node 执行器 | `packages/workflow-runtime/src/nodes/workflow-executor.ts` |

Loop 不需要直接引用 `workflowId`。Workflow Node 自己负责引用独立子 Workflow。

### 18.1 最小 Schema

目标文件：`packages/workflow-core/src/nodes/workflow/schema.ts`

```ts
import { z } from 'zod'

export const workflowNodeSchema = z.object({
  workflowId: z.string().trim().min(1, '请选择子工作流'),
})

export type WorkflowNodeConfig = z.output<typeof workflowNodeSchema>
```

### 18.2 最小 Definition

V1 可以先使用统一 JSON 输入输出：

目标文件：`packages/workflow-core/src/nodes/workflow/definition.ts`

```ts
export const workflowNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.WORKFLOW,
  label: '子工作流',
  description: '调用一份可复用的独立工作流',
  icon: BuiltinNodeType.WORKFLOW,
  inputPort: {
    id: 'input',
    label: '工作流输入',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
  },
  outputPort: {
    id: 'result',
    label: '工作流输出',
    dataType: DATA_TYPE_KINDS.JSON,
    multiple: true,
  },
})
```

后续如果 Workflow 的公开输入输出模型稳定，再根据目标 Workflow 动态生成端口。

NodeType 组合写入：

`packages/workflow-core/src/nodes/workflow/index.ts`

```ts
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { workflowNodeDefinition } from './definition'
import { workflowNodeSchema } from './schema'

export const workflowNode = {
  schema: workflowNodeSchema,
  definition: workflowNodeDefinition,
  createInitialConfig: () => createInitialConfig(workflowNodeSchema, {
    workflowId: '',
  }),
} satisfies NodeType<typeof workflowNodeSchema>

export type { WorkflowNodeConfig } from './schema'
```

### 18.3 Resolver 和 Executor

Resolver 接口写入：

`packages/workflow-runtime/src/contracts/workflow-resolver.ts`

```ts
export interface WorkflowResolver {
  resolve(workflowId: string): Promise<Workflow>
}
```

执行器写入：

`packages/workflow-runtime/src/nodes/workflow-executor.ts`

```ts
interface WorkflowExecutorContext {
  workflowResolver: WorkflowResolver
  graphExecutor: GraphExecutor
  callStack: readonly string[]
}

export const executeWorkflowNode = async (
  node: WorkflowNode,
  inputs: Record<string, unknown>,
  context: WorkflowExecutorContext,
): Promise<NodeExecutionOutput> => {
  const config = workflowNodeSchema.parse(node.config)

  if (context.callStack.includes(config.workflowId)) {
    throw new Error(`检测到子工作流递归调用：${config.workflowId}`)
  }

  const childWorkflow = await context.workflowResolver.resolve(config.workflowId)

  const result = await context.graphExecutor.executeWorkflow(
    childWorkflow,
    inputs.input,
    {
      callStack: [...context.callStack, config.workflowId],
    },
  )

  return {
    outputs: {
      result,
    },
  }
}
```

Workflow Node 在 Loop 内时仅多出：

```ts
parentId: 'loop-1'
```

它的 Schema、端口、Resolver 和 Executor 都不需要因为 Loop 改变。

## 19. 运行流程示例

本节是行为说明，不需要单独创建文件。对应实现主要位于：

- `packages/workflow-runtime/src/executor/graph-executor.ts`
- `packages/workflow-runtime/src/nodes/loop-executor.ts`
- `packages/workflow-runtime/src/nodes/loop-start-executor.ts`
- `packages/workflow-runtime/src/nodes/loop-exit-executor.ts`
- `packages/workflow-runtime/src/nodes/workflow-executor.ts`

```text
主工作流 Start
  ↓
Loop(input)
  ├─ 第 0 轮
  │   ├─ Loop Start(input, iteration=0)
  │   ├─ LLM
  │   ├─ Condition
  │   └─ 未激活 Loop Exit
  ├─ 第 1 轮
  │   ├─ Loop Start(input, iteration=1)
  │   ├─ Workflow Node
  │   │   └─ 执行独立子 Workflow
  │   └─ 未激活 Loop Exit
  └─ 第 2 轮
      ├─ Loop Start(input, iteration=2)
      ├─ Condition
      └─ Loop Exit(result)
          ↓
Loop 输出：
{
  reason: 'exit',
  iterations: 3,
  value: result
}
```

如果一直没有激活 Loop Exit：

```ts
{
  reason: 'max_iterations',
  iterations: 100,
}
```

## 20. V1 实现顺序

本节是实施顺序，不对应单个文件。涉及文件可按以下范围查找：

- Core：`packages/workflow-core/src/node`、`packages/workflow-core/src/nodes`、`packages/workflow-core/src/validate`
- Web：`apps/web/src/components/workflow`、`apps/web/src/features/workflow`、`apps/web/src/utils/workflow`
- Runtime：`packages/workflow-runtime/src`

建议严格按以下顺序完成：

1. 补全 Loop、Loop Start、Loop Exit 的 NodeType、注册和公开导出。
2. 完成 `parentId` 的 Core Schema 与 Web 双向转换。
3. 完成 Loop 结构校验和边作用域校验。
4. 实现创建 Loop 三件套。
5. 实现递归删除和系统节点删除保护。
6. 实现 Loop 容器渲染。
7. 实现 Loop 内添加普通节点。
8. 实现嵌套 Loop 创建和布局尺寸持久化。
9. 实现最小 GraphExecutor。
10. 实现 Loop Start、Loop Exit 和 Loop Executor。
11. 实现 Workflow Node Resolver 和 Executor。
12. 最后增加配置表单、运行状态和错误展示。

## 21. V1 验收条件

本节是验收清单，不需要创建新文件。

### Core

- Loop Schema 能校验 `maxIterations`。
- Loop、Loop Start 和 Loop Exit 全部注册。
- 每个 Loop 必须恰好包含一个直接子级 Loop Start 和 Loop Exit。
- Loop Start/Exit 不能出现在根作用域。
- 普通 Start/End 不能出现在 Loop 内。
- 父节点不存在或不是 Loop 时保存失败。
- 父子关系出现循环时保存失败。
- 跨 Loop 作用域连线时保存失败。
- 嵌套 Loop 的父子结构能通过校验。
- Workflow Node 作为 Loop 子节点时能通过校验。

### Web

- 添加 Loop 时自动创建 Loop Start 和 Loop Exit。
- Loop Start 和 Loop Exit 不能单独删除。
- 删除 Loop 时递归删除全部后代和相关边。
- 可以在 Loop 内添加普通节点、Loop 和 Workflow Node。
- 保存和重新加载后 `parentId`、相对坐标和容器尺寸不丢失。
- 根节点菜单不展示 Loop Start 和 Loop Exit。
- Loop 内节点菜单不展示主工作流 Start 和 End。

### Runtime

- Loop Start 每轮输出原始输入和当前索引。
- 未到达 Loop Exit 时自动开始下一轮。
- 到达 Loop Exit 时结束最近一层 Loop。
- 达到最大次数时返回 `max_iterations`。
- 内层 Loop Exit 不会退出外层 Loop。
- Loop 内的 Workflow Node 能加载并执行独立子 Workflow。
- 子 Workflow 自调用或间接递归调用能被阻止。

## 22. 后续扩展边界

本节是后续规划，不需要创建新文件。

V1 稳定后可以逐步增加：

- `state`：把上一轮结果传给下一轮。
- `break` 与 `continue` 两种控制节点。
- 多个 Loop Exit。
- 并行循环与并发数。
- 单轮超时和整体超时。
- 错误策略与重试。
- 拖入、拖出和自动扩容。
- Loop 折叠与展开。
- 动态 Workflow Node 输入输出端口。
- 子 Workflow 版本锁定。
- Loop 运行进度与逐轮日志。

这些扩展都不需要改变 V1 的核心模型：

```text
Workflow.nodes + Workflow.edges + WorkflowNode.parentId
```

因此 V1 可以作为后续能力的稳定基础。
