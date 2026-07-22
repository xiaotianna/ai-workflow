# 前端工作流编辑器架构指南

## 1. 目标与结论

本文用于指导 `apps/web` 实现工作流编辑器，并明确它与工作流领域包、未来服务端和运行时的边界。

当前仓库已经具备工作流领域模型、节点注册、端口解析、保存校验和节点 UI 渲染能力，但 Web 编辑器仍处于骨架阶段，服务端与 Runtime 也尚未初始化。因此现阶段应先完成一个可编辑、可校验、可保存到上层回调的前端 MVP，不应提前依赖尚不存在的接口或 package API。

核心结论：

- 工作流编辑器属于单一业务域，应放在 `apps/web/src/features/workflow`，不长期保留在跨业务组件目录 `apps/web/src/components`。
- `@ai-workflow/core` 是节点、端口和工作流校验的唯一事实来源。
- `@ai-workflow/nodes-ui` 负责节点外壳和节点内容，Web 只适配 React Flow 的画布与 Handle。
- Core `Workflow` 只保存可执行领域数据，节点坐标和视口作为编辑器布局独立保存。
- `/app/:id/workflow` 中的 `id` 是应用 ID，不等同于 `Workflow.id`。
- 浏览器负责交互反馈，保存和运行场景最终都必须由服务端重新校验。

## 2. 当前仓库现状

| 范围                    | 当前状态                                                                      | 架构判断                                                           |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 路由                    | 已有 `/app/:id/workflow`，页面位于 `apps/web/src/pages/app/workflow.tsx`      | 页面只应读取 `appId`、处理页面级加载状态并组合 Feature             |
| Web 编辑器              | 文件实际位于 `apps/web/src/components/workflow`，画布、节点和 Handle 均未完成 | 实现时迁移到 `features/workflow`，避免把单业务能力放到跨业务组件层 |
| `@ai-workflow/core`     | 已有 `Workflow`、节点注册表、端口解析、保存校验和执行前校验                   | 可作为编辑器领域数据和规则来源                                     |
| `@ai-workflow/nodes-ui` | 已有 `RenderNode`、`BaseNode`、UI 注册表和 `renderPort` 扩展点                | 可直接接入 React Flow，不在 Web 重写节点外壳                       |
| `@ai-workflow/form`     | 根入口为空                                                                    | 暂不导入，配置面板先留在 Workflow Feature                          |
| `@ai-workflow/shared`   | 只有占位导出                                                                  | 前后端协议稳定后再放入，不提前编造 DTO                             |
| `@ai-workflow/runtime`  | 仍为占位包                                                                    | Web 不依赖 Runtime，运行能力等待服务端接入                         |
| `apps/server`           | 尚未初始化                                                                    | 本文只定义目标边界，不把接口描述为当前已有能力                     |

当前正式注册的内置节点只有：

- `start`：无输入端口，固定输出 `variables`。
- `condition`：固定输入 `entry`，输出端口由 `conditions[].portId` 动态生成。

`end`、`http`、`llm` 的草稿文件没有加入 `BuiltinNodeType` 和 `nodeRegistry`，节点面板不得展示它们。

## 3. 目标分层

```text
pages/app/workflow.tsx
        │ appId、页面加载/错误状态
        ▼
features/workflow
        │ 编辑状态、画布交互、配置、保存编排
        ├──────────────► @xyflow/react
        │                坐标、选择、拖拽、缩放、连线
        ├──────────────► @ai-workflow/nodes-ui
        │                节点外壳、节点内容、端口遍历
        └──────────────► @ai-workflow/core
                         节点注册、配置 schema、端口、工作流校验

未来：features/workflow ──HTTP──► apps/server ──► @ai-workflow/runtime
```

### 各层职责

| 层级                           | 负责                                                                  | 不负责                                   |
| ------------------------------ | --------------------------------------------------------------------- | ---------------------------------------- |
| `pages/app/workflow.tsx`       | 读取 `appId`，处理页面级加载、未找到和权限状态，组合 Workflow Feature | 节点渲染、连线规则、配置表单细节         |
| `features/workflow`            | 编辑器状态、React Flow 适配、节点增删、连线、选择、配置草稿、保存编排 | 路由定义、跨业务全局状态、服务端执行实现 |
| `@ai-workflow/core`            | Workflow、NodeType、schema、端口、节点注册和业务校验                  | React、坐标、视口、网络请求              |
| `@ai-workflow/nodes-ui`        | 节点通用外壳、节点内容、图标、端口遍历、UI 注册                       | React Flow 状态、Handle 实现、保存和运行 |
| `apps/server`（未来）          | 鉴权、DTO、结构与业务复验、版本控制、持久化、运行用例                 | 浏览器画布交互                           |
| `@ai-workflow/runtime`（未来） | 执行计划、节点执行器、依赖调度、重试、取消和运行上下文                | HTTP、React、数据库模型                  |

依赖方向必须保持为应用依赖 packages，packages 不得反向依赖 `apps/*`。所有 workspace package 都从 `package.json#exports` 的公开入口导入。

## 4. 推荐目录

当前三个工作流文件在 `apps/web/src/components/workflow`。开始正式实现时，建议一次性迁移为：

```text
apps/web/src/features/workflow/
├── workflow-editor.tsx        # 编辑器壳：工具区、画布、配置区和保存状态
├── workflow-canvas.tsx        # React Flow 受控画布与交互事件
├── workflow-node.tsx          # RenderNode 的 React Flow 适配
├── workflow-node-handle.tsx   # NodePortRenderProps 到 Handle 的适配
├── workflow-config-panel.tsx  # 节点配置草稿、schema 校验和提交
├── workflow-editor-model.ts   # 数据转换和纯规则辅助函数
├── types.ts                   # Feature 内跨文件共享的必要类型
└── index.ts                   # Feature 对外入口
```

先保持这一层粒度即可。节点面板、配置面板或数据访问逻辑只有在文件明显变复杂、出现独立复用或服务端真正接入时再拆分，不预建空目录。

页面只能通过 `@/features/workflow` 根入口使用编辑器，不深层导入内部文件。

## 5. 数据模型与状态归属

### 5.1 领域数据与布局分离

Core 的 `WorkflowNode` 不包含坐标，不能把 React Flow 的 `position`、`selected`、`measured` 等字段写入 `node.config` 或 Core schema。

Web Feature 可先定义本地编辑文档：

```ts
import type { Workflow } from '@ai-workflow/core'

interface WorkflowEditorDocument {
  workflow: Workflow
  layout: {
    positions: Record<string, { x: number; y: number }>
    viewport?: { x: number; y: number; zoom: number }
  }
}
```

- `workflow` 是可交给 Core 校验并最终交给 Runtime 的领域数据。
- `layout` 只负责恢复编辑体验，不参与工作流执行。
- 在 Web 内部可以使用 React Flow 的 `XYPosition` 和 `Viewport`；成为前后端协议时应使用上面的纯 JSON 结构，避免 Shared 依赖画布库。
- 该协议只有在 Server 和 Web 同时真实使用后，才迁移到 `@ai-workflow/shared`。

### 5.2 路由 ID 与工作流 ID

当前路由是 `/app/:id/workflow`，所以页面拿到的是 `appId`。未来加载关系应是“根据应用 ID 获取该应用的当前工作流”，而不是直接执行：

```ts
workflow.id = appId
```

一个应用可以拥有当前草稿、已发布版本和历史版本，`Workflow.id` 应保留为工作流定义自身的 ID。

### 5.3 编辑器状态

MVP 使用 Feature 内局部状态即可，不需要提前引入全局状态库。至少维护：

- React Flow 的 nodes、edges 和 viewport。
- 当前选中节点 ID。
- 配置面板草稿与字段错误。
- `dirty`、`saving` 和保存错误状态。
- 最近一次成功加载或保存的文档快照，用于取消修改或判断未保存状态。

编辑期间只让节点转换为 React Flow nodes；边始终保持 Core `WorkflowEdge[]`。保存时还原 Core 节点并直接使用边状态，不要维护两份需要 Effect 双向同步的完整工作流数据。

路由中的 `appId` 变化时应重建编辑会话，避免把上一个应用的局部状态带入下一个应用。可以由页面用带 `key={appId}` 的内部组件实现，而不是用多个 Effect 手工重置。

## 6. Core 与 Nodes UI 的正确接入

### 6.1 节点与端口

节点列表来自：

```ts
const availableNodeTypes = nodeRegistry.list()
```

创建节点时必须调用对应 NodeType 的工厂：

```ts
const nodeType = nodeRegistry.getOrThrow(type)

const node = {
  id: crypto.randomUUID(),
  type: nodeType.definition.type,
  config: nodeType.createInitialConfig(),
}
```

不要在 Web 复制默认配置，也不要直接把 `definition.ports` 当作最终端口。静态节点和动态节点统一使用：

```ts
const ports = getNodePorts(nodeType, node.config)
```

调用 `getNodePorts` 前要确保配置已经通过对应 `nodeType.schema`。当前实现内部使用 `schema.parse()`，无效草稿会抛错，所以配置表单草稿不能在每次输入时直接写入画布节点。

### 6.2 节点渲染

Web 的 `WorkflowNode` 只做 React Flow 到 Nodes UI 的适配：

```text
React Flow Node
    ↓
WorkflowNode（Web）
    ↓
RenderNode（nodes-ui）
    ↓
getNodePorts（core）
    ↓
BaseNode / NodeContent / NodePortsRender
    ↓
WorkflowNodeHandle（Web 注入）
```

`WorkflowNodeHandle` 必须保持 `Handle.id === portId`：

```tsx
<Handle
  id={portId}
  type={direction === 'input' ? 'target' : 'source'}
  position={direction === 'input' ? Position.Left : Position.Right}
/>
```

这样 React Flow 的 `sourceHandle`、`targetHandle` 才能直接保存为 Core 的 `WorkflowEdge`。Web 不再遍历并绘制第二套端口。

### 6.3 校验边界

保存前的权威校验顺序是：

```ts
const parsed = workflowSchema.safeParse(rawWorkflow)

if (!parsed.success) {
  return parsed.error.issues
}

const issues = validateWorkflow(parsed.data, nodeRegistry)
```

`validateWorkflow` 已覆盖节点和边 ID、节点注册、节点配置、端口存在性、数据类型、重复连线和 `multiple` 限制。

React Flow 的拖线反馈可以做轻量预判，但不能在 Web 长期复制一套完整校验器。当前 Core 尚未公开单条连线校验 API，MVP 可以把候选边临时追加到 Workflow 后调用 `validateWorkflow`，并读取该候选边 ID 对应的问题；如果后续需要更高频、更精细的反馈，应在 Core 增加正式的连接校验入口，再由 Web 复用。

执行前使用 `validateExecutorWorkflow`，它还会校验必填输入和循环依赖。该校验应在服务端执行，不能因为浏览器已经校验就省略。

## 7. 按文件实现示例

下面是一套与当前公共 API 对齐的前端 MVP 示例。示例包含节点渲染、节点新增和删除、画布移动、连线、JSON 配置草稿、动态端口清理、保存校验和页面接入。

示例中的保存仍然是页面内存回写，因为 `apps/server` 尚未初始化。未来接入接口时只替换页面的数据加载和 `onSave`，不改变编辑器内部边界。

### 7.1 `types.ts`

路径：`apps/web/src/features/workflow/types.ts`

作用：只保存 Workflow Feature 内确实需要跨文件共享的编辑文档和画布节点类型。画布节点的外层 `id/type` 直接复用 Core 节点标识，`data` 只保存节点 `config`。边在编辑、校验和保存阶段都直接使用 Core `WorkflowEdge`，不再定义画布边类型。

```ts
import type { Workflow, WorkflowNode } from '@ai-workflow/core'
import type { Node, Viewport, XYPosition } from '@xyflow/react'

export interface WorkflowEditorDocument {
  workflow: Workflow
  layout: {
    positions: Record<string, XYPosition>
    viewport?: Viewport
  }
}

export interface WorkflowCanvasNode extends Node<WorkflowNode['config']> {
  type: WorkflowNode['type']
}
```

这些类型属于 React Flow 编辑器适配，不应放入 Core。`WorkflowCanvasNode.id` 就是 Core 节点 ID，`WorkflowCanvasNode.type` 就是 `start`、`condition` 等 Core 节点类型，`data` 只承载配置，因此不存在重复的 ID 或类型。未来形成前后端协议时，只把不依赖 React Flow 的文档 DTO 下沉到 Shared。

最终画布节点结构如下：

```ts
const node: WorkflowCanvasNode = {
  id: 'start-1',
  type: 'start',
  position: { x: 100, y: 100 },
  data: {
    variables: [],
  },
}
```

### 7.2 `workflow-editor-model.ts`

路径：`apps/web/src/features/workflow/workflow-editor-model.ts`

作用：只处理 Core Workflow 与画布数据之间的转换、节点创建、候选连线校验和动态端口清理。类型从 `types.ts` 引入，避免模型逻辑和类型声明堆在一起。

```ts
import {
  conditionNode,
  getNodePorts,
  nodeRegistry,
  startNode,
  validateWorkflow,
  workflowSchema,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '@ai-workflow/core'
import type { Connection, Viewport, XYPosition } from '@xyflow/react'

import type { WorkflowCanvasNode, WorkflowEditorDocument } from './types'

const CANDIDATE_EDGE_ID = '__candidate-edge__'

export function createDemoWorkflowDocument(appId: string): WorkflowEditorDocument {
  const workflowId = crypto.randomUUID()
  const startId = crypto.randomUUID()
  const conditionId = crypto.randomUUID()

  return {
    workflow: {
      id: workflowId,
      name: '未命名工作流',
      description: `应用 ${appId} 的本地演示工作流`,
      nodes: [
        {
          id: startId,
          type: startNode.definition.type,
          config: startNode.createInitialConfig(),
        },
        {
          id: conditionId,
          type: conditionNode.definition.type,
          config: conditionNode.createInitialConfig(),
        },
      ],
      edges: [
        {
          id: crypto.randomUUID(),
          source: startId,
          sourceHandle: 'variables',
          target: conditionId,
          targetHandle: 'entry',
        },
      ],
    },
    layout: {
      positions: {
        [startId]: { x: 120, y: 180 },
        [conditionId]: { x: 460, y: 180 },
      },
    },
  }
}

export function toCanvasNodes(document: WorkflowEditorDocument): WorkflowCanvasNode[] {
  return document.workflow.nodes.map((workflowNode, index) => ({
    id: workflowNode.id,
    type: workflowNode.type,
    position: document.layout.positions[workflowNode.id] ?? {
      x: 120 + (index % 3) * 320,
      y: 120 + Math.floor(index / 3) * 220,
    },
    data: workflowNode.config,
  }))
}

export function toWorkflow(
  baseWorkflow: Workflow,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
): Workflow {
  return {
    ...baseWorkflow,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      config: node.data,
    })),
    edges: [...edges],
  }
}

export function toEditorLayout(
  nodes: readonly WorkflowCanvasNode[],
  viewport: Viewport | undefined,
): WorkflowEditorDocument['layout'] {
  return {
    positions: Object.fromEntries(nodes.map((node) => [node.id, node.position])),
    ...(viewport ? { viewport } : {}),
  }
}

export function createCanvasNode(type: string, position: XYPosition): WorkflowCanvasNode {
  const nodeType = nodeRegistry.getOrThrow(type)
  return {
    id: crypto.randomUUID(),
    type: nodeType.definition.type,
    position,
    data: nodeType.createInitialConfig(),
  }
}

export function createWorkflowEdge(connection: Connection): WorkflowEdge | undefined {
  if (!connection.sourceHandle || !connection.targetHandle) return undefined

  return {
    id: crypto.randomUUID(),
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
  }
}

export function canConnect(
  connection: Connection | WorkflowEdge,
  baseWorkflow: Workflow,
  nodes: readonly WorkflowCanvasNode[],
  edges: readonly WorkflowEdge[],
): boolean {
  const { source, sourceHandle, target, targetHandle } = connection

  if (!sourceHandle || !targetHandle || source === target) return false

  const sourceNode = nodes.find((node) => node.id === source)
  const targetNode = nodes.find((node) => node.id === target)

  if (!sourceNode || !targetNode) return false

  const sourceType = nodeRegistry.get(sourceNode.type)
  const targetType = nodeRegistry.get(targetNode.type)

  if (!sourceType || !targetType) return false
  if (!sourceType.schema.safeParse(sourceNode.data).success) return false
  if (!targetType.schema.safeParse(targetNode.data).success) return false

  const candidateEdge: WorkflowEdge = {
    id: CANDIDATE_EDGE_ID,
    source,
    sourceHandle,
    target,
    targetHandle,
  }
  const candidateWorkflow = toWorkflow(baseWorkflow, nodes, [...edges, candidateEdge])
  const parsed = workflowSchema.safeParse(candidateWorkflow)

  if (!parsed.success) return false

  return !validateWorkflow(parsed.data, nodeRegistry).some(
    (issue) => issue.scope === 'edge' && issue.edgeId === CANDIDATE_EDGE_ID,
  )
}

export function removeDanglingEdges(
  node: WorkflowNode,
  edges: readonly WorkflowEdge[],
): WorkflowEdge[] {
  const nodeType = nodeRegistry.get(node.type)

  if (!nodeType) return [...edges]

  const parsedConfig = nodeType.schema.safeParse(node.config)

  if (!parsedConfig.success) return [...edges]

  const ports = getNodePorts(nodeType, parsedConfig.data)

  return edges.filter((edge) => {
    if (edge.source === node.id && !ports.outputs[edge.sourceHandle]) return false
    if (edge.target === node.id && !ports.inputs[edge.targetHandle]) return false
    return true
  })
}
```

关键点：

- `createDemoWorkflowDocument()` 只用于当前无服务端阶段，生成独立的 `Workflow.id`，没有把 `appId` 当工作流 ID。
- `canConnect()` 把候选边交给 `validateWorkflow()`，避免在 Web 长期复制 Core 的数据类型、重复连接和 `multiple` 规则。
- `toWorkflow()` 只转换画布节点；边状态本身就是纯 `WorkflowEdge`，可以直接进入 Core Workflow。

### 7.3 `workflow-node-handle.tsx`

路径：`apps/web/src/features/workflow/workflow-node-handle.tsx`

作用：把 Nodes UI 提供的通用端口参数适配成 React Flow Handle，保持 `portId` 与 `sourceHandle`、`targetHandle` 一致。

```tsx
import type { NodePortRenderProps } from '@ai-workflow/nodes-ui'
import { Handle, Position } from '@xyflow/react'

export function WorkflowNodeHandle({ direction, port, portId }: NodePortRenderProps) {
  return (
    <Handle
      id={portId}
      type={direction === 'input' ? 'target' : 'source'}
      position={direction === 'input' ? Position.Left : Position.Right}
      title={port.label ?? portId}
      className="!border-background !bg-primary"
    />
  )
}
```

### 7.4 `workflow-node.tsx`

路径：`apps/web/src/features/workflow/workflow-node.tsx`

作用：把 React Flow 节点数据交给 `@ai-workflow/nodes-ui`。节点外壳、节点内容和端口遍历继续由 Nodes UI 负责。

```tsx
import { nodeRegistry } from '@ai-workflow/core'
import { createBuiltinNodeUIRegistry, RenderNode } from '@ai-workflow/nodes-ui'
import type { NodeProps, NodeTypes } from '@xyflow/react'

import { WorkflowNodeHandle } from './workflow-node-handle'
import type { WorkflowCanvasNode } from './types'

const nodeUIRegistry = createBuiltinNodeUIRegistry(nodeRegistry)

export function WorkflowNode({ data, id, selected, type }: NodeProps<WorkflowCanvasNode>) {
  return (
    <RenderNode
      node={{ id, type, config: data }}
      nodeRegistry={nodeRegistry}
      uiRegistry={nodeUIRegistry}
      selected={selected}
      renderPort={(props) => <WorkflowNodeHandle {...props} />}
    />
  )
}

export const workflowNodeTypes = nodeRegistry.list().reduce<NodeTypes>((nodeTypes, nodeType) => {
  nodeTypes[nodeType.definition.type] = WorkflowNode
  return nodeTypes
}, {})
```

React Flow 会得到 `start`、`condition` 等多个 `nodeTypes` key，但它们都复用同一个 Web 适配组件。映射由 Core `nodeRegistry` 生成，不手写另一份节点类型清单。注册表定义在组件外部，避免每次渲染重新创建；Web 也不从 Nodes UI 的内部目录深层导入组件。

### 7.5 `workflow-config-panel.tsx`

路径：`apps/web/src/features/workflow/workflow-config-panel.tsx`

作用：在 `@ai-workflow/form` 尚未提供公共 API 时，提供最小可用的 JSON 配置编辑器。草稿先解析 JSON，再通过对应 NodeType schema 校验，成功后才写回画布节点。

```tsx
import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { useState, type FormEvent } from 'react'

interface WorkflowConfigPanelProps {
  node?: WorkflowNode
  onApply: (node: WorkflowNode) => void
}

interface WorkflowConfigFormProps {
  node: WorkflowNode
  onApply: (node: WorkflowNode) => void
}

function WorkflowConfigForm({ node, onApply }: WorkflowConfigFormProps) {
  const nodeType = nodeRegistry.get(node.type)
  const [draft, setDraft] = useState(() => JSON.stringify(node.config, null, 2))
  const [error, setError] = useState<string>()

  if (!nodeType) {
    return <p className="text-destructive text-sm">未知节点类型：{node.type}</p>
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let rawConfig: unknown

    try {
      rawConfig = JSON.parse(draft)
    } catch {
      setError('请输入合法的 JSON')
      return
    }

    const parsedConfig = nodeType.schema.safeParse(rawConfig)

    if (!parsedConfig.success) {
      setError(
        parsedConfig.error.issues
          .map((issue) => `${issue.path.join('.') || 'config'}：${issue.message}`)
          .join('；'),
      )
      return
    }

    const nextNode: WorkflowNode = {
      ...node,
      config: parsedConfig.data as WorkflowNode['config'],
    }

    setError(undefined)
    setDraft(JSON.stringify(nextNode.config, null, 2))
    onApply(nextNode)
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Field
        required
        label={`${nodeType.definition.label}配置`}
        description="修改动态分支名称时请保留原 portId"
        error={error}
      >
        <Textarea
          aria-label={`${nodeType.definition.label}配置 JSON`}
          aria-invalid={Boolean(error)}
          className="min-h-72 font-mono text-xs"
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </Form.Field>

      <Button type="submit" variant="confirm" size="sm">
        应用配置
      </Button>
    </Form>
  )
}

export function WorkflowConfigPanel({ node, onApply }: WorkflowConfigPanelProps) {
  if (!node) {
    return <p className="text-muted-foreground text-sm">请选择一个节点查看配置</p>
  }

  return <WorkflowConfigForm key={node.id} node={node} onApply={onApply} />
}
```

这里使用 `key={node.id}` 在切换节点时重建草稿，不需要用 Effect 手工同步选中节点与表单状态。后续 Form package 落地后，可以替换 JSON Textarea，但 `nodeType.schema.safeParse()` 和提交边界保持不变。

### 7.6 `workflow-canvas.tsx`

路径：`apps/web/src/features/workflow/workflow-canvas.tsx`

作用：作为受控 React Flow 画布，只负责渲染节点和边、转发画布事件，不承载保存、节点创建或配置校验。

```tsx
import type { WorkflowEdge } from '@ai-workflow/core'
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type DefaultEdgeOptions,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from '@xyflow/react'

import { workflowNodeTypes } from './workflow-node'
import type { WorkflowCanvasNode } from './types'

import '@xyflow/react/dist/style.css'

const defaultEdgeOptions = {
  type: 'smoothstep',
} satisfies DefaultEdgeOptions

interface WorkflowCanvasProps {
  nodes: WorkflowCanvasNode[]
  edges: WorkflowEdge[]
  initialViewport?: Viewport
  onNodesChange: (changes: NodeChange<WorkflowCanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void
  onConnect: (connection: Connection) => void
  isValidConnection: (connection: Connection | WorkflowEdge) => boolean
  onNodesDelete: (nodes: WorkflowCanvasNode[]) => void
  onSelectedNodeChange: (nodeId: string | undefined) => void
  onViewportChange: (viewport: Viewport, userInitiated: boolean) => void
}

export function WorkflowCanvas({
  edges,
  initialViewport,
  isValidConnection,
  nodes,
  onConnect,
  onEdgesChange,
  onNodesChange,
  onNodesDelete,
  onSelectedNodeChange,
  onViewportChange,
}: WorkflowCanvasProps) {
  return (
    <ReactFlow<WorkflowCanvasNode, WorkflowEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={workflowNodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      defaultViewport={initialViewport}
      fitView={!initialViewport}
      deleteKeyCode={['Backspace', 'Delete']}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onNodesDelete={onNodesDelete}
      onSelectionChange={({ nodes: selectedNodes }) =>
        onSelectedNodeChange(selectedNodes.at(-1)?.id)
      }
      onMoveEnd={(event, viewport) => onViewportChange(viewport, event !== null)}
      className="bg-muted/30"
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
```

`WorkflowEdge` 在编辑器状态中保持纯领域数据，`defaultEdgeOptions` 只在 React Flow 渲染边时临时补充 `smoothstep`，不会进入保存数据。`onMoveEnd` 会区分用户操作和 `fitView` 等程序化移动，避免编辑器初始化时被误标记为未保存。

如果未来需要展示运行状态、动画或错误颜色，应在 Canvas 内根据 `WorkflowEdge` 临时映射 React Flow edge view model；这些展示字段仍不写回 Workflow。

### 7.7 `workflow-editor.tsx`

路径：`apps/web/src/features/workflow/workflow-editor.tsx`

作用：维护完整编辑会话，组合节点面板、画布、配置面板、错误区和保存状态。React Flow nodes 与 Core `WorkflowEdge[]` 是编辑期间的主状态，保存时只需要还原 Core 节点。

```tsx
import {
  nodeRegistry,
  validateWorkflow,
  workflowSchema,
  type WorkflowEdge,
  type WorkflowNode,
} from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import {
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useUpdateNodeInternals,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from '@xyflow/react'
import { useState } from 'react'

import { WorkflowCanvas } from './workflow-canvas'
import { WorkflowConfigPanel } from './workflow-config-panel'
import {
  canConnect,
  createCanvasNode,
  createWorkflowEdge,
  removeDanglingEdges,
  toCanvasNodes,
  toEditorLayout,
  toWorkflow,
} from './workflow-editor-model'
import type { WorkflowCanvasNode, WorkflowEditorDocument } from './types'

interface WorkflowEditorProps {
  initialDocument: WorkflowEditorDocument
  onSave: (document: WorkflowEditorDocument) => void | Promise<void>
}

function hasNodeMutation(changes: readonly NodeChange<WorkflowCanvasNode>[]) {
  return changes.some(
    (change) =>
      change.type === 'add' ||
      change.type === 'remove' ||
      change.type === 'replace' ||
      change.type === 'position',
  )
}

function hasEdgeMutation(changes: readonly EdgeChange<WorkflowEdge>[]) {
  return changes.some(
    (change) => change.type === 'add' || change.type === 'remove' || change.type === 'replace',
  )
}

function WorkflowEditorSession({ initialDocument, onSave }: WorkflowEditorProps) {
  const [nodes, setNodes, applyNodeChanges] = useNodesState<WorkflowCanvasNode>(
    toCanvasNodes(initialDocument),
  )
  const [edges, setEdges, applyEdgeChanges] = useEdgesState<WorkflowEdge>([
    ...initialDocument.workflow.edges,
  ])
  const [viewport, setViewport] = useState<Viewport | undefined>(initialDocument.layout.viewport)
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const updateNodeInternals = useUpdateNodeInternals()

  const availableNodeTypes = nodeRegistry.list()
  const selectedCanvasNode = nodes.find((node) => node.id === selectedNodeId)
  const selectedNode: WorkflowNode | undefined = selectedCanvasNode
    ? {
        id: selectedCanvasNode.id,
        type: selectedCanvasNode.type,
        config: selectedCanvasNode.data,
      }
    : undefined

  function handleNodesChange(changes: NodeChange<WorkflowCanvasNode>[]) {
    applyNodeChanges(changes)
    if (hasNodeMutation(changes)) setDirty(true)
  }

  function handleEdgesChange(changes: EdgeChange<WorkflowEdge>[]) {
    applyEdgeChanges(changes)
    if (hasEdgeMutation(changes)) setDirty(true)
  }

  function handleAddNode(type: string) {
    const index = nodes.length
    const nextNode = createCanvasNode(type, {
      x: 120 + (index % 3) * 320,
      y: 120 + Math.floor(index / 3) * 220,
    })

    setNodes((currentNodes) => [...currentNodes, nextNode])
    setSelectedNodeId(nextNode.id)
    setDirty(true)
  }

  function handleConnect(connection: Connection) {
    if (!canConnect(connection, initialDocument.workflow, nodes, edges)) return

    const nextEdge = createWorkflowEdge(connection)
    if (!nextEdge) return

    setEdges((currentEdges) => [...currentEdges, nextEdge])
    setDirty(true)
  }

  function handleNodesDelete(deletedNodes: WorkflowCanvasNode[]) {
    const deletedNodeIds = new Set(deletedNodes.map((node) => node.id))

    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target),
      ),
    )

    if (selectedNodeId && deletedNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(undefined)
    }

    setDirty(true)
  }

  function handleDeleteSelectedNode() {
    if (!selectedNodeId) return

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNodeId))
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    )
    setSelectedNodeId(undefined)
    setDirty(true)
  }

  function handleApplyNode(nextNode: WorkflowNode) {
    setNodes((currentNodes) =>
      currentNodes.map((canvasNode) =>
        canvasNode.id === nextNode.id
          ? { ...canvasNode, type: nextNode.type, data: nextNode.config }
          : canvasNode,
      ),
    )
    setEdges((currentEdges) => removeDanglingEdges(nextNode, currentEdges))
    setDirty(true)

    requestAnimationFrame(() => updateNodeInternals(nextNode.id))
  }

  function handleViewportChange(nextViewport: Viewport, userInitiated: boolean) {
    setViewport(nextViewport)
    if (userInitiated) setDirty(true)
  }

  async function handleSave() {
    const rawWorkflow = toWorkflow(initialDocument.workflow, nodes, edges)
    const parsedWorkflow = workflowSchema.safeParse(rawWorkflow)

    if (!parsedWorkflow.success) {
      setErrors(
        parsedWorkflow.error.issues.map(
          (issue) => `${issue.path.join('.') || 'workflow'}：${issue.message}`,
        ),
      )
      return
    }

    const validationIssues = validateWorkflow(parsedWorkflow.data, nodeRegistry)

    if (validationIssues.length > 0) {
      setErrors(validationIssues.map((issue) => issue.message))
      return
    }

    setSaving(true)
    setErrors([])

    try {
      await onSave({
        workflow: parsedWorkflow.data,
        layout: toEditorLayout(nodes, viewport),
      })
      setDirty(false)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : '保存工作流失败'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border flex shrink-0 items-center justify-between gap-3 border-b p-3">
        <div className="flex flex-wrap items-center gap-2">
          {availableNodeTypes.map((nodeType) => (
            <Button
              key={nodeType.definition.type}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddNode(nodeType.definition.type)}
            >
              添加{nodeType.definition.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs" role="status">
            {dirty ? '有未保存修改' : '已保存'}
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!selectedNodeId}
            onClick={handleDeleteSelectedNode}
          >
            删除节点
          </Button>
          <Button
            type="button"
            variant="confirm"
            size="sm"
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </header>

      {errors.length > 0 ? (
        <ul
          className="text-destructive border-border shrink-0 border-b px-4 py-2 text-sm"
          role="alert"
        >
          {errors.map((error, index) => (
            <li key={`${error}-${index}`}>{error}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            initialViewport={initialDocument.layout.viewport}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            isValidConnection={(connection) =>
              canConnect(connection, initialDocument.workflow, nodes, edges)
            }
            onNodesDelete={handleNodesDelete}
            onSelectedNodeChange={setSelectedNodeId}
            onViewportChange={handleViewportChange}
          />
        </div>

        <aside className="border-border bg-background w-80 shrink-0 overflow-y-auto border-l p-4">
          <WorkflowConfigPanel node={selectedNode} onApply={handleApplyNode} />
        </aside>
      </div>
    </div>
  )
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorSession {...props} />
    </ReactFlowProvider>
  )
}
```

`ReactFlowProvider` 让编辑器可以使用 `useUpdateNodeInternals()`。条件配置改变 Handle 数量后，必须通知 React Flow 重新计算节点内部端口位置，否则旧连线位置可能不会及时更新。

### 7.8 `index.ts`

路径：`apps/web/src/features/workflow/index.ts`

作用：作为 Workflow Feature 的唯一公共入口，只暴露页面真正需要的编辑器组件、演示数据和文档类型。

```ts
export { WorkflowEditor } from './workflow-editor'
export { createDemoWorkflowDocument } from './workflow-editor-model'
export type { WorkflowEditorDocument } from './types'
```

### 7.9 `workflow.tsx`

路径：`apps/web/src/pages/app/workflow.tsx`

作用：读取路由中的应用 ID，并组合 Workflow Feature。示例使用局部状态模拟持久化；接入 Server 后，这里替换为加载和保存用例。

```tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  createDemoWorkflowDocument,
  WorkflowEditor,
  type WorkflowEditorDocument,
} from '@/features/workflow'

interface WorkflowPageSessionProps {
  appId: string
}

function WorkflowPageSession({ appId }: WorkflowPageSessionProps) {
  const [document, setDocument] = useState<WorkflowEditorDocument>(() =>
    createDemoWorkflowDocument(appId),
  )

  return <WorkflowEditor initialDocument={document} onSave={setDocument} />
}

export default function AppWorkflowPage() {
  const { id: appId } = useParams<{ id: string }>()

  if (!appId) {
    return (
      <div className="text-destructive p-6 text-sm" role="alert">
        缺少应用 ID
      </div>
    )
  }

  return <WorkflowPageSession key={appId} appId={appId} />
}
```

`key={appId}` 会在切换应用时重建完整编辑会话，避免上一个应用的 nodes、edges、配置草稿和 dirty 状态残留。

### 7.10 文件迁移说明

以上示例落地后，原有三个骨架文件的对应关系是：

| 当前文件                                                    | 新位置                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `apps/web/src/components/workflow/workflow-canvas.tsx`      | `apps/web/src/features/workflow/workflow-canvas.tsx`      |
| `apps/web/src/components/workflow/workflow-node.tsx`        | `apps/web/src/features/workflow/workflow-node.tsx`        |
| `apps/web/src/components/workflow/workflow-node-handle.tsx` | `apps/web/src/features/workflow/workflow-node-handle.tsx` |

迁移调用方后删除原骨架文件，不保留两套工作流组件入口。

## 8. 编辑器 MVP 核心功能

### 8.1 加载与空状态

- 根据 `appId` 加载编辑文档；服务端未实现前可由页面传入演示文档或内存数据。
- 对外部数据先执行 `workflowSchema.safeParse()`，非法数据展示可恢复错误，不直接让 `RenderNode` 接收无效配置。
- 没有工作流时创建合法的空 Workflow；是否自动放置开始节点属于产品规则，当前 Core 没有限制“必须且只能有一个 start”，不要只在 Web 私自增加该规则。

### 8.2 节点操作

- 节点面板只展示 `nodeRegistry.list()` 中的正式节点。
- 支持添加、选择、拖动和删除节点。
- 删除节点时同步删除所有引用该节点的边，并作为同一次编辑操作更新状态。
- 新节点配置来自 `createInitialConfig()`，坐标来自投放位置或稳定的默认布局。

### 8.3 连线操作

- 只允许输出 Handle 连接输入 Handle。
- 支持创建和删除边。
- 交互阶段提供可连接反馈，提交状态前做 Core 校验。
- 边必须保存完整的 `id`、`source`、`target`、`sourceHandle` 和 `targetHandle`。
- 不允许 Web 根据节点显示名称猜测端口 ID。

### 8.4 节点配置

- 选中节点后展示配置面板，未选中时显示引导空状态。
- `@ai-workflow/form` 尚不可用，首个配置面板可以在 Workflow Feature 内按已注册节点实现。
- 表单编辑使用独立草稿；草稿通过 `nodeType.schema.safeParse()` 后再提交到画布节点。
- 字段错误保留结构化路径，配置面板显示字段级错误，不只显示一条通用 Toast。
- Form package 只在出现多个节点共享的 schema 驱动字段渲染需求后实现；它只负责渲染、值和错误回调，不负责保存。

### 8.5 动态端口

`condition` 的 `conditions[].portId` 同时承担以下身份：

- `getNodePorts()` 输出对象的 key。
- React Flow `Handle.id`。
- `WorkflowEdge.sourceHandle`。
- Runtime 未来的分支输出标识。

修改分支名称或条件表达式时必须保留原 `portId`，只有新增分支时才生成新 ID。删除分支并提交有效配置后，应删除引用已消失端口的边，并在 UI 中明确提示；这次清理应与配置提交属于同一次可撤销操作。

开始节点的 `variables` 当前聚合为固定 JSON 输出端口 `variables`，不是每个变量一个 Handle。如果产品要改成变量级端口，必须先修改 Core 的 `resolvePorts` 契约，不能只在 Web 临时生成。

### 8.6 保存与未保存状态

保存流程：

1. 从 React Flow nodes 还原 Core 节点，并直接使用当前 `WorkflowEdge[]`。
2. 从节点坐标和 viewport 生成 layout。
3. 执行 `workflowSchema.safeParse()`。
4. 执行 `validateWorkflow()`。
5. 无问题后调用页面或数据层传入的 `onSave(document)`。
6. 保存成功后更新基线快照并清除 `dirty`；失败时保留当前编辑内容。

页面离开或切换应用时，如果存在未保存修改，应给出明确提示。保存按钮需要区分未修改、保存中、保存成功和失败状态，避免重复提交。

## 9. 未来服务端与 Runtime 接入

服务端尚未初始化，以下是目标边界，不是当前已经存在的接口。

```text
Web 通过 appId 加载 Workflow + layout + revision
        ↓
用户编辑并保存
        ↓
Server 校验 DTO
        ↓
workflowSchema.safeParse
        ↓
validateWorkflow
        ↓
按 revision 做并发控制并持久化新版本
        ↓
用户发起运行
        ↓
validateExecutorWorkflow
        ↓
Runtime 执行，Server 持久化并推送状态/日志
```

服务端实现时应满足：

- Controller 只负责协议转换、鉴权结果和状态码，工作流保存、发布和运行由应用服务编排。
- Workflow 与 layout 可以同一用例保存，但领域字段和布局字段保持分离。
- 请求、数据库 JSON 和导入文件都必须先做结构校验，再做 Core 业务校验。
- 使用 `revision` 或版本号处理并发覆盖，冲突时返回明确错误，不静默覆盖别人的更新。
- 发布版本一旦用于运行应保持不可变，草稿保存不直接修改历史运行所引用的定义。
- Runtime 不依赖 Nest、Prisma 或 Web；数据库、日志、事件和检查点通过服务端适配器接入。
- Web 不直接依赖 `@ai-workflow/runtime`，也不在浏览器执行正式工作流。

当加载、保存、运行状态和日志协议被 Web 与 Server 同时采用后，再把纯 TypeScript DTO 移入 `@ai-workflow/shared`。

## 10. 推荐实施顺序

1. 将现有 `components/workflow` 迁移为 `features/workflow`，保持页面只从 Feature 根入口导入。
2. 完成 `WorkflowNodeHandle` 和 `WorkflowNode`，打通 React Flow、Nodes UI 与 Core 端口。
3. 完成 WorkflowNode、React Flow nodes 和 layout 的双向转换，边继续使用 Core `WorkflowEdge`。
4. 实现画布的节点增删、移动、选择、边创建和边删除。
5. 加入节点面板，并严格从 `nodeRegistry.list()` 创建节点。
6. 实现 start 与 condition 的配置面板，处理配置草稿和动态端口清理。
7. 接入结构校验、Core 保存校验、错误定位、dirty 和保存状态。
8. 在不引入全局状态库的前提下补充撤销/重做、复制粘贴和常用快捷键。
9. Server 初始化后再接持久化、版本冲突、发布、运行、取消、日志和节点运行状态。

首个里程碑应止于“可加载、可编辑、可校验、可保存”的前端编辑器。自动布局、MiniMap、插件节点、多人协作和运行态可视化属于后续能力，不应阻塞 MVP。
