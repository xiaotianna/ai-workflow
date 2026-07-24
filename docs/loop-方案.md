对，你理解得很接近：它们在执行层面都可以抽象成“可执行子图”，但在数据归属上不是同一种东西。

你截图里的 Dify Loop 更准确地说是“容器节点 + 内联子图”，不是独立保存的子工作流。

| 类型              | 数据归属                     | 是否独立保存 | 是否可复用 |
| ----------------- | ---------------------------- | -----------: | ---------: |
| Loop 内自定义节点 | 属于当前工作流、归 Loop 管理 |           否 |         否 |
| 子工作流节点      | 引用另一个 Workflow          |           是 |         是 |
| Runtime 视角      | 都可以编译成可执行图         |            — |          — |

最合适的设计是：Loop 永远是一个容器，里面可以添加普通节点，也可以添加一个 `workflow` 子工作流节点。这样不需要让 Loop 自己支持两套完全不同的执行模型。

## 截图里的结构是什么

可以理解成：

```text
主工作流
├─ Start
├─ Loop（复合/容器节点）
│  ├─ Loop Start（系统生成，不可删除）
│  ├─ HTTP
│  ├─ LLM
│  └─ Workflow Node（也可以引用独立子工作流）
└─ End
```

Loop 内部那些 HTTP、LLM 节点仍然可以保存在主工作流的 `nodes` 中，只需要增加所属容器信息：

```ts
{
  id: 'http-1',
  type: 'http',
  parentId: 'loop-1',
  config: {
    url: 'https://example.com'
  }
}
```

所以完整数据可以是：

```ts
{
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
        mode: 'sequential',
        maxIterations: 1000,
        concurrency: 1,
        output: {
          nodeId: 'http-1',
          portId: 'response',
          path: [],
        },
      },
    },
    {
      id: 'loop-start-1',
      type: 'loop-start',
      parentId: 'loop-1',
      config: {},
    },
    {
      id: 'http-1',
      type: 'http',
      parentId: 'loop-1',
      config: {
        url: 'https://example.com',
        method: 'POST',
      },
    },
    {
      id: 'workflow-1',
      type: 'workflow',
      parentId: 'loop-1',
      config: {
        workflowId: 'process-item-workflow',
      },
    },
  ],
  edges: [
    // 外层边
    {
      id: 'start-loop',
      source: 'start-1',
      sourceHandle: 'variables',
      target: 'loop-1',
      targetHandle: 'items',
    },

    // Loop 内部边
    {
      id: 'loop-start-http',
      source: 'loop-start-1',
      sourceHandle: 'item',
      target: 'http-1',
      targetHandle: 'input',
    },
    {
      id: 'http-workflow',
      source: 'http-1',
      sourceHandle: 'response',
      target: 'workflow-1',
      targetHandle: 'input',
    },
  ],
}
```

这样，“Loop 中执行子工作流”只是：

```text
Loop
└─ Workflow Node
```

而“Loop 中执行自定义节点”则是：

```text
Loop
├─ HTTP
├─ LLM
└─ Code
```

两者不用在 Loop 配置里做复杂的 `body.kind` 分支。

## 目前只定义 Loop 节点够不够

不够。

只增加：

- `loop/schema.ts`
- `loop/definition.ts`
- `loop/index.ts`
- 注册 `loopNode`

只能得到一个普通的 Loop 卡片，无法得到截图里这种可以放置子节点的容器。

你当前的 `WorkflowNode` 只有 `id/type/config`，[workflow-node-schema.ts](/Users/lantianyu/Desktop/ai-workflow/packages/workflow-core/src/node/workflow-node-schema.ts:19) 没有父子关系；画布转换也只保留普通节点位置，[editor-transform.ts](/Users/lantianyu/Desktop/ai-workflow/apps/web/src/utils/workflow/editor-transform.ts:14) 会丢掉所有嵌套信息。

要做到截图效果，需要额外改造以下部分。

## 1. Core：增加节点作用域

建议在领域节点上增加：

```ts
export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),

  // 运行时需要知道节点属于哪个复合节点，因此不只是 UI 布局数据
  parentId: z.string().min(1).optional(),

  config: z.record(z.string(), z.unknown()).default({})
})
```

这里的 `parentId` 必须放在 Core，不能只放在 Web 的 layout 中，因为 Runtime 也需要通过它筛选 Loop 内部节点。

还要增加层级校验：

- `parentId` 指向的节点必须存在。
- 父节点必须是 Loop 等复合节点。
- 节点不能把自己作为父节点。
- 父子层级不能形成循环。
- 删除 Loop 时同时删除其内部节点和内部边。
- 外部节点不能绕过 Loop 直接连接内部节点。
- 内部节点不能直接连接外部节点。

## 2. Core：增加 Loop Start

截图里左侧的小房子可以看作 `loop-start` 系统节点，它为每一轮提供：

```ts
outputs: {
  item: {
    label: '当前项目',
    dataType: DATA_TYPE_KINDS.JSON,
  },
  index: {
    label: '当前索引',
    dataType: DATA_TYPE_KINDS.NUMBER,
  },
}
```

它类似普通工作流的 Start，但作用域仅限当前 Loop：

```ts
{
  id: 'loop-start-1',
  type: 'loop-start',
  parentId: 'loop-1',
  config: {},
}
```

建议显式保存这个节点，因为内部边需要一个稳定的 `source` 和 `sourceHandle`。

## 3. Web：支持 React Flow 子节点

好消息是你现在使用的 `@xyflow/react@12.11.2` 已经支持：

```ts
{
  parentId: 'loop-1',
  extent: 'parent',
  expandParent: true,
}
```

画布节点大致会转换为：

```ts
{
  id: 'http-1',
  type: 'http',
  parentId: 'loop-1',
  extent: 'parent',
  expandParent: true,
  position: {
    // 相对于 Loop 容器的位置
    x: 120,
    y: 100,
  },
  data: {...},
}
```

但当前的 [toCanvasNodes()](/Users/lantianyu/Desktop/ai-workflow/apps/web/src/utils/workflow/editor-transform.ts:14) 和 [toWorkflowNode()](/Users/lantianyu/Desktop/ai-workflow/apps/web/src/utils/workflow/editor-transform.ts:24) 都没有处理 `parentId`，需要一起升级。

还需要处理：

- 在 Loop 内点击“添加节点”时自动设置 `parentId`。
- 外部节点拖入 Loop 时转换为父节点相对坐标。
- 子节点拖出 Loop 时移除 `parentId` 并恢复绝对坐标。
- Loop 子节点必须排在父节点之后传给 React Flow。
- Loop 自动扩容或者使用固定尺寸。
- 删除 Loop 时级联删除子节点。
- 保存 Loop 宽高和子节点相对位置。
- MiniMap 对容器节点做单独处理。
- 折叠/展开使用 Motion 过渡。

## 4. Nodes UI：不能继续只用普通 BaseNode

当前 [BaseNode](/Users/lantianyu/Desktop/ai-workflow/packages/workflow-nodes-ui/src/components/base-node/base-node.tsx:44) 固定为：

```ts
<div className="... w-60 rounded-2xl ...">
```

而且 `NodeContentComponent` 只负责普通节点卡片内部内容，不能控制整个节点外壳。

因此 Loop 不能简单注册一个 `LoopNodeContent` 就结束。需要让渲染契约区分：

```ts
interface NodeDefinition {
  type: string
  label: string
  presentation?: 'standard' | 'container'
}
```

或者更加解耦：

```ts
interface NodeUIRegistration {
  type: string
  component: NodeContentComponent
  renderer?: NodeRendererComponent
}
```

普通节点继续走 `BaseNode`，Loop 走专门的 `LoopContainerNode`：

```tsx
function WorkflowNode(props: NodeProps<WorkflowCanvasNode>) {
  if (props.type === 'loop') {
    return <LoopContainerNode {...props} />
  }

  return <RenderNode ... />
}
```

不建议把 Loop 容器硬塞进现有 `BaseNode`，因为普通节点和容器节点的尺寸、选中态、拖拽区域、端口位置、子内容布局都不一样。

## 5. 校验：Loop 内外需要分别处理

当前执行校验会把所有节点组成一个全局拓扑，并拒绝任何环形依赖。

如果内部节点也放在顶层 `nodes/edges`，应当先按照 `parentId` 分组：

```ts
const rootGraph = {
  nodes: workflow.nodes.filter((node) => !node.parentId),
  edges: rootEdges
}

const loopBodyGraph = {
  nodes: workflow.nodes.filter((node) => node.parentId === loopNode.id),
  edges: internalEdges
}
```

然后分别校验：

```ts
validateGraph(rootGraph)
validateGraph(loopBodyGraph)
```

外层拓扑只把整个 Loop 当成一个原子节点，不能把 Loop 子节点一起参与外层拓扑排序。

不需要创建“子节点末尾连回 Loop”的循环边。Runtime 每轮重新执行一次 Loop 内部的无环子图即可。

## 6. Runtime：需要复合节点执行能力

当前 Runtime 还没有完整执行器，所以真正执行还需要明显改造。

建议统一成：

```ts
interface ExecutableGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  outputs: OutputDefinition[]
}

interface GraphExecutor {
  execute(
    graph: ExecutableGraph,
    inputs: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>>
}
```

Loop 执行器可以提取自己的子图：

```ts
async function executeLoopNode(node, input, context) {
  const body = context.graph.getChildGraph(node.id)

  const results = []

  for (const [index, item] of input.items.entries()) {
    const result = await context.graphExecutor.execute(
      body,
      {
        item,
        index
      },
      context.createChildScope({
        loopNodeId: node.id,
        iterationIndex: index
      })
    )

    results.push(result)
  }

  return {
    results
  }
}
```

子工作流节点也使用同一个执行器：

```ts
async function executeWorkflowNode(node, input, context) {
  const workflow = await context.workflowResolver.resolve(
    node.config.workflowId
  )

  return context.graphExecutor.execute(
    workflow,
    input,
    context.createChildScope({
      workflowId: workflow.id
    })
  )
}
```

所以你的判断没错：Runtime 最终可以把“Loop 内联子图”和“独立子工作流”统一为 `ExecutableGraph`；区别只是子图的来源与生命周期。

## 推荐落地顺序

这不是特别难，但以当前基础来看属于中等偏大的模型升级，不是只补一个节点定义。

建议分四期：

1. Core 先增加复合节点基础能力：`parentId`、Loop、Loop Start、作用域校验。
2. Web 实现静态容器和子节点添加、拖动、删除、保存。
3. 完善内外边界校验、Loop 输出选择和变量作用域。
4. Runtime 实现子图执行，再复用它实现 Workflow Node。

最核心的设计结论是：

> Loop 是“拥有内联子图的复合节点”；Workflow Node 是“引用独立工作流的普通节点”。两者在 Runtime 中都执行一个 Graph，但在 Core 的所有权和持久化模型中必须区分。

所以 Loop 内既允许普通节点，也允许 Workflow Node，是最自然、扩展性也最好的方案。没有修改任何代码。
