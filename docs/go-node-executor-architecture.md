# Go 节点执行器架构设计

> 状态：目标架构，尚未实施。
>
> 本文按真实调用顺序组织代码：从 Runtime 入口开始，经过 NestJS 和 RabbitMQ，进入 Go
> Executor，再从节点结果回到 Runtime。
>
> 示例用于说明文件职责和调用关系，省略了部分 DTO、日志和错误映射代码。

## 0. 先看这条执行链

```text
HTTP 请求
  ↓
WorkflowRunController
  ↓
WorkflowRunService
  ↓
WorkflowRuntime.start()
  ├── 编译 Workflow
  ├── 计算 Ready 节点
  └── 解析节点变量
  ↓
RuntimeTransition { state, effects }
  ↓
RuntimeTransitionWriter
  ├── 保存 RuntimeState
  ├── 创建 NodeRun
  └── 创建 ExecutionOutbox
  ↓
RabbitMQ
  ↓
Go Worker → Registry → Executor
  ↓
NodeEvent
  ↓
NestJS NodeEventConsumer
  ↓
WorkflowEventService
  ↓
WorkflowRuntime.applyNodeResult()
  ↓
继续调度下一批节点，或结束 WorkflowRun
```

三个边界先记住：

1. Runtime 决定节点何时执行，并在派发前解析变量。
2. NestJS 负责事务、数据库、MQ、鉴权和 SSE。
3. Go 只执行单个节点，不读取完整 Workflow，不计算 DAG。

---

## 1. 先写 Runtime 入口

Runtime 是纯 TypeScript package，不依赖 NestJS、Prisma 或 RabbitMQ。它必须直接依赖
`@ai-workflow/core`，复用 Core 已有的工作流领域模型和 JSON 值契约；Runtime 只定义运行状态与
状态迁移，依赖方向固定为 Runtime → Core。

### 1.1 Runtime 的公开入口

文件：`packages/workflow-runtime/src/index.ts`

作用：只导出 Server 真正需要使用的类型和入口，不暴露内部物理路径。

```ts
// 导出创建工作流运行时的工厂函数，供服务端初始化 Runtime。
export { createWorkflowRuntime } from './runtime/create-workflow-runtime'
// 仅导出运行时公开类型，避免调用方依赖内部实现文件。
export type {
  // 描述 Runtime 持久化的 Edge 状态联合类型。
  RuntimeEdgeStatus,
  // 描述 Runtime 请求宿主执行的一项副作用。
  RuntimeEffect,
  // 描述 Runtime 持久化的节点状态联合类型。
  RuntimeNodeStatus,
  // 描述可持久化并可恢复的 Runtime 完整状态。
  RuntimeState,
  // 描述一次状态推进后产生的新状态与副作用集合。
  RuntimeTransition,
  // 描述启动一次工作流运行所需的输入。
  StartRuntimeInput,
  // 从 Runtime 类型模块集中导出以上公开类型。
} from './runtime/runtime-types'
```

调用方只需要认识两个动作：

```ts
// 使用启动参数创建初始状态，并生成首批可执行节点任务。
runtime.start(input)
// 将节点执行结果应用到已有状态，并继续推进工作流。
runtime.applyNodeResult(state, result)
```

### 1.2 复用 Core 现有领域契约

Runtime 不需要先改写 Core。Core 已经提供 `Workflow`、`WorkflowNode`、`WorkflowEdge`、
`NodeOutputDefinition`、`VariableValue`、`WorkflowEnvironmentVariable`、`SystemVariableKey`、
`SYSTEM_VARIABLE_KEYS`、`SYSTEM_VARIABLE_DEFINITIONS` 和 `validateExecutorWorkflow()`，这些定义
应直接从 `@ai-workflow/core` 根入口复用。

Core 还已经在 `workflow-node-schema.ts` 中定义了递归 `JsonValue` 和 `jsonValueSchema`，只是当前
没有导出。这里不创建新类型或新文件，只给现有定义增加 `export`：

文件：`packages/workflow-core/src/node/workflow-node-schema.ts`

```ts
// 公开 Core 已有的递归 JSON 值类型，供 Runtime 直接复用。
export type JsonValue =
  // 允许字符串值。
  | string
  // 允许有限数字值。
  | number
  // 允许布尔值。
  | boolean
  // 允许 JSON null 值。
  | null
  // 允许递归 JSON 数组。
  | JsonValue[]
  // 允许递归 JSON 对象。
  | { [key: string]: JsonValue }

// 公开 Core 已有的递归 JSON Schema，供 Runtime 校验开放值边界。
export const jsonValueSchema: z.ZodType<JsonValue, JsonValue> = z.lazy(() =>
  // 保持现有字符串、有限数字、布尔、null、数组和对象校验不变。
  z.union([
    // 接受字符串值。
    z.string(),
    // 接受有限数字值。
    z.number().finite(),
    // 接受布尔值。
    z.boolean(),
    // 接受 null 值。
    z.null(),
    // 递归校验数组中的每一项。
    z.array(jsonValueSchema),
    // 递归校验对象中的每个属性值。
    z.record(z.string(), jsonValueSchema),
  ]),
)
```

`workflow-node-schema.ts` 已经由 Core 的 Node 入口和根入口逐级 `export *`，因此增加以上两个
`export` 后，Runtime 就能从 `@ai-workflow/core` 直接导入，不需要新增导出文件。

```ts
// 从 Core 根入口引入已有领域契约，Runtime 不复制这些定义。
import {
  // 提供系统变量的稳定键，Runtime 不手写 user_id 等字符串。
  SYSTEM_VARIABLE_KEYS,
  // 提供系统变量的键、数据类型和说明，供 Runtime 校验实际值。
  SYSTEM_VARIABLE_DEFINITIONS,
  // 校验直接值、解析结果和持久化值是否符合 Core 已有 JSON 约束。
  jsonValueSchema,
  // 描述 Core 已有的递归 JSON 值。
  type JsonValue,
  // 描述 Start 节点动态声明的输入字段。
  type NodeOutputDefinition,
  // 描述 Core 允许引用的系统变量键联合类型。
  type SystemVariableKey,
  // 描述直接值或节点、系统、环境变量引用。
  type VariableValue,
  // 描述经过 Core Schema 校验的完整工作流。
  type Workflow,
  // 描述经过 Core Schema 校验的工作流边。
  type WorkflowEdge,
  // 描述工作流中声明的环境变量。
  type WorkflowEnvironmentVariable,
  // 描述经过 Core Schema 校验的工作流节点。
  type WorkflowNode,
  // 从 Core 的唯一公开根入口导入以上领域契约。
} from '@ai-workflow/core'
```

Core 中的两个 `unknown` 也不应为了 Runtime 被全局改写：`VariableValue` 的 Direct Value 是进入
解析流程前的开放值边界，Runtime 在使用时负责验证；`WorkflowNode.config` 是通用节点外壳，
具体结构继续由对应 `NodeType.schema` 校验。`NodeOutputDefinition.defaultValue` 已经限制为 JSON
值，不需要再定义 `WorkflowInputValues` 或 `WorkflowOutputValues` 才能复用。

Runtime 只复用 Core 已有的 `JsonValue/jsonValueSchema`，不再声明结构相同的
`RuntimePrimitive`、`RuntimeValue` 或 `RuntimeObject`。这次导出不改变 `VariableValue`、
`WorkflowNode.config` 或其他 Core 字段，也不能借此把 RuntimeState、启动上下文或 MQ 协议放进
Core。

`@ai-workflow/runtime` 只需在自己的 `package.json#dependencies` 中显式声明
`"@ai-workflow/core": "workspace:*"`，并且只从包名导入，不能深层引用 Core 的 `src` 文件。

### 1.3 定义 Runtime 的输入和输出

文件：`packages/workflow-runtime/src/runtime/runtime-types.ts`

```ts
// 从 Core 根入口引入已有 JSON 值、系统变量键和状态索引领域类型。
import type {
  // 描述 Core 已有的递归 JSON 值。
  JsonValue,
  // 描述 Core 已声明的全部系统变量键。
  SystemVariableKey,
  // 描述 Core 校验后的工作流边。
  WorkflowEdge,
  // 描述 Core 校验后的工作流节点实例。
  WorkflowNode,
  // 从 Core 的唯一公开根入口导入以上契约。
} from '@ai-workflow/core'
// ScopeContext 属于 TypeScript 与 Go 共用的生成协议，Runtime 只消费，不重复声明。
import type { ScopeContext } from '@ai-workflow/protocol'

// 定义启动一次 Runtime 所需的上下文数据。
export interface StartRuntimeInput {
  // 当前工作流运行的唯一标识。
  runId: string
  // 接收调用方提交的动态字段；Runtime 随后按 Start 节点定义校验并归一化。
  input: Record<string, unknown>
  // 系统变量键和值直接复用 Core 契约，具体 dataType 由 Runtime 按 Core 定义校验。
  system: Record<SystemVariableKey, JsonValue>
}

// 定义 Runtime 节点状态机允许持久化的节点状态。
export type RuntimeNodeStatus =
  // 节点尚未满足执行条件。
  | 'PENDING'
  // 节点任务已经派发且正在执行。
  | 'RUNNING'
  // 节点已经成功完成。
  | 'SUCCEEDED'
  // 节点已经失败。
  | 'FAILED'
  // 节点正在等待外部能力或子工作流。
  | 'SUSPENDED'
  // 节点所在分支未被激活。
  | 'SKIPPED'

// 定义 Runtime 允许持久化的 Core Edge 状态。
export type RuntimeEdgeStatus =
  // 上游节点尚未完成，当前边状态仍未确定。
  | 'WAITING'
  // 上游节点激活了当前边对应的 sourceHandle。
  | 'ACTIVE'
  // 上游节点未选择当前边或已经被跳过。
  | 'INACTIVE'

// 定义一次 Loop 迭代 Scope 允许持久化的状态。
export type RuntimeScopeStatus =
  // 当前迭代正在等待或执行内部节点。
  | 'ACTIVE'
  // 当前迭代的内部 DAG 已经正常结束。
  | 'COMPLETED'
  // 当前迭代存在失败节点，不能继续推进。
  | 'FAILED'

// 定义 Runtime 为一次具体 Loop 迭代保存的可恢复状态。
export interface RuntimeScopeState {
  // Scope 当前只表示 Loop 迭代；子工作流使用独立 WorkflowRun 和 RuntimeState。
  kind: 'LOOP_ITERATION'
  // 创建当前 Scope 的 Core Loop 节点标识。
  ownerNodeId: WorkflowNode['id']
  // 嵌套 Loop 时指向外层迭代 Scope；顶层 Loop 不设置。
  parentScopeKey?: string
  // 当前 Loop 的迭代序号，从 1 开始并且只递增。
  iteration: number
  // 当前迭代 Scope 的整体运行状态。
  status: RuntimeScopeStatus
  // 只保存当前 Loop 直接子节点在本次迭代中的状态。
  nodes: Record<WorkflowNode['id'], RuntimeNodeStatus>
  // 只保存当前 Loop 内部边在本次迭代中的激活状态。
  edges: Record<WorkflowEdge['id'], RuntimeEdgeStatus>
}

// 定义 Runtime 可以完整持久化并恢复的状态。
export interface RuntimeState {
  // 当前工作流运行的唯一标识。
  runId: string
  // 保存经过 Start 动态定义校验和默认值归一化的输入。
  input: Record<string, JsonValue>
  // 保存已经按 Core 系统变量定义验证的完整运行值。
  system: Record<SystemVariableKey, JsonValue>
  // 使用 Core 节点标识记录每个节点的运行状态。
  nodes: Record<WorkflowNode['id'], RuntimeNodeStatus>
  // 使用 Core 边标识记录每条边的激活状态。
  edges: Record<WorkflowEdge['id'], RuntimeEdgeStatus>
  // 按 Runtime executionKey 保存每次节点执行产生的 JSON 输出对象。
  outputs: Record<string, Record<string, JsonValue>>
  // 按 Runtime executionKey 反查对应的 Core 节点标识。
  nodeIdByExecutionKey: Record<string, WorkflowNode['id']>
  // 按 scopeKey 保存每次 Loop 迭代的 Runtime 自有可恢复状态。
  scopes: Record<string, RuntimeScopeState>
}

// 定义 Runtime 每次推进后返回的完整迁移结果。
export interface RuntimeTransition {
  // 每次状态迁移后都返回完整可持久化状态。
  state: RuntimeState
  // Runtime 不执行副作用，只告诉 NestJS 接下来要做什么。
  effects: RuntimeEffect[]
}

// 定义 Runtime 可交给宿主执行的全部副作用联合类型。
export type RuntimeEffect =
  // 表示需要派发一个节点执行任务。
  | {
      // 副作用判别字段，固定表示派发节点。
      type: 'DISPATCH_NODE'
      // 当前需要执行的节点标识，跟随 Core WorkflowNode 的 id 类型。
      nodeId: WorkflowNode['id']
      // 当前节点在具体 Scope 与迭代中的唯一执行标识。
      executionKey: string
      // 节点类型跟随 Core WorkflowNode，并用于 Go Registry 选择 Executor。
      nodeType: WorkflowNode['type']
      // 已完成变量解析且可以安全写入 MQ 的节点输入。
      inputs: Record<string, JsonValue>
      // 已通过 NodeType Schema 校验、完成变量解析且可以安全写入 MQ 的节点配置。
      config: Record<string, JsonValue>
      // 可选的 Scope 上下文；节点位于某次 Loop 迭代内时提供。
      scopeContext?: ScopeContext
    }
  // 表示工作流已成功完成，并携带最终输出。
  | {
      // 副作用判别字段，固定表示工作流成功完成。
      type: 'COMPLETE_RUN'
      // 根据 Core Workflow.outputs 解析得到的最终输出。
      output: Record<string, JsonValue>
    }
  // 表示工作流执行失败，并携带标准化运行时错误。
  | {
      // 副作用判别字段，固定表示工作流执行失败。
      type: 'FAIL_RUN'
      // 导致工作流终止的标准化 Runtime 错误。
      error: RuntimeError
    }
```

`DISPATCH_NODE` 已经包含解析后的 Inputs 和 Config。NestJS 不再解析业务变量，只添加消息 ID、
租约和截止时间等基础设施字段。

`StartRuntimeInput.input` 保留 `Record<string, unknown>` 是有意的：输入字段名、`dataType`、
`required` 和 `defaultValue` 是用户在 Start 节点 `outputs` 中动态定义的，普通 `Workflow` 类型
无法在编译期保留这些字面量。Runtime 的 `start()` 必须根据 Core 已有的
`NodeOutputDefinition[]` 校验字段、拒绝非 JSON 值并补齐默认值，之后才写入强约束的
`RuntimeState.input`。这里不能把 `input` 写为 `NodeInputBindings`，后者表示节点内部的
`VariableValue` 绑定，不表示调用方提交的实际值。

`WorkflowNode["type"]` 也不能收窄为 Core 的 `BuiltinNodeType`。Core `NodeRegistry` 允许注册扩展
节点，Runtime 只要求节点类型已经通过 `validateExecutorWorkflow()`，不会把内置节点联合类型
硬编码进通用调度器。

`RuntimeState.nodes` 和 `RuntimeState.edges` 保存根 Scope 的调度状态；每次 Loop 迭代拥有独立的
`RuntimeScopeState.nodes` 和 `RuntimeScopeState.edges`。`scopeKey` 是 Runtime 生成的稳定字符串，
对 Runtime 之外的消费者保持不透明，并包含从外层到当前层的 Loop 与迭代信息，例如：

```text
loop-1/iteration-1
loop-1/iteration-2
loop-1/iteration-2/loop-2/iteration-1
```

同一次迭代内的节点 `executionKey` 由当前 `scopeKey` 和 Core `nodeId` 组成，例如
`loop-1/iteration-2/http-1`。每次 Repeat 创建新的 Scope 记录，上一轮 Scope 保留终态，因而节点
状态和输出不会被下一轮覆盖。输出仍统一保存在 `RuntimeState.outputs`，不在 Scope 中复制。

Sub Workflow 不写入 `RuntimeState.scopes`。NestJS 为它创建带独立 `runId` 和 `RuntimeState` 的
子 `WorkflowRun`；父 Runtime 只把对应节点保持为 `SUSPENDED`，由 NodeRun/Capability 状态记录
`childRunId` 并在子 Run 结束后恢复。Sub Workflow 节点如果本身位于 Loop 中，仍会携带所属 Loop
的 `ScopeContext`。

### 1.4 创建 Runtime

文件：`packages/workflow-runtime/src/runtime/create-workflow-runtime.ts`

```ts
// 引入核心包中的工作流结构类型。
import type { Workflow } from '@ai-workflow/core'
// 引入把工作流编译为只读执行索引的函数。
import { buildExecutionPlan } from '../compiler/build-execution-plan'
// 引入封装状态机推进逻辑的 Runtime 类。
import { WorkflowRuntime } from './workflow-runtime'

// 根据工作流快照创建一个可执行的 Runtime 实例。
export function createWorkflowRuntime(
  // 本次运行使用且已经通过 Core Schema 校验的工作流快照。
  workflow: Workflow,
  // 返回绑定该工作流执行计划的 Runtime 实例。
): WorkflowRuntime {
  // ExecutionPlan 是只读索引，不修改数据库中的 Workflow 快照。
  const plan = buildExecutionPlan(workflow)
  // 使用编译后的执行计划构造 Runtime，避免运行期间重复扫描工作流。
  return new WorkflowRuntime(plan)
}
```

文件：`packages/workflow-runtime/src/compiler/build-execution-plan.ts`

```ts
// 从 Core 根入口引入工作流、节点和边的唯一领域类型。
import type {
  // 描述经过 Core Schema 校验的完整工作流。
  Workflow,
  // 描述经过 Core Schema 校验的工作流边。
  WorkflowEdge,
  // 描述经过 Core Schema 校验的工作流节点。
  WorkflowNode,
  // 从 Core 的唯一公开根入口导入以上类型。
} from '@ai-workflow/core'

// 定义 Runtime 使用的 Scope 标识；非根 Scope 必须来自 Core 节点标识。
export type RuntimeScopeId = 'root' | WorkflowNode['id']

// 定义 Runtime 调度所需的只读工作流索引。
export interface ExecutionPlan {
  // 本次运行使用的完整工作流快照。
  workflow: Workflow
  // 按节点标识快速查找节点定义的只读索引。
  nodeById: ReadonlyMap<WorkflowNode['id'], WorkflowNode>
  // 按目标节点标识查找全部入边的只读索引。
  incomingEdges: ReadonlyMap<WorkflowNode['id'], readonly WorkflowEdge[]>
  // 按源节点标识查找全部出边的只读索引。
  outgoingEdges: ReadonlyMap<WorkflowNode['id'], readonly WorkflowEdge[]>
  // 按 Scope 标识查找直属子节点标识的只读索引。
  childrenByScope: ReadonlyMap<RuntimeScopeId, readonly WorkflowNode['id'][]>
}
```

Compiler 在运行开始时建立 Node、Edge 和 Scope 索引，后续调度不反复扫描完整 Workflow。

### 1.5 实现 `start()` 和 `applyNodeResult()`

文件：`packages/workflow-runtime/src/runtime/workflow-runtime.ts`

```ts
// 引入根据 Core Start 输出定义校验调用方输入的函数。
import { parseStartInputValues } from '../input/parse-start-input-values'
// 引入根据 Core 系统变量定义校验实际值的函数。
import { parseRuntimeSystemVariables } from './parse-runtime-system-variables'

// 封装工作流状态机推进、节点结果应用和副作用生成逻辑。
export class WorkflowRuntime {
  // 保存编译后的只读执行计划，供所有调度步骤复用。
  constructor(private readonly plan: ExecutionPlan) {}

  // 启动工作流，并返回初始化后的状态与首批副作用。
  start(
    // 启动本次运行所需的运行标识、业务输入和系统变量。
    input: StartRuntimeInput,
    // 返回初始化后的完整状态及首批副作用。
  ): RuntimeTransition {
    // 复用 Core 系统变量定义校验键集合及每个值的 dataType。
    const system = parseRuntimeSystemVariables(input.system)
    // 校验 runId、Workflow.id 与系统变量中的运行身份是否完全一致。
    assertRuntimeIdentity(this.plan, input.runId, system)
    // 根据 Core 已有的 Start outputs 校验动态字段、应用默认值并拒绝未知字段。
    const normalizedInput = parseStartInputValues(this.plan, input.input)
    // 使用经过动态字段和可持久化值校验的数据创建初始状态。
    const state = createInitialRuntimeState(this.plan, {
      // 保留 Runtime 自有的运行标识。
      runId: input.runId,
      // 保存已经按 Start 输出定义归一化的实际输入。
      input: normalizedInput,
      // 保存根据 Core 系统变量定义校验后的完整值。
      system,
    })

    // start 不执行节点，只推进状态机并生成第一批派发 Effect。
    return this.advance(state)
  }

  // 将一个节点的终态结果写入 RuntimeState，并继续推进状态机。
  applyNodeResult(
    // 当前工作流运行的完整持久化状态。
    state: RuntimeState,
    // Go Executor 返回的单节点执行结果。
    result: ExecuteNodeResult,
    // 返回应用结果后产生的新状态与下一批副作用。
  ): RuntimeTransition {
    // 通过执行标识定位本次结果对应的工作流节点。
    const nodeId = state.nodeIdByExecutionKey[result.executionKey]
    // 找不到映射表示结果不属于当前状态，立即抛出标准错误。
    if (!nodeId) throw new RuntimeError('EXECUTION_KEY_NOT_FOUND')

    // 成功结果会更新节点状态、输出、出边和可选 Scope 指令。
    if (result.status === 'SUCCEEDED') {
      // 将对应节点标记为执行成功。
      state.nodes[nodeId] = 'SUCCEEDED'
      // 按 executionKey 保存节点输出；缺省输出统一为空对象。
      state.outputs[result.executionKey] = result.outputs ?? {}

      // 将 Executor 返回的激活 Handle 转为集合以便快速判断。
      const activatedHandles = new Set(result.activatedHandles)
      // 遍历当前节点的全部出边；没有出边时使用空数组。
      for (const edge of this.plan.outgoingEdges.get(nodeId) ?? []) {
        // Runtime 不判断 Condition、HTTP 或 LLM，只根据 Handle 推进 Edge。
        state.edges[edge.id] = activatedHandles.has(edge.sourceHandle)
          ? // Handle 被激活时，对应出边进入 ACTIVE 状态。
            'ACTIVE'
          : // Handle 未被激活时，对应出边进入 INACTIVE 状态。
            'INACTIVE'
      }

      // Loop Executor 返回通用运行时指令时，再更新 Scope 状态。
      if (result.directive) {
        // 节点和 executionKey 用于定位父 Scope；Runtime 不在这里判断具体 node.type。
        applyRuntimeDirective(this.plan, state, nodeId, result.executionKey, result.directive)
      }
      // 非成功结果交给统一失败处理逻辑更新节点与运行状态。
    } else {
      // 根据失败或挂起结果写入对应的 Runtime 状态。
      applyNodeFailure(state, nodeId, result)
    }

    // 在应用节点结果后继续计算下一批节点或工作流终态。
    return this.advance(state)
  }

  // 推进状态机，生成派发、完成或失败副作用。
  private advance(
    // 要继续推进的完整 RuntimeState；方法会原地更新该状态。
    state: RuntimeState,
    // 返回当前状态可产生的下一次迁移。
  ): RuntimeTransition {
    // 先传播无法再被激活的 Skipped 节点及其出边状态。
    propagateSkippedNodes(this.plan, state)
    // 计算当前 Scope 中已经满足执行条件的节点集合。
    const { ready } = collectRunnableNodes(this.plan, state)

    // 存在 Ready 节点时，为它们批量创建派发副作用。
    if (ready.length > 0) {
      // 返回已更新状态和本轮全部节点派发请求。
      return {
        // 暴露本轮推进后的完整状态供宿主持久化。
        state,
        // 一次可以生成多个 Effect，由 NestJS 和 Go 控制实际并发量。
        effects: ready.map((nodeId) =>
          // 为每一个 Ready 节点创建独立的派发 Effect。
          this.createDispatchEffect(state, nodeId),
        ),
      }
    }

    // 仍有运行中或挂起节点时保持等待，不生成新副作用。
    if (hasRunningOrSuspendedNodes(state)) {
      // 返回等待状态，不要求宿主执行任何新副作用。
      return {
        // 保留当前仍有节点运行或挂起的完整状态。
        state,
        // 空数组表示本轮无需执行任何副作用。
        effects: [],
      }
    }

    // 没有可运行节点且存在失败节点时结束整个工作流。
    if (hasFailedNode(state)) {
      // 返回失败副作用，由 NestJS 持久化工作流终态。
      return {
        // 保留失败发生后的完整状态。
        state,
        // 使用当前状态生成标准化工作流错误。
        effects: [
          // 描述由失败节点导致的工作流失败副作用。
          {
            // 使用判别字段表示工作流执行失败。
            type: 'FAIL_RUN',
            // 根据当前状态生成对外一致的运行错误。
            error: createRunError(state),
          },
        ],
      }
    }

    // 没有待运行、运行中或失败节点时，工作流成功完成。
    return {
      // 返回最终完整状态供宿主持久化。
      state,
      // 生成唯一的工作流完成副作用。
      effects: [
        // 描述成功完成及最终输出。
        {
          // 使用判别字段表示工作流成功完成。
          type: 'COMPLETE_RUN',
          // Workflow Output 也通过同一套变量解析器获取最终值。
          output: resolveWorkflowOutputs(
            // 从执行计划中读取本次运行的工作流快照。
            this.plan.workflow,
            // 根据最终 RuntimeState 构造输出变量上下文。
            createVariableContext(state),
          ),
        },
      ],
    }
  }

  // 为一个 Ready 节点创建包含解析后输入的派发副作用。
  private createDispatchEffect(
    // 当前工作流运行状态；方法会把目标节点更新为 RUNNING。
    state: RuntimeState,
    // 本次需要派发的节点标识，类型跟随 Core WorkflowNode.id。
    nodeId: WorkflowNode['id'],
    // 返回包含完整节点命令业务数据的派发副作用。
  ): RuntimeEffect {
    // 从执行计划索引中读取完整节点定义。
    const node = this.plan.nodeById.get(nodeId)
    // 索引缺失表示执行计划损坏，立即抛出标准错误。
    if (!node) throw new RuntimeError('NODE_NOT_FOUND')

    // 根据节点与当前 Scope 状态生成本次执行的唯一标识。
    const executionKey = createExecutionKey(nodeId, state)
    // 基于当前状态构造 Inputs、Config 所需的变量上下文。
    const variableContext = createVariableContext(state)

    // 在生成派发副作用时同步把节点标记为运行中。
    state.nodes[nodeId] = 'RUNNING'
    // 保存 executionKey 到 nodeId 的映射，供结果返回时反查节点。
    state.nodeIdByExecutionKey[executionKey] = nodeId

    // 返回由 NestJS 转换为节点命令的派发副作用。
    return {
      // 使用判别字段表示需要派发节点任务。
      type: 'DISPATCH_NODE',
      // 携带工作流中的节点标识。
      nodeId,
      // 携带当前 Scope 下唯一的节点执行标识。
      executionKey,
      // 携带节点类型，供 Go Registry 选择 Executor。
      nodeType: node.type,
      // Inputs 和 Config 在离开 Runtime 前全部解析完成。
      inputs: resolveNodeInputs(node.inputs, variableContext),
      // 递归解析配置对象中的全部变量引用。
      config: resolveObjectVariables(node.config, variableContext),
      // 携带节点所属的可选 Loop Scope 上下文。
      scopeContext: getCurrentScopeContext(state, nodeId),
    }
  }
}
```

### 1.6 变量解析放在哪里

文件：

- `packages/workflow-runtime/src/variable/resolve-variable-value.ts`
- `packages/workflow-runtime/src/variable/resolve-object-variables.ts`
- `packages/workflow-runtime/src/variable/variable-context.ts`
- `packages/workflow-runtime/src/variable/output-store.ts`

```ts
// 从 Core 根入口引入已有 JSON Schema 和变量领域类型。
import {
  // 校验 Direct Value 是否满足 Core 已有递归 JSON 值约束。
  jsonValueSchema,
  // 描述 Core 已有的递归 JSON 值。
  type JsonValue,
  // 描述 Core 已声明的全部系统变量键。
  type SystemVariableKey,
  // 描述直接值或节点、系统、环境变量引用。
  type VariableValue,
  // 描述工作流中声明的环境变量。
  type WorkflowEnvironmentVariable,
  // 从 Core 的唯一公开根入口导入以上类型。
} from '@ai-workflow/core'
// 定义一次变量解析可读取的全部强类型数据源。
export interface VariableContext {
  // 按 executionKey 和输出字段读取已完成节点的 JSON 输出。
  outputs: OutputStore
  // 使用 Core 系统变量键和 JSON 值契约保存已经校验的完整系统值。
  system: Readonly<Record<SystemVariableKey, JsonValue>>
  // 按 Core 环境变量稳定 ID 读取已验证的运行值或 Secret Pointer。
  environment: ReadonlyMap<WorkflowEnvironmentVariable['id'], JsonValue>
  // 描述当前 Loop 或嵌套工作流位置的 Runtime Scope 路径。
  scopePath: readonly string[]
}

// 解析一个直接值或变量引用，并返回对应的运行时值。
export function resolveVariableValue(
  // 待解析的变量值，可能是字面量或引用。
  value: VariableValue,
  // 提供节点输出、系统变量、环境变量与 Scope 路径的解析上下文。
  context: VariableContext,
  // 返回经过 Runtime 动态值校验的结果。
): JsonValue {
  // 直接值无需查询任何变量来源。
  if (value.type === 'value') {
    // Direct Value 是开放边界，读取前必须拒绝函数、undefined、NaN 等非 JSON 值。
    return jsonValueSchema.parse(value.value)
  }

  // 从引用类型的变量值中取出统一引用描述。
  const reference = value.reference
  // 根据引用 Scope 从相应数据源读取根值。
  const source =
    // node Scope 表示引用另一个节点在当前 Scope 路径下的输出。
    reference.scope === 'node'
      ? // 从 Output Store 中读取指定节点和输出字段的值。
        context.outputs.get({
          // 指定产生输出的节点标识。
          nodeId: reference.nodeId,
          // 指定要读取的节点输出字段。
          outputKey: reference.outputKey,
          // 限定当前 Loop 或嵌套工作流的 Scope 路径。
          scopePath: context.scopePath,
        })
      : // system Scope 表示读取本次运行的系统变量。
        reference.scope === 'system'
        ? // 按系统变量键读取对应值。
          context.system[reference.key]
        : // 其余 Scope 统一按环境变量标识读取。
          context.environment.get(reference.variableId)

  // 在根值上继续读取可选的嵌套属性路径并返回最终结果。
  return readPath(source, reference.path)
}
```

变量解析失败要返回明确错误，例如：

```text
VARIABLE_SOURCE_NOT_FOUND
VARIABLE_OUTPUT_NOT_FOUND
VARIABLE_PATH_NOT_FOUND
VARIABLE_SCOPE_NOT_ACCESSIBLE
```

Loop 中同一节点会执行多次，Output Store 必须使用带 Scope 的 `executionKey`：

```text
http-1
loop-1/iteration-1/http-1
loop-1/iteration-2/http-1
```

Secret 不能以明文进入 MQ。Runtime 只生成 Secret Pointer，Go 使用前通过 NestJS Credential
Gateway 获取短期值。

### 1.7 DAG 调度放在哪里

文件：`packages/workflow-runtime/src/dag/dag-scheduler.ts`

每条 Edge 有三种状态：

```text
WAITING   上游尚未完成
ACTIVE    上游激活了该 Edge 对应的 sourceHandle
INACTIVE  上游没有选择该 Handle，或者上游被跳过
```

```ts
// 引入 Core 节点类型，使调度结果跟随领域节点标识类型。
import type { WorkflowNode } from '@ai-workflow/core'
// 引入 Runtime 编译计划和 Scope 标识类型。
import type {
  // 描述 Runtime 调度使用的只读工作流索引。
  ExecutionPlan,
  // 描述根 Scope 或由 Core 节点标识形成的嵌套 Scope。
  RuntimeScopeId,
  // 从编译器模块导入 Runtime 自有类型。
} from '../compiler/build-execution-plan'

// 计算指定 Scope 中当前可运行和应跳过的节点。
export function collectRunnableNodes(
  // Runtime 编译后的只读执行计划。
  plan: ExecutionPlan,
  // 当前工作流运行的完整状态。
  state: RuntimeState,
  // 要计算的 Runtime Scope 标识，默认从根 Scope 开始。
  scopeId: RuntimeScopeId = 'root',
  // 返回 Ready 与 Skipped 两类节点集合。
): {
  // 已满足全部入边条件、可以立即执行的 Core 节点标识集合。
  ready: WorkflowNode['id'][]
  // 全部入边均无法激活、需要传播跳过状态的 Core 节点标识集合。
  skipped: WorkflowNode['id'][]
} {
  // 收集已满足执行条件的节点标识。
  const ready: WorkflowNode['id'][] = []
  // 收集所有入边均无法激活的节点标识。
  const skipped: WorkflowNode['id'][] = []

  // 遍历当前 Scope 的直属节点；没有子节点时遍历空数组。
  for (const nodeId of plan.childrenByScope.get(scopeId) ?? []) {
    // 只有 PENDING 节点需要参与本轮调度判断。
    if (state.nodes[nodeId] !== 'PENDING') continue

    // 获取当前节点的全部入边；没有入边时使用空数组。
    const incoming = plan.incomingEdges.get(nodeId) ?? []
    // 没有入边的节点是当前 Scope 的起始节点，可直接执行。
    if (incoming.length === 0) {
      // 将起始节点加入 Ready 集合。
      ready.push(nodeId)
      // 当前节点判断结束，继续处理下一个节点。
      continue
    }

    // 将全部入边映射为当前的 WAITING、ACTIVE 或 INACTIVE 状态。
    const edgeStates = incoming.map((edge) => state.edges[edge.id])

    // 有任何 Waiting 入边时必须继续等待，避免并行汇聚节点提前执行。
    if (edgeStates.includes('WAITING')) continue

    // 至少一条入边为 ACTIVE 时，当前节点具备执行条件。
    if (edgeStates.includes('ACTIVE')) ready.push(nodeId)
    // 全部入边均为 INACTIVE 时，当前节点应标记为 Skipped。
    else skipped.push(nodeId)
  }

  // 返回本轮计算得到的可执行节点与跳过节点集合。
  return {
    // 返回本轮收集的 Ready 节点。
    ready,
    // 返回本轮收集的 Skipped 节点。
    skipped,
  }
}
```

Skipped 节点需要把全部出边标记为 Inactive，并继续向下传播。

---

## 2. 再写 NestJS 的运行入口

NestJS 是 Runtime 的宿主。Controller 只接收请求，Service 编排用例和事务。

### 2.1 Controller

文件：`apps/server/src/controllers/workflow-run.controller.ts`

```ts
// 将类注册为处理工作流运行 HTTP 请求的 NestJS Controller。
@Controller('workflows/:workflowId/runs')
// 定义工作流运行接口的控制器。
export class WorkflowRunController {
  // 注入工作流运行业务服务，Controller 不直接访问基础设施。
  constructor(private readonly workflowRunService: WorkflowRunService) {}

  // 将 start 方法映射为当前路由下的 POST 请求。
  @Post()
  // 要求请求通过 JWT 鉴权并注入认证信息。
  @JwtAuth()
  // 接收并启动一次新的工作流运行。
  async start(
    // 从路由参数中读取目标工作流标识。
    @Param('workflowId') workflowId: string,
    // 从请求体中读取并校验启动 DTO。
    @Body() dto: StartWorkflowRunDto,
    // 读取包含认证上下文的请求对象。
    @Req() request: AuthenticatedRequest,
    // 返回新建工作流运行的对外视图对象。
  ): Promise<WorkflowRunVo> {
    // Controller 只传递认证身份和 DTO，不在这里解析 Workflow 或访问 Prisma。
    return this.workflowRunService.start(request.auth.userId, workflowId, dto)
  }
}
```

### 2.2 Service 调用 Runtime

文件：`apps/server/src/services/workflow-run.service.ts`

```ts
// 从 Core 根入口引入工作流校验和系统变量键契约。
import {
  // 提供系统变量唯一合法键，避免手写 ownerId 等错误字段。
  SYSTEM_VARIABLE_KEYS,
  // 提供内置节点定义和配置 Schema 的注册表。
  nodeRegistry,
  // 校验工作流是否满足实际执行要求。
  validateExecutorWorkflow,
  // 校验数据库中的完整工作流快照。
  workflowSchema,
  // 从 Core 的唯一公开根入口导入以上契约。
} from '@ai-workflow/core'
// 从 Runtime 根入口引入工厂函数和启动上下文类型。
import {
  // 根据已通过 Core 校验的工作流创建 Runtime。
  createWorkflowRuntime,
  // 描述 Runtime 启动方法接收的完整上下文。
  type StartRuntimeInput,
  // 从 Runtime 的唯一公开根入口导入以上契约。
} from '@ai-workflow/runtime'

// 将工作流运行服务注册为可由 NestJS 注入的 Provider。
@Injectable()
// 编排工作流读取、校验、Runtime 启动与事务持久化。
export class WorkflowRunService {
  // 注入启动工作流用例依赖的仓储、事务客户端与迁移写入器。
  constructor(
    // 负责读取工作流定义并创建、查询工作流运行记录。
    private readonly workflowRepository: WorkflowRepository,
    // 提供 Prisma 客户端及数据库事务能力。
    private readonly prisma: PrismaService,
    // 负责把 RuntimeTransition 原子写入状态、NodeRun 和 Outbox。
    private readonly transitionWriter: RuntimeTransitionWriter,
  ) {}

  // 为指定用户和工作流创建一次新的运行。
  async start(
    // 当前认证用户标识，用于数据归属校验。
    ownerId: string,
    // 要执行的工作流标识。
    workflowId: string,
    // 已通过接口层校验的运行输入 DTO。
    dto: StartWorkflowRunDto,
    // 异步返回创建成功后的工作流运行视图。
  ): Promise<WorkflowRunVo> {
    // 按所有者与工作流标识读取可执行的持久化工作流。
    const storedWorkflow = await this.workflowRepository.findExecutable(
      // 限定工作流必须属于当前认证用户。
      ownerId,
      // 指定要读取的工作流。
      workflowId,
    )
    // 找不到可执行工作流时返回 HTTP 404 错误。
    if (!storedWorkflow) throw new NotFoundException('工作流不存在')

    // 数据库 JSON 进入 Runtime 前仍要经过 Core Schema，不能直接类型断言。
    const parsedWorkflow = workflowSchema.safeParse(storedWorkflow.definition)
    // Schema 校验失败时拒绝启动结构无效的工作流。
    if (!parsedWorkflow.success) {
      // 将工作流结构问题映射为 HTTP 400 错误。
      throw new BadRequestException('工作流结构无效')
    }

    // 取得经过 Core Schema 校验的强类型工作流定义。
    const workflow = parsedWorkflow.data
    // 数据库关联标识与 Core 快照标识不一致时拒绝运行错误版本。
    if (workflow.id !== workflowId) {
      // 将损坏或错误关联的工作流快照映射为 HTTP 400 错误。
      throw new BadRequestException('工作流标识不一致')
    }

    // 校验工作流中的每个节点是否存在对应 Executor 及合法配置。
    const validationIssues = validateExecutorWorkflow(workflow, nodeRegistry)
    // 存在 Executor 兼容性问题时拒绝启动运行。
    if (validationIssues.length > 0) {
      // 把全部校验问题作为 HTTP 400 响应返回。
      throw new BadRequestException(validationIssues)
    }

    // 为本次工作流运行生成全局唯一标识。
    const runId = randomUUID()
    // 使用 Core Key 组装系统变量，并用 Runtime 启动类型检查完整键集合。
    const system = {
      // 将认证用户标识写入 sys.user_id。
      [SYSTEM_VARIABLE_KEYS.USER_ID]: ownerId,
      // 将数据库关联的应用标识写入 sys.app_id。
      [SYSTEM_VARIABLE_KEYS.APP_ID]: storedWorkflow.appId,
      // 将 Core 工作流快照标识写入 sys.workflow_id。
      [SYSTEM_VARIABLE_KEYS.WORKFLOW_ID]: workflow.id,
      // 将当前运行标识写入 sys.workflow_run_id。
      [SYSTEM_VARIABLE_KEYS.WORKFLOW_RUN_ID]: runId,
      // 将本次运行启动时间写入 sys.timestamp。
      [SYSTEM_VARIABLE_KEYS.TIMESTAMP]: Date.now(),
    } satisfies StartRuntimeInput['system']
    // 根据已经校验的工作流快照创建 Runtime 实例。
    const runtime = createWorkflowRuntime(workflow)
    // 初始化 Runtime，并获取首个状态迁移结果。
    const transition = runtime.start({
      // 把新生成的运行标识写入 Runtime 输入。
      runId,
      // 把动态业务字段交给 Runtime 按 Start 输出定义校验并归一化。
      input: dto.input,
      // 提供键和 dataType 都复用 Core 定义的完整系统变量。
      system,
    })

    // 在单个数据库事务中创建运行记录并写入首个迁移结果。
    await this.prisma.$transaction(async (transaction) => {
      // 保存本次运行使用的 Workflow 快照，恢复时才能重建同一 ExecutionPlan。
      const run = await this.workflowRepository.createRun(transaction, {
        // 持久化本次运行的唯一标识。
        runId,
        // 持久化运行记录的所有者标识。
        ownerId,
        // 关联被执行的工作流标识。
        workflowId,
        // 保存不可变工作流快照供故障恢复时重新编译。
        workflowSnapshot: workflow,
        // 保存 Runtime 已经校验并应用默认值的业务输入。
        input: transition.state.input,
      })

      // 在同一个事务中保存状态、NodeRun 和 Outbox。
      await this.transitionWriter.write(transaction, run, transition)
    })

    // 事务成功后查询并返回对外展示的工作流运行视图。
    return this.workflowRepository.getRunVo(ownerId, runId)
  }
}
```

`WorkflowRepository.findExecutable()` 必须同时返回工作流版本快照及其数据库关联的 `appId`，但
不能把 Prisma Model 直接交给 Runtime。`StartWorkflowRunDto.input` 在 HTTP 边界只校验为
`Record<string, unknown>`；字段是否合法、是否必填、值类型是否匹配以及默认值如何补齐，统一由
Runtime 复用 Start 节点已有的 `NodeOutputDefinition[]` 完成。服务层不能再维护一套 Core 中并不
存在的工作流输入 Schema。

### 2.3 Nest Module

文件：`apps/server/src/modules/workflow-runtime.module.ts`

```ts
// 声明工作流运行模块及其 NestJS 依赖关系。
@Module({
  // 引入 JWT 鉴权和 RabbitMQ 基础设施模块。
  imports: [JwtModule, RabbitMqModule],
  // 注册负责接收工作流启动请求的 Controller。
  controllers: [WorkflowRunController],
  // 注册运行、事件、持久化和消息收发所需的 Provider。
  providers: [
    // 编排工作流启动用例。
    WorkflowRunService,
    // 处理 Go 返回的节点事件并恢复 Runtime。
    WorkflowEventService,
    // 提供工作流与运行记录的数据访问能力。
    WorkflowRepository,
    // 提供单节点运行记录的数据访问能力。
    WorkflowNodeRunRepository,
    // 将 RuntimeTransition 持久化为状态和 Outbox 记录。
    RuntimeTransitionWriter,
    // 通过 RabbitMQ 发布节点执行命令。
    NodeCommandPublisher,
    // 消费 Go Worker 发布的节点事件。
    NodeEventConsumer,
  ],
  // 对其他模块公开工作流启动服务。
  exports: [WorkflowRunService],
})
// 作为工作流 Runtime 宿主的 NestJS 模块。
export class WorkflowRuntimeModule {}
```

`WorkflowRuntimeModule` 只负责组装依赖，不把 Runtime 逻辑重新实现一遍。

---

## 3. NestJS 把 Effects 写入 Outbox

文件：`apps/server/src/infra/runtime/runtime-transition.writer.ts`

作用：把 Runtime 的纯计算结果转换成数据库状态和待发送消息。

```ts
// 将迁移写入器注册为可由 NestJS 注入的 Provider。
@Injectable()
// 负责把 Runtime 的纯迁移结果转换为数据库状态和 Outbox 消息。
export class RuntimeTransitionWriter {
  // 在同一事务中持久化 RuntimeState 并处理全部 RuntimeEffect。
  async write(
    // 调用方提供的 Prisma 事务客户端，保证全部写入原子提交。
    transaction: PrismaTransaction,
    // 当前工作流运行的数据库记录。
    run: WorkflowRunRecord,
    // Runtime 本轮计算得到的新状态与副作用。
    transition: RuntimeTransition,
    // 事务写入成功时完成，不返回业务数据。
  ): Promise<void> {
    // RuntimeState 必须持久化，否则无法恢复 Edge、Skip 和 Loop Scope。
    await transaction.workflowRun.update({
      // 限定更新当前工作流运行记录。
      where: {
        // 使用数据库主键精确定位运行记录。
        id: run.id,
      },
      // 将完整 RuntimeState 写入运行记录。
      data: {
        // 保存 Runtime 本轮返回的可恢复完整状态。
        runtimeState: transition.state,
      },
    })

    // 逐个把 RuntimeEffect 转换为数据库写入。
    for (const effect of transition.effects) {
      // 派发节点副作用需要创建 NodeRun 和 Outbox。
      if (effect.type === 'DISPATCH_NODE') {
        // 写入单节点执行记录及其待发布命令。
        await this.writeDispatch(transaction, run, effect)
      }

      // 完成副作用需要把工作流运行标记为成功。
      if (effect.type === 'COMPLETE_RUN') {
        // 持久化成功终态与最终工作流输出。
        await transaction.workflowRun.update({
          // 限定更新当前工作流运行记录。
          where: {
            // 使用数据库主键精确定位运行记录。
            id: run.id,
          },
          // 同时写入成功状态和 Runtime 计算的最终输出。
          data: {
            // 将工作流运行状态更新为成功。
            status: 'SUCCEEDED',
            // 保存 Runtime 解析后的最终工作流输出。
            output: effect.output,
          },
        })
      }

      // 失败副作用需要把工作流运行标记为失败。
      if (effect.type === 'FAIL_RUN') {
        // 持久化失败终态与标准化 Runtime 错误。
        await transaction.workflowRun.update({
          // 限定更新当前工作流运行记录。
          where: {
            // 使用数据库主键精确定位运行记录。
            id: run.id,
          },
          // 同时写入失败状态和 Runtime 生成的错误详情。
          data: {
            // 将工作流运行状态更新为失败。
            status: 'FAILED',
            // 保存 Runtime 生成的标准化失败详情。
            error: effect.error,
          },
        })
      }
    }
  }

  // 为一个派发副作用创建 NodeRun 和待发布的 Outbox 消息。
  private async writeDispatch(
    // 调用方提供的 Prisma 事务客户端。
    transaction: PrismaTransaction,
    // 当前工作流运行记录。
    run: WorkflowRunRecord,
    // Runtime 生成的单节点派发副作用。
    effect: DispatchNodeEffect,
    // NodeRun 与 Outbox 创建成功时完成，不返回业务数据。
  ): Promise<void> {
    // 为跨语言节点执行命令生成唯一标识。
    const commandId = randomUUID()
    // 为本次单节点运行记录生成唯一标识。
    const nodeRunId = randomUUID()
    // 为本次派发生成唯一租约，防止旧 Worker 回写迟到结果。
    const leaseToken = randomUUID()

    // 组装发给 Go Worker 的完整单节点执行命令。
    const command: ExecuteNodeCommand = {
      // 标识当前命令，便于事件关联和追踪。
      commandId,
      // 保证同一运行中的同一次逻辑节点执行可幂等识别。
      idempotencyKey: `${run.id}:${effect.executionKey}`,
      // 关联当前工作流运行。
      runId: run.id,
      // 关联本次单节点运行记录。
      nodeRunId,
      // 标识工作流中的节点定义。
      nodeId: effect.nodeId,
      // 指定 Go Registry 需要选择的 Executor 类型。
      nodeType: effect.nodeType,
      // 标识具体 Scope 和迭代中的节点执行实例。
      executionKey: effect.executionKey,
      // 首次派发的尝试次数固定为 1，重试时递增。
      attempt: 1,
      // 携带本次派发租约，结果回流时必须原样返回。
      leaseToken,
      // 指定节点执行的绝对截止时间。
      deadlineAt: createDeadline(),
      // 携带 Runtime 已完成变量解析的节点输入。
      inputs: effect.inputs,
      // 携带 Runtime 已完成变量解析的节点配置。
      config: effect.config,
      // 携带可选的嵌套 Scope 上下文。
      scopeContext: effect.scopeContext,
    }

    // NodeRun 与 Outbox 同事务创建，进程崩溃也不会丢失待执行任务。
    await transaction.workflowNodeRun.create({
      // 将跨语言命令映射为 Prisma NodeRun 创建数据。
      data: toNodeRunData(command),
    })
    // 创建待发布的 Outbox 记录，交由 Publisher 异步发送。
    await transaction.executionOutbox.create({
      // 定义 Outbox 消息的路由信息和协议载荷。
      data: {
        // 为 RabbitMQ 消息生成独立的唯一标识。
        messageId: randomUUID(),
        // 指定节点执行命令的逻辑主题。
        topic: 'workflow.node.execute',
        // 保存完整 ExecuteNodeCommand 作为消息载荷。
        payload: command,
      },
    })
  }
}
```

文件：`apps/server/src/infra/rabbitmq/node-command.publisher.ts`

```ts
// 领取一批尚未发布且当前进程已获得处理权的 Outbox 消息。
for (const message of await outboxRepository.claimPending()) {
  // 使用 Publisher Confirm 模式把节点命令可靠发送到 RabbitMQ。
  await rabbitmq.publishWithConfirm({
    // 指定节点命令交换机。
    exchange: 'workflow.node.commands',
    // 使用统一 execute 路由键进入节点执行队列。
    routingKey: 'execute',
    // 使用 Outbox 消息标识作为 RabbitMQ Message ID。
    messageId: message.messageId,
    // 发送 Outbox 中保存的 ExecuteNodeCommand 载荷。
    payload: message.payload,
  })

  // 必须收到 RabbitMQ Confirm 后，才能标记 Outbox 已发布。
  await outboxRepository.markPublished(message.id)
}
```

RabbitMQ 拓扑：

```text
Command Exchange: workflow.node.commands
Execute Queue:    workflow.node.execute
Event Exchange:   workflow.node.events
Projector Queue:  workflow.runtime.projector
Cancel Exchange:  workflow.node.cancel
Dead Exchange:    workflow.node.dead
```

全部内置节点只使用 `workflow.node.execute`，不按节点类型拆队列。

---

## 4. 然后写 Go 执行层

### 4.1 Go 程序入口

文件：`apps/executor-go/cmd/executor/main.go`

```go
// main 负责组装配置、RabbitMQ、Executor Registry 和 Worker 生命周期。
func main() {
	// 创建可响应进程中断与终止信号的根 Context。
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	// main 退出时释放信号监听相关资源。
	defer stop()

	// 从环境变量或配置文件加载 Executor 服务配置。
	config := LoadConfig()
	// 使用配置中的地址建立 RabbitMQ 连接，失败时直接终止启动。
	connection := rabbitmq.MustConnect(config.RabbitMQURL)
	// 进程退出前关闭 RabbitMQ 连接。
	defer connection.Close()

	// 创建按节点类型保存 Executor 的注册表。
	registry := executor.NewRegistry()

	// 所有内置节点只在 Go 中注册，Node.js 不维护第二份执行器。
	registry.Register(start.NewExecutor())
	// 注册 End 节点执行器。
	registry.Register(end.NewExecutor())
	// 注册 Condition 节点执行器。
	registry.Register(condition.NewExecutor())
	// 注册使用统一 HTTP Client 的 HTTP 节点执行器。
	registry.Register(httpnode.NewExecutor(config.HTTPClient))
	// 注册使用模型网关的 LLM 节点执行器。
	registry.Register(llm.NewExecutor(config.ModelGateway))

	// 使用 RabbitMQ 连接和 Executor Registry 创建任务 Worker。
	worker := executor.NewWorker(connection, registry)
	// 阻塞运行 Worker，直到 Context 取消或发生不可恢复错误。
	if err := worker.Run(ctx); err != nil {
		// 记录致命错误并终止进程，交由编排系统重启服务。
		log.Fatal(err)
	}
}
```

### 4.2 Executor 与 Registry

文件：

- `apps/executor-go/internal/executor/executor.go`
- `apps/executor-go/internal/executor/registry.go`

```go
// Executor 定义所有内置节点执行器必须实现的统一能力。
type Executor interface {
	// Type 返回 Executor 能处理的唯一节点类型。
	Type() string
	// Execute 在给定 Context 中执行一个节点命令并返回标准结果。
	Execute(
		// ctx 传递截止时间、取消信号和链路上下文。
		ctx context.Context,
		// command 包含单节点执行所需的全部解析后数据。
		command protocol.ExecuteNodeCommand,
	// 返回标准节点结果；基础设施级异常通过 error 返回。
	) (protocol.ExecuteNodeResult, error)
}

// Get 根据节点类型从 Registry 中查找对应 Executor。
func (r *Registry) Get(
	// nodeType 是工作流协议中声明的节点类型。
	nodeType string,
	// 返回匹配的 Executor；未注册时同时返回错误。
) (Executor, error) {
	// 从内部映射读取节点类型对应的 Executor 及存在标记。
	item, ok := r.executors[nodeType]
	// 未注册对应节点类型时返回明确错误。
	if !ok {
		// 错误中保留未知节点类型，便于诊断协议或注册问题。
		return nil, fmt.Errorf("executor not found: %s", nodeType)
	}
	// 找到注册项时返回 Executor，错误值为空。
	return item, nil
}
```

### 4.3 Worker 消费任务

文件：`apps/executor-go/internal/executor/worker.go`

```go
// Handle 处理一条 RabbitMQ 节点执行消息的完整生命周期。
func (w *Worker) Handle(
	// ctx 是 Worker 生命周期的根取消上下文。
	ctx context.Context,
	// delivery 封装 RabbitMQ 消息体与确认、拒绝操作。
	delivery Delivery,
	// 处理成功返回 nil，基础设施失败返回对应错误。
) error {
	// 将消息体解码并校验为标准 ExecuteNodeCommand。
	command, err := w.protocol.DecodeCommand(delivery.Body)
	// 解码失败表示消息不符合跨语言协议。
	if err != nil {
		// 协议不合法的消息不能无限重新进入任务队列。
		return delivery.RejectToDeadLetter()
	}

	// 根据命令中的节点类型查找对应 Executor。
	item, err := w.registry.Get(command.NodeType)
	// 未注册 Executor 时发布标准失败结果并确认原消息。
	if err != nil {
		// 将查找错误转换为节点失败事件，避免任务无限重试。
		return w.publishFailureAndAck(ctx, delivery, command, err)
	}

	// 在开始执行前可靠发布 Accepted 事件。
	if err := w.publisher.PublishAccepted(ctx, command); err != nil {
		// Accepted 尚未可靠发布时，保留任务让 RabbitMQ 重新投递。
		return delivery.Requeue()
	}
	// Accepted 发布成功后确认节点命令消息，结束 RabbitMQ 投递责任。
	if err := delivery.Ack(); err != nil {
		// ACK 失败时把基础设施错误返回给 Worker 上层处理。
		return err
	}

	// 使用命令截止时间派生实际节点执行 Context。
	executionContext, cancel := context.WithDeadline(ctx, command.DeadlineAt)
	// Handle 返回前释放计时器及相关 Context 资源。
	defer cancel()

	// 启动与当前命令和租约关联的周期性心跳发布器。
	heartbeat := w.heartbeats.Start(executionContext, command)
	// 节点执行结束后停止发送心跳。
	defer heartbeat.Stop()

	// 调用匹配的 Executor 执行单个节点。
	result, err := item.Execute(executionContext, command)
	// Executor 返回基础设施级错误时转换为标准内部失败结果。
	if err != nil {
		// 保留命令关联字段并封装不可预期的执行错误。
		result = NewInternalFailure(command, err)
	}

	// 原样返回 leaseToken，NestJS 会拒绝旧 Worker 的迟到结果。
	return w.publisher.PublishResult(executionContext, result)
}
```

Command 被 ACK 后如果 Go 进程崩溃，不依赖 RabbitMQ 自动重投；NestJS 根据心跳和租约过期时间
生成新租约并重新派发，旧 Worker 即使恢复也无法覆盖新结果。

### 4.4 一个 HTTP Executor 示例

文件：`apps/executor-go/internal/executors/http/executor.go`

```go
// Executor 实现 HTTP 类型节点的单节点执行逻辑。
type Executor struct {
	// client 是复用连接池、超时和传输配置的 HTTP 客户端。
	client *http.Client
}

// Type 返回本 Executor 在 Registry 中对应的节点类型。
func (e *Executor) Type() string {
	// http 与工作流节点定义中的 nodeType 保持一致。
	return "http"
}

// Execute 根据解析后的配置和输入发起一次 HTTP 请求。
func (e *Executor) Execute(
	// ctx 控制请求取消与执行截止时间。
	ctx context.Context,
	// command 携带节点关联信息、解析后的 Inputs 与 Config。
	command protocol.ExecuteNodeCommand,
	// 返回标准节点结果；仅不可封装的基础设施异常使用 error。
) (protocol.ExecuteNodeResult, error) {
	// 将通用配置对象解码并校验为 HTTP 节点配置。
	config, err := DecodeConfig(command.Config)
	// 配置不合法属于可预期的节点校验失败。
	if err != nil {
		// 返回标准校验失败结果，error 留空以避免 Worker 当作基础设施异常。
		return protocol.ValidationFailure(command, "HTTP_CONFIG_INVALID", err), nil
	}

	// Config 和 Inputs 已由 Runtime 解析，Go 不再处理 VariableReference。
	request, err := BuildRequest(ctx, config, command.Inputs)
	// 无法构造合法 HTTP 请求时返回节点校验失败。
	if err != nil {
		// 使用稳定错误码标识请求参数或结构无效。
		return protocol.ValidationFailure(command, "HTTP_REQUEST_INVALID", err), nil
	}

	// 使用注入的 HTTP Client 发送已经绑定 Context 的请求。
	response, err := e.client.Do(request)
	// 网络、超时等发送错误按可重试的瞬态失败处理。
	if err != nil {
		// 返回标准瞬态失败结果，由上层策略决定是否重试。
		return protocol.TransientFailure(command, "HTTP_REQUEST_FAILED", err), nil
	}
	// Execute 返回前关闭响应体，避免连接和文件描述符泄漏。
	defer response.Body.Close()

	// 读取并标准化 HTTP 状态、响应头与响应体。
	output, err := ReadResponse(response)
	// 响应读取或解析失败属于 Executor 内部处理错误。
	if err != nil {
		// 返回标准内部失败结果并保留稳定错误码。
		return protocol.InternalFailure(command, "HTTP_RESPONSE_INVALID", err), nil
	}

	// 组装跨语言协议要求的成功节点结果。
	return protocol.ExecuteNodeResult{
		// 回传原命令标识，供 NestJS 关联请求与事件。
		CommandID:         command.CommandID,
		// 回传单节点运行标识，供 NestJS 定位 NodeRun。
		NodeRunID:         command.NodeRunID,
		// 回传具体 Scope 下的节点执行标识，供 Runtime 定位节点与输出。
		ExecutionKey:      command.ExecutionKey,
		// 原样回传租约，供 NestJS 拒绝旧 Worker 的迟到结果。
		LeaseToken:        command.LeaseToken,
		// 将节点终态标记为执行成功。
		Status:            protocol.NodeSucceeded,
		// 把标准化 HTTP 响应暴露为 result 输出字段。
		Outputs:           map[string]any{"result": output},
		// 激活 result Handle，使 Runtime 推进对应出边。
		ActivatedHandles: []string{"result"},
	// 返回成功结果，基础设施 error 为空。
	}, nil
}
```

Condition 只需要返回命中的 Handle；Runtime 不需要知道具体条件表达式：

```go
// 返回 Condition 节点的成功结果，由 Runtime 根据 Handle 选择分支。
return protocol.ExecuteNodeResult{
	// 将节点终态标记为执行成功。
	Status:            protocol.NodeSucceeded,
	// 仅激活实际命中的 Handle，不向 Runtime 暴露条件实现细节。
	ActivatedHandles: []string{matchedHandle},
// Condition 正常完成时基础设施 error 为空。
}, nil
```

---

## 5. 最后把 Go 结果接回 Runtime

### 5.1 RabbitMQ Consumer

文件：`apps/server/src/infra/rabbitmq/node-event.consumer.ts`

```ts
// 将节点事件消费者注册为可由 NestJS 注入的 Provider。
@Injectable()
// 负责消费 RabbitMQ 节点事件并转交业务服务处理。
export class NodeEventConsumer {
  // 注入负责事务处理和 Runtime 恢复的事件服务。
  constructor(private readonly workflowEventService: WorkflowEventService) {}

  // 处理一条 RabbitMQ 节点事件消息并决定 ACK 或 NACK。
  async handle(
    // 当前 RabbitMQ 投递对象，封装消息体与 ACK、NACK 操作。
    message: RabbitMessage,
    // 消息处理及确认成功时完成，不返回业务数据。
  ): Promise<void> {
    // 捕获解析、业务事务和消息确认阶段的异常。
    try {
      // 按协议解析并校验 RabbitMQ 消息体。
      const event = parseNodeEvent(message.body)
      // 将合法事件交给 WorkflowEventService 原子处理。
      await this.workflowEventService.handle(event)

      // Service 的数据库事务提交成功后，才能 ACK RabbitMQ Event。
      message.ack()
      // 任意阶段失败时根据错误类型决定是否重新投递。
    } catch (error) {
      // 临时错误重新投递；不可恢复错误由统一策略进入死信。
      message.nack({ requeue: isRetryableConsumerError(error) })
    }
  }
}
```

### 5.2 Event Service 恢复 Runtime

文件：`apps/server/src/services/workflow-event.service.ts`

```ts
// 将工作流事件服务注册为可由 NestJS 注入的 Provider。
@Injectable()
// 负责幂等保存节点事件，并在终态事件到达时恢复和推进 Runtime。
export class WorkflowEventService {
  // 注入事务客户端与 Runtime 迁移写入器。
  constructor(
    // 提供 Prisma 数据库事务能力。
    private readonly prisma: PrismaService,
    // 负责在当前事务中保存新状态、NodeRun 和后续 Outbox。
    private readonly transitionWriter: RuntimeTransitionWriter,
  ) {}

  // 在单个数据库事务中处理一条标准节点事件。
  async handle(
    // 已通过跨语言 Schema 校验的节点事件。
    event: NodeEvent,
    // 事件事务处理成功时完成，不返回业务数据。
  ): Promise<void> {
    // 使用事务保证 Inbox、NodeRun、RunEvent 和 Runtime 迁移原子提交。
    await this.prisma.$transaction(async (transaction) => {
      // 按 messageId 插入 Inbox，仅首次插入返回成功。
      const inserted = await insertInboxOnce(transaction, event.messageId)

      // RabbitMQ 可能重复投递，Inbox 已存在时直接按成功处理。
      if (!inserted) return

      // 加行锁读取事件关联的 NodeRun，防止并发事件交叉覆盖。
      const nodeRun = await findNodeRunForUpdate(transaction, event.nodeRunId)

      // 已经过期的 Worker 不能覆盖新租约产生的结果。
      if (nodeRun.leaseToken !== event.leaseToken) return

      // 根据事件类型更新 NodeRun 的状态、心跳、增量或最终结果。
      await applyEventToNodeRun(transaction, nodeRun, event)
      // 追加不可变运行事件，供审计、SSE 和故障恢复使用。
      await appendRunEvent(transaction, event)

      // Accepted、Heartbeat 或 Delta 等非终态事件无需推进 Runtime。
      if (!isTerminalNodeEvent(event)) return

      // 对工作流运行记录加锁，串行应用可能并发完成的节点结果。
      const run = await findWorkflowRunForUpdate(transaction, event.runId)
      // 使用运行时保存的工作流快照重建完全相同的 Runtime。
      const runtime = createWorkflowRuntime(run.workflowSnapshot)
      // 将节点终态结果应用到已持久化状态并计算下一次迁移。
      const transition = runtime.applyNodeResult(
        // 传入上一次成功持久化的完整 RuntimeState。
        run.runtimeState,
        // 传入终态事件载荷中的标准节点执行结果。
        event.payload.result,
      )

      // 新状态和下一批 Outbox 继续在当前事务中写入。
      await this.transitionWriter.write(transaction, run, transition)
    })
  }
}
```

到这里，一次完整循环结束：

```text
Runtime 产生节点任务
  → NestJS 写 Outbox
  → Go 执行节点
  → NestJS 保存结果
  → Runtime 计算下一批节点
```

SSE 从持久化后的 `WorkflowRunEvent` 推送，不能让 Go 直接维护前端连接。

---

## 6. 跨语言协议

`workflow-protocol` 不下沉到 Runtime。它同时被 Runtime、NestJS MQ 适配层和 Go 消费。

```text
packages/workflow-protocol/schemas
              │
              ├──生成──> packages/workflow-protocol/src/generated
              └──生成──> apps/executor-go/internal/protocol/generated.go
```

只有 Schema 可以手工修改，生成文件禁止手工维护。

| 文件                               | 作用                                  |
| ---------------------------------- | ------------------------------------- |
| `schemas/node-command.schema.json` | Runtime 到 Go 的单节点任务            |
| `schemas/node-result.schema.json`  | Go 返回的节点终态结果                 |
| `schemas/node-event.schema.json`   | Accepted、Heartbeat、Delta 和终态事件 |

Command 只包含单个节点需要的数据，不能携带完整 Workflow、Edge 或其他节点状态。

`workflow-protocol` 是跨语言边界，不能导入 TypeScript Core 或 Runtime 类型。三个 JSON Schema
必须在 `$defs` 中定义递归 `jsonValue` 和 `jsonObject`，生成的 TypeScript 值类型应与 Core 的
`JsonValue` 保持结构兼容，协议对象应与 Runtime 使用的 `Record<string, JsonValue>` 兼容，Go
则生成对应 JSON 值容器。协议中不允许使用无边界的 `Record<string, unknown>`。

`nodeId` 和 `nodeType` 在协议 Schema 中仍然是非空字符串，因为 Core 的节点注册表允许扩展，
Go 协议也不能依赖 TypeScript 的 `WorkflowNode`。强约束发生在进入 Runtime 前的 Core Workflow
校验，以及 `RuntimeEffect` 转换为 Command 时的 TypeScript 结构检查。

```ts
// 以下 JSON 类型由跨语言 Schema 生成，不在生成文件中手工维护。
// 定义协议允许直接传输的 JSON 基础值。
export type ProtocolJsonPrimitive = string | number | boolean | null

// 定义协议允许传输的 JSON 对象。
export interface ProtocolJsonObject {
  // 每个属性值都必须符合递归协议 JSON 值约束。
  [key: string]: ProtocolJsonValue
}

// 定义协议允许跨 TypeScript 和 Go 传输的递归 JSON 值。
export type ProtocolJsonValue =
  // 允许 JSON 基础值。
  | ProtocolJsonPrimitive
  // 允许嵌套 JSON 对象。
  | ProtocolJsonObject
  // 允许嵌套 JSON 数组。
  | ProtocolJsonValue[]

// 定义节点执行时所在的 Loop Scope 路径。
export interface ScopeContext {
  // 按从外到内的顺序保存 scopeKey；根 Scope 使用空数组且通常省略整个上下文。
  scopePath: string[]
}

// 定义 Go Loop Executor 可以返回、由 Runtime 解释的通用 Scope 状态迁移指令。
export type RuntimeDirective =
  // 创建 Loop 的第一次迭代 Scope。
  | {
      type: 'ENTER_SCOPE'
      // 第一次进入必须为 1，Runtime 需要验证该值。
      iteration: number
    }
  // 结束当前迭代并创建下一次迭代 Scope。
  | {
      type: 'REPEAT_SCOPE'
      // 必须等于当前迭代加 1，Runtime 需要拒绝跳号或倒退。
      iteration: number
    }
  // 结束当前迭代并离开 Loop，不再创建新 Scope。
  | {
      type: 'EXIT_SCOPE'
    }

// 定义 NestJS 派发给 Go Worker 的单节点执行命令。
export interface ExecuteNodeCommand {
  // 当前命令的全局唯一标识，用于消息追踪和事件关联。
  commandId: string
  // 当前逻辑执行的幂等键，用于避免重复创建等价任务。
  idempotencyKey: string
  // 所属工作流运行的唯一标识。
  runId: string
  // 本次单节点运行记录的唯一标识。
  nodeRunId: string
  // 工作流定义中的节点标识。
  nodeId: string
  // Go Registry 用于选择 Executor 的节点类型。
  nodeType: string
  // 包含 Scope 和迭代信息的节点执行唯一键。
  executionKey: string
  // 当前节点任务的派发尝试次数。
  attempt: number

  // 每次重新派发都生成新租约，用于拒绝旧 Worker 的迟到结果。
  leaseToken: string
  // 节点任务必须完成的绝对截止时间。
  deadlineAt: string
  // Runtime 已完成变量解析且满足协议 JSON 对象约束的节点业务输入。
  inputs: ProtocolJsonObject
  // Runtime 已完成变量解析且满足协议 JSON 对象约束的节点配置。
  config: ProtocolJsonObject
  // 节点位于某次 Loop 迭代内时携带的可选 Scope 上下文。
  scopeContext?: ScopeContext
}

// 定义 Go Worker 返回给 NestJS 和 Runtime 的标准节点终态结果。
export interface ExecuteNodeResult {
  // 原样回传命令标识，供消息链路关联。
  commandId: string
  // 原样回传 NodeRun 标识，供 NestJS 定位单节点运行记录。
  nodeRunId: string
  // 原样回传执行键，供 Runtime 定位节点和保存输出。
  executionKey: string
  // 原样回传当前租约，供 NestJS 拒绝过期 Worker 的结果。
  leaseToken: string
  // 节点的成功、失败或挂起终态。
  status: 'SUCCEEDED' | 'FAILED' | 'SUSPENDED'
  // 节点成功时产生且满足协议 JSON 对象约束的可选输出字段集合。
  outputs?: ProtocolJsonObject

  // Runtime 只解释 Handle，不检查返回结果的节点类型。
  activatedHandles: string[]
  // Loop Executor 用于改变迭代 Scope 的可选通用指令。
  directive?: RuntimeDirective
  // 节点失败时返回的可选标准化错误。
  error?: NodeExecutionError
}
```

---

## 7. Loop 与 Sub Workflow 如何进入这条链

### 7.1 Loop

每个 Scope 内仍然是 DAG，Loop 不使用图回边：

1. Runtime 像普通节点一样派发 Loop Executor。
2. Go 判断条件，返回 Scope Enter、Repeat 或 Exit。
3. `ENTER_SCOPE` 创建 iteration 1；`REPEAT_SCOPE` 将当前 Scope 标记为 `COMPLETED` 并创建
   iteration + 1；`EXIT_SCOPE` 结束当前 Scope 且不再创建新迭代。
4. Runtime 再次通过 DAG Scheduler 计算该 Scope 的 Ready 节点。

Loop 条件和是否继续只在 Go 中判断；Runtime 不解释 Loop 业务配置，只验证 Directive 的迭代号
严格递增，并负责初始化 Scope 内部节点和边状态。嵌套 Loop 的新 Scope 必须保存
`parentScopeKey`，`ScopeContext.scopePath` 则按从外到内的顺序携带完整 Scope 链。

### 7.2 Sub Workflow

1. Go 返回 `Suspend + workflow.run`。
2. NestJS Capability Handler 创建子 Run。
3. 当前 NodeRun 进入 Suspended。
4. 子 Run 完成后，Runtime 使用 Resume 重新派发同一节点。
5. Go 接收子 Run 输出并返回最终结果。

Go 不读取或执行子 Workflow 的 DAG。子 Workflow 使用独立 `WorkflowRun` 和 `RuntimeState`，不写入
父状态的 `scopes`；父节点与 `childRunId` 的关联由 NestJS NodeRun/Capability 状态持久化。

---

## 8. 文件清单与实现顺序

### 8.1 按调用顺序的文件

| 顺序 | 文件                                                         | 作用                                         |
| ---- | ------------------------------------------------------------ | -------------------------------------------- |
| 1    | `packages/workflow-core/src/node/workflow-node-schema.ts`    | 直接公开已有 JsonValue 和 JSON Schema        |
| 2    | `packages/workflow-runtime/package.json`                     | 显式声明对 Core 的 workspace 依赖            |
| 3    | `packages/workflow-runtime/src/index.ts`                     | Runtime 公开入口                             |
| 4    | `packages/workflow-runtime/src/runtime/runtime-types.ts`     | 定义 Runtime 输入、状态和 Effect             |
| 5    | `packages/workflow-runtime/src/runtime/workflow-runtime.ts`  | 校验启动上下文、应用结果和推进状态机         |
| 6    | `packages/workflow-runtime/src/variable/*`                   | 解析 Inputs、Config 和 Workflow Outputs      |
| 7    | `packages/workflow-runtime/src/dag/dag-scheduler.ts`         | 计算 Ready、Waiting 和 Skipped               |
| 8    | `apps/server/src/controllers/workflow-run.controller.ts`     | 接收启动请求                                 |
| 9    | `apps/server/src/services/workflow-run.service.ts`           | 使用 Core 校验 Workflow 并调用 Runtime       |
| 10   | `apps/server/src/infra/runtime/runtime-transition.writer.ts` | 保存状态、NodeRun 和 Outbox                  |
| 11   | `apps/server/src/infra/rabbitmq/node-command.publisher.ts`   | 可靠发布节点任务                             |
| 12   | `packages/workflow-protocol/schemas/*`                       | 定义跨语言 JSON 值、Command、Result 和 Event |
| 13   | `apps/executor-go/cmd/executor/main.go`                      | 组装 Worker 和全部 Executor                  |
| 14   | `apps/executor-go/internal/executor/worker.go`               | 消费任务并执行节点                           |
| 15   | `apps/executor-go/internal/executors/*/executor.go`          | 内置节点唯一实现                             |
| 16   | `apps/server/src/infra/rabbitmq/node-event.consumer.ts`      | 消费 Go 节点事件                             |
| 17   | `apps/server/src/services/workflow-event.service.ts`         | 保存结果并再次调用 Runtime                   |

### 8.2 推荐实施顺序

1. 直接导出 Core 已有的 `JsonValue/jsonValueSchema`，不改变现有 Schema 行为。
2. 为 Runtime 声明 Core workspace 依赖，并补齐公开入口、RuntimeState 和 ExecutionPlan。
3. 复用 Start `NodeOutputDefinition[]` 和系统变量定义，实现动态输入校验、身份一致性校验、
   变量解析和 Edge 状态 DAG。
4. 使用内存中的假节点结果验证 `start()` 与 `applyNodeResult()`。
5. 建立带递归 JSON `$defs` 的协议 Schema，并生成 TypeScript 和 Go 类型。
6. 实现 NestJS Controller、Service、TransitionWriter、Outbox 和 Inbox。
7. 实现 RabbitMQ 拓扑、Publisher 和 Consumer。
8. 建立 Go Main、Worker、Registry 和 Start、End、Condition、HTTP Executor。
9. 跑通 `Start → HTTP → Condition → End`。
10. 验证并行、汇聚、Skip 传播、变量路径和服务重启恢复。
11. 再实现 LLM、RAG、Code、Loop 和 Sub Workflow。

第一阶段完成标准：

- Runtime 能产生第一批节点 Effect，并在结果返回后继续调度。
- Core 是 Workflow、节点、边、变量引用、JsonValue、系统变量键及定义的唯一领域类型来源。
- Start 输入由 Runtime 复用 Core 的 Start `outputs` 动态定义完成校验和默认值归一化。
- Runtime、NestJS 和 TypeScript 协议不使用 `Record<string, unknown>` 表达持久化或跨语言值。
- Inputs 和 Config 在离开 Runtime 前已经完成变量解析。
- NestJS 能在同一事务中保存 RuntimeState、NodeRun 和 Outbox。
- 全部内置节点只在 Go 中实现，并进入同一个 Execute Queue。
- Go 返回 Handles 后，Runtime 能正确推进条件分支和并行汇聚。
- Node.js、Go 或 RabbitMQ 重启后，可以从 PostgreSQL 恢复未完成运行。
