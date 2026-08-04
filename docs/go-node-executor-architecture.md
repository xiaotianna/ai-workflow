# Go 节点执行器架构

> 状态：根作用域 Runtime、Workflow Protocol、Server Outbox/Inbox、RabbitMQ Publisher/Consumer 和
> Go Worker 已接入；LLM、HTTP、Code 与 Condition 已实现真实业务执行，RAG 仍为最小实现。
>
> 本文只定义职责、边界、关键契约和实施顺序，不提供可直接复制的逐文件伪实现。实际实现始终以
> `@ai-workflow/core`、`@ai-workflow/runtime`、`@ai-workflow/protocol` 和 `apps/server` 的源码为准。

## 1. 结论

这套执行架构遵守以下原则：

1. `@ai-workflow/core` 是工作流结构和静态业务校验的唯一来源。
2. `buildExecutionPlan()` 只把已经通过执行前校验的 Workflow 转换为查询索引，不重复校验节点、
   Edge、端口、环或 Loop 结构。
3. `@ai-workflow/runtime` 负责状态机、变量解析、DAG 调度和运行时动态校验，不执行数据库、MQ 或
   节点业务副作用。
4. NestJS 是运行宿主，负责版本快照、事务、持久化、Outbox/Inbox、租约、鉴权和对外事件。
5. Go Executor 一次只执行一个业务节点，不接收完整 Workflow，也不自行调度 DAG。
6. TypeScript 与 Go 之间只传递 `@ai-workflow/protocol` 定义的版本化 JSON 消息。
7. 第一阶段先跑通根作用域 DAG；Loop、Sub Workflow、流式事件、取消和业务重试在基础状态机稳定后
   分阶段接入。

最重要的依赖方向如下：

```text
@ai-workflow/core
        ↑
@ai-workflow/runtime ← @ai-workflow/protocol → Go Executor
        ↑                         ↑
        └──────── NestJS Server ──┘
```

`Core` 不依赖 Runtime、Server 或 Go 协议，Protocol 也不依赖 Core 的 TypeScript 类型。

## 2. 当前仓库基线

本文不能把规划写成已经落地的能力。当前真实状态是：

| 范围                    | 已有内容                                                                          | 仍缺少的内容                                  |
| ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| `@ai-workflow/core`     | Workflow、节点、Edge、变量、节点注册表、配置 Schema、保存校验和执行前校验         | Workflow outputs 与 Config 引用等后续静态规则 |
| `@ai-workflow/runtime`  | 根作用域 ExecutionPlan、状态机、变量解析、DAG 调度、恢复和公开入口                | Loop、Sub Workflow、取消、业务重试和流式事件  |
| `@ai-workflow/protocol` | v1 Schema、TypeScript/Go codec，并已用于 RabbitMQ Command/Result 边界             | 后续协议版本和流式事件                        |
| `apps/server`           | 测试运行、RuntimeState revision、Outbox/Result、CAS、运行状态 SSE 与 LLM 模型解析 | 通用 Secret Gateway                           |
| Go Executor             | RabbitMQ Worker、Publisher Confirm、Registry，以及真实 LLM、HTTP、Code、Condition | 持久化幂等副作用存储和真实 RAG Executor       |

`packages/workflow-runtime/src` 已按本文第一阶段边界形成可用公共 API；`packages/workflow-protocol`
的 JSON Schema 是 TypeScript 与 Go 消息校验的唯一来源。后续能力仍需遵守 State Schema 和协议版本策略。

## 3. 组件职责

### 3.1 Core：领域模型和静态正确性

Core 负责回答“这个工作流定义是否可以执行”，包括：

- Workflow、Node、Edge、Port、VariableValue 和环境变量的结构；
- 节点类型是否注册，节点配置是否符合该节点的 Zod Schema；
- 动态端口和 Edge 是否合法；
- Loop 的静态父子关系和作用域边界；
- 节点输入引用是否指向执行路径中的上游输出；
- 执行前必填端口和有向无环约束。

Core 不负责某一次 Run 的输入值、节点输出、重试次数、数据库状态或 MQ 消息。

### 3.2 Runtime：纯状态机

Runtime 负责回答“基于当前状态，下一步应该发生什么”，包括：

- 根据 Start 节点声明校验并归一化本次调用输入；
- 解析节点输入、系统变量、环境变量和上游输出引用；
- 维护 Node、Edge、执行实例和后续 Loop Scope 的运行状态；
- 计算 Ready、Skipped 和完成状态；
- 接收节点结果并产生新的状态与 Effect；
- 从 Workflow.outputs 解析最终输出；
- 校验恢复后的 RuntimeState 与当前 Run、Workflow 快照身份一致。

Runtime 不直接访问 Prisma、RabbitMQ、Redis、HTTP Controller、模型供应商或知识库。

### 3.3 NestJS：运行宿主

NestJS 负责：

- 选择不可变的 WorkflowVersion 快照；
- 依次调用 Core 的结构校验和执行前校验；
- 创建 WorkflowRun，组装系统变量和运行输入；
- 调用 Runtime 并持久化 RuntimeTransition；
- 在同一事务内保存 RuntimeState、NodeRun 和 Outbox；
- 发布命令、消费结果、做 Inbox 幂等和租约校验；
- 串行化同一个 Run 的状态推进，避免并发结果互相覆盖；
- 实现取消、超时、恢复、SSE、凭证和子工作流等宿主能力。

### 3.4 Go Executor：单节点业务执行

Go Executor 负责：

- 校验并解码协议命令；
- 根据 `nodeType` 从 Registry 选择 Executor；
- 执行 HTTP、LLM、RAG、Code、Condition 等节点业务；
- 返回结构化输出、激活的输出 Handle 或稳定错误；
- 遵守 deadline、幂等键和租约，不接受过期任务继续写回有效结果。

Go Executor 不读取 Workflow 表、不解释整张图、不查找上下游节点，也不决定下一个节点是谁。

## 4. 校验只有一个所有者

### 4.1 正确调用顺序

所有来自请求、数据库或导入文件的 Workflow JSON 都必须先经过 Core：

```ts
const parsed = workflowSchema.safeParse(rawWorkflow)
if (!parsed.success) {
  return parsed.error.issues
}

const issues = validateExecutorWorkflow(parsed.data, nodeRegistry)
if (issues.length > 0) {
  return issues
}

const runtime = createWorkflowRuntime(parsed.data)
```

执行场景不需要先调用 `validateWorkflow()`。`validateExecutorWorkflow()` 已经包含保存阶段的基础规则，
并额外检查执行所需的必填端口和环。

### 4.2 Core 当前已经覆盖的规则

按当前源码，执行前校验已经覆盖：

- 节点 ID 唯一、节点类型已注册、节点 Config Schema 合法；
- 动态端口解析；
- Edge ID 和连接唯一；
- Edge 两端节点、sourceHandle 和 targetHandle 存在；
- 端口 `multiple` 连接数限制；
- Loop 父节点存在且必须为 Loop，父子关系无环；
- 每个 Loop 恰好直接包含一个 `loop_start` 和一个 `loop_exit`；
- Loop 内不能使用根 Start/End，Edge 不能跨 Loop 作用域；
- 节点输入中的环境变量引用存在；
- 节点输入中的节点引用只读取连线可达的上游公开输出；
- 执行前必填输入端口已经连接；
- 工作流不存在执行 Edge 环。
- 根作用域恰好一个 Start、至少一个 End，且所有根节点都可从 Start 到达并可到达 End。

Edge 当前不按 `dataType` 阻止连接，这是现有领域设计，不应在 Runtime 恢复一套类型连线校验。

### 4.3 已知静态校验空缺

下面规则如果被确定为“可执行 Workflow 的必要条件”，应补进 Core 的
`validateExecutorWorkflow()`，不能由 `buildExecutionPlan()`、`parseStartInputValues()` 或
NestJS 私下实现：

- 根作用域是否必须且只能有一个 Start；
- 是否必须存在 End，以及节点是否必须从 Start 可达并能到达某个 End；
- `Workflow.outputs[].value` 的引用是否存在、可达且类型兼容；
- HTTP、Condition 等节点 Config 内的 VariableValue 引用是否合法；
- Start、End、Loop 系统节点是否还需要额外的入度、出度约束。

这里列出的是当前源码空缺，不代表所有规则都必须采用。先确定产品语义，再在 Core 增加一次规则，
所有编辑器、发布和执行入口共同复用。

### 4.4 运行时动态校验

以下信息只有某一次 Run 才存在，因此属于 Runtime 或协议边界，而不属于 Core 静态校验：

| 数据                | 所有者        | 校验内容                                       |
| ------------------- | ------------- | ---------------------------------------------- |
| 调用输入            | Runtime       | 未知字段、必填字段、默认值、JSON 值和 dataType |
| 系统变量实际值      | Runtime       | 键集合、JSON 值、dataType 和 Run/Workflow 身份 |
| 上游节点实际输出    | Runtime       | executionKey、可见 Scope、字段和 path 是否存在 |
| 恢复的 RuntimeState | Runtime       | Schema 版本、结构、身份和索引一致性            |
| MQ Command/Result   | Protocol 两端 | 协议版本、判别联合、JSON 约束和必填关联字段    |
| 单节点外部资源      | Server/Go     | 模型、知识库、凭证、网络策略和运行时可用性     |

## 5. `buildExecutionPlan()` 只建立索引

### 5.1 前置条件

`buildExecutionPlan(workflow)` 的前置条件是：调用方已经完成
`workflowSchema.safeParse()` 和 `validateExecutorWorkflow()`，并且后续运行绑定同一份不可变
WorkflowVersion 快照。

它不是第二个 Validator，也不是容错入口。若某个静态不变量尚未由 Core 保证，应先完善 Core，
而不是在 Compiler 中补一个 `RuntimeError('EXECUTION_PLAN_INVALID')`。

### 5.2 ExecutionPlan 的最小内容

第一阶段只需要这些派生索引：

```ts
interface ExecutionPlan {
  workflow: Workflow
  nodeById: ReadonlyMap<string, WorkflowNode>
  incomingEdges: ReadonlyMap<string, readonly WorkflowEdge[]>
  outgoingEdges: ReadonlyMap<string, readonly WorkflowEdge[]>
  childrenByScope: ReadonlyMap<'root' | string, readonly string[]>
  edgesByScope: ReadonlyMap<'root' | string, readonly WorkflowEdge[]>
}
```

构建过程只做机械投影：

1. 遍历 `workflow.nodes` 建立 `nodeById` 和 `childrenByScope`；
2. 遍历 `workflow.edges` 建立入边、出边和所在静态 Scope 的 Edge 索引；
3. 返回只供本次 Runtime 使用的内存对象。

禁止在这里重复实现：

- 节点或 Edge ID 唯一性检查；
- 节点类型、Config Schema 和动态端口检查；
- Edge 端点、Handle、连接数检查；
- DAG 环检查；
- Loop parentId、系统节点数量和跨 Scope 检查；
- Start/End 数量、可达性或变量引用检查。

ExecutionPlan 不需要持久化。恢复时从 WorkflowVersion 快照重新构建，再用 RuntimeState Schema 和
身份字段校验恢复状态。

如果后续发现索引只承担查询优化，可以把名称改为 `createExecutionIndex()`；无论名称如何，都不改变
“无业务判断的纯派生数据”这一边界。

## 6. Runtime 契约

### 6.1 输入、状态和 Effect

Runtime 的入口应保持很小：

```ts
interface WorkflowRuntime {
  start(input: StartRuntimeInput): RuntimeTransition
  applyNodeResult(state: RuntimeState, result: ExecuteNodeResult): RuntimeTransition
}

interface RuntimeTransition {
  state: RuntimeState
  effects: RuntimeEffect[]
}
```

`RuntimeState` 至少保存：

- `schemaVersion`、`runId`、`workflowId` 和 WorkflowVersion 身份；
- 归一化后的调用输入与系统变量；
- 根图 Node/Edge 状态；
- `executionKey → nodeId/scopeKey` 的显式映射；
- 节点输出和标准化错误；
- 状态修订号或由宿主维护的并发版本；
- Loop 落地后新增的独立迭代 Scope 状态。

不要通过拆解 `executionKey` 字符串恢复 nodeId 或 Scope。`executionKey` 对 Runtime 外部保持不透明，
状态中保存明确的反向索引。

第一阶段 Effect 只需要：

- `DISPATCH_NODE`：派发一个可执行业务节点；
- `COMPLETE_RUN`：携带最终 Workflow 输出；
- `FAIL_RUN`：携带可持久化的 RuntimeErrorData。

取消节点、启动子工作流、获取宿主能力等 Effect 在对应功能实施时再加入，不预建空联合类型。

### 6.2 Start 和 End

Start、End 是编排节点，不需要为了“全部节点都走 Go”而增加一次无业务价值的 MQ 往返：

- Start 由 Runtime 注入归一化后的调用输入，并激活它的出边；
- End 到达后只表示当前路径完成；
- Workflow 的最终结果统一从 `Workflow.outputs` 解析，不从 End.config 重复读取。

宿主如果需要完整审计，可以为本地控制节点写 NodeRun，但不应伪造 Go Command。

### 6.3 DAG 推进规则

根 DAG 使用三态 Edge：

- `WAITING`：上游尚未进入终态；
- `ACTIVE`：上游结果激活了该 sourceHandle；
- `INACTIVE`：该分支未选择或上游被 Skip。

推荐的汇聚语义是：

1. 节点先等待全部入边离开 `WAITING`；
2. 至少一条入边为 `ACTIVE` 时，节点执行一次；
3. 全部入边均为 `INACTIVE` 时，节点标记为 `SKIPPED`；
4. Skip 必须继续向下传播，直到状态稳定；
5. 无入边节点是否可执行由 Core 的 Start/可达性规则决定，不由调度器猜测。

普通成功节点通常激活与其输出 Handle 对应的出边；Condition 返回被选中的 Handle。Runtime 只解释
`activatedHandles`，不重新计算 Condition 业务表达式。

### 6.4 变量解析

Runtime 统一解析 `VariableValue`：

- `value`：先验证是 Core `JsonValue`；
- `node` 引用：按当前 execution location 查找可见的上游输出；
- `system` 引用：读取本次 Run 已验证的系统变量；
- `env` 引用：按稳定 variableId 读取 Workflow 快照中的变量；
- 非空 `path`：逐段读取对象字段，缺失时返回稳定 Runtime 错误。

`node.inputs` 的每个字段明确都是 VariableValue，可以通用解析。

不要对任意 `node.config` 做“递归扫描，看到形似 `{ type: 'reference' }` 的对象就替换”。这种结构
猜测可能误伤普通 JSON 配置。Config 中可引用变量的位置必须由 Core 的节点契约显式声明；可以在
NodeType 增加运行时投影/绑定描述，再由 Runtime 通用执行。契约确定前，不新增一个硬编码全部节点
类型的 Runtime switch。

节点 Config 已在 Core 通过对应 NodeType Schema；变量解析后的最终 `inputs` 和 `config` 还必须是
JSON 对象，之后才能进入 Protocol。

Secret 不以明文写入 RuntimeState、NodeRun、Outbox 或 MQ。需要 Secret 的节点应接收短期凭证或
不可反解的 Pointer，由受信任的宿主边界校验当前 Run、NodeRun 和租约后解析。这个能力未落地前，
执行兼容性检查应拒绝需要 Secret 的 Workflow。

### 6.5 运行错误

Runtime 内部可以抛出 `RuntimeError`，但跨数据库、API 或 MQ 只保存纯 JSON 错误数据：

```ts
interface RuntimeErrorData {
  code: string
  message: string
  details?: Record<string, JsonValue>
}
```

不要持久化 JavaScript Error、stack、cause 或 Go error 文本拼接结果。Runtime 错误码和节点执行错误码
分属不同契约，避免互相污染。

## 7. 跨语言协议

### 7.1 单一来源

`packages/workflow-protocol/schemas` 保存手写 JSON Schema，并生成：

```text
JSON Schema
  ├── TypeScript generated types + parsers
  └── Go generated structs + validation helpers
```

生成文件不手工修改。Protocol 不导入 Core；它在 Schema 中独立声明递归 JSON 值，生成后的结构只需
与 Core `JsonValue` 兼容。

### 7.2 第一阶段消息

Node Command 至少包含：

- `protocolVersion`、`commandId`、`idempotencyKey`；
- `runId`、`nodeRunId`、`nodeId`、`nodeType`、`executionKey`；
- `attempt`、`leaseToken`、`deadlineAt`；
- 已解析的 `inputs` 和 `config` JSON 对象；
- Loop 实施后才增加的可选 Scope 上下文。

Node Result 至少包含：

- 原样回传的 `protocolVersion`、`commandId`、`nodeRunId`、`executionKey` 和 `leaseToken`；
- `SUCCEEDED` 或 `FAILED` 判别状态；
- 成功时的 `outputs` 和 `activatedHandles`；
- 失败时的稳定 `code`、`message`、`retryable` 和 JSON details。

Command 不携带完整 Workflow、Edge、其他节点输出、数据库连接信息或长期凭证。

消息解析必须发生在两端边界。TypeScript 类型断言和 Go `json.Unmarshal` 成功都不能替代完整协议
Schema 校验。

### 7.3 交付语义

RabbitMQ 链路按 at-least-once 设计：

- 相同 `idempotencyKey` 的重复 Command 不能产生重复业务副作用；
- 每次有效派发使用新的 `leaseToken`；
- NestJS 只接受与当前 NodeRun 租约一致的结果；
- `commandId` 用于消息追踪，不代替业务幂等键；
- Ack 必须发生在结果已经可靠发布或持久化之后。

第一阶段只传终态 Result。Heartbeat、Delta 和流式输出等事件确有消费方后再扩展，避免一开始维护
三套尚未使用的事件语义。

## 8. NestJS 持久化与并发

### 8.1 已有模型如何使用

- `WorkflowVersion.definition` 保存不可变 Workflow 快照；
- `WorkflowRun` 保存一次运行的身份、输入、终态输出和错误；
- `WorkflowNodeRun` 保存某个 executionKey 的具体 attempt、输入、输出和错误。

当前 Prisma 已在 `WorkflowRun` 上保存 RuntimeState JSON 与 revision，并增加：

- Command Outbox；
- Result Inbox 消费幂等记录；
- NodeRun 的 commandId、idempotencyKey、leaseToken、deadlineAt 与恢复索引。

测试运行结果事务校验 commandId、NodeRun、leaseToken 与 revision CAS。Outbox Publisher 使用
`FOR UPDATE SKIP LOCKED` 领取命令，stale `PUBLISHING` claim 会被重新领取；Result Consumer 发生临时
处理错误时进入 TTL retry queue，超过次数后进入 DLQ。超时扫描仍未实现。

### 8.2 启动事务

启动一次 Run 的顺序：

1. 读取目标 WorkflowVersion.definition；
2. 使用 Core 完成结构和执行前校验；
3. 检查当前 Executor 能力是否支持快照中的全部业务节点；
4. 创建 WorkflowRun 并组装 StartRuntimeInput；
5. 调用 `runtime.start()`；
6. 在同一数据库事务中保存 RuntimeState、NodeRun 和 Command Outbox；
7. 事务提交后由 Publisher 发布 Outbox。

若 Core 校验失败，不创建一个看似已经排队的 Run 再异步失败。

### 8.3 结果事务

处理一个 Go Result 的顺序：

1. 校验 Protocol；
2. 以 messageId/commandId 写入或确认 Inbox 幂等记录；
3. 锁定 Run 或使用 revision compare-and-set；
4. 校验 NodeRun、attempt 和 leaseToken；
5. 恢复 Workflow 快照和 RuntimeState；
6. 调用 `runtime.applyNodeResult()`；
7. 在同一事务中更新 NodeRun、RuntimeState、Run 终态和新的 Outbox；
8. 提交成功后 Ack Result。

同一个 Run 的多个并行结果可以同时到达 MQ，但 Runtime 状态迁移必须串行提交。发生 revision 冲突时
重新读取最新状态并重放尚未消费的结果，不能覆盖另一条已提交迁移。

### 8.4 恢复

恢复不依赖内存中的 Runtime 实例：

1. 读取 WorkflowVersion.definition 并再次通过 Core 解析；
2. 从同一快照重新建立 ExecutionPlan；
3. 使用 RuntimeState Schema 解析持久化 JSON；
4. 校验 runId、workflowId、versionId 和系统变量身份；
5. 根据未完成 NodeRun、当前租约和 Outbox 状态决定等待、重新派发或超时。

Redis 可以辅助短期锁和通知，但不能成为 Workflow、RuntimeState、Outbox 或执行结果的唯一事实来源。

## 9. Go Executor 内部结构

Go 侧保持三个核心抽象：

```go
type Executor interface {
    Execute(ctx context.Context, command NodeCommand) NodeResult
}

type Registry interface {
    Get(nodeType string) (Executor, bool)
}

type Worker struct {
    registry Registry
    // codec、publisher、日志和观测依赖
}
```

当前 `apps/executor-go` 已提供 RabbitMQ Worker、无 fallback 的 Registry 和 `internal/executors`
分节点实现。LLM 按 Core Config 解析模型引用、上下文、参数和异常处理，通过受租约保护的 Server
解析接口获取真实模型配置，再从独立 Provider Registry 选择 OpenAI、DeepSeek 或 Ollama 适配器；
展示快照不参与执行，API Key 不进入 MQ。其余节点仍为最小实现。Worker 只有在 Result 获得
Publisher Confirm 后才 Ack Command。

处理流程固定为：

1. 解码并校验 Command；
2. 检查协议版本、deadline 和幂等状态；
3. 从 Registry 查找 nodeType；
4. 为节点执行创建带 deadline 的 context；
5. 调用 Executor；
6. 校验输出满足 JSON 协议；
7. 可靠发布 Result 后 Ack Command。

每个节点 Executor 只解析自己的 Config，不共享一个包含所有节点字段的巨大联合结构。未知 nodeType
返回稳定的不可重试错误，同时应由 NestJS 的执行兼容性检查尽量在创建 Run 前阻止。

## 10. 控制节点和分阶段能力

### 10.1 第一阶段：根 DAG

第一阶段只实现：

- Runtime 本地 Start/End；
- 根作用域节点状态和 Edge 状态；
- 并行派发、分支 Handle、汇聚和 Skip 传播；
- Start 输入、系统变量、节点输入和 Workflow 输出解析；
- 单节点 Command/Result；
- RuntimeState、Outbox、Inbox、租约和进程重启恢复；
- 当前明确支持的一小组业务节点。

未实现的 nodeType 由执行兼容性检查显式拒绝，不允许创建 Run 后才因为 Registry 找不到而暴露架构
未完成。

### 10.2 第二阶段：Loop

Loop 是 Runtime Scope，不是给 DAG 增加回边。每次迭代必须拥有独立的：

- scopeKey 和 parentScopeKey；
- Node/Edge 状态；
- executionKey 和输出索引；
- 迭代序号和终态。

Runtime 负责创建和关闭 Scope，Loop 节点业务只返回“进入、继续或退出”的结构化决定。嵌套 Loop
通过显式 Scope 链访问当前迭代输出，不解析 executionKey 字符串。

在 Loop 实施前，不在第一阶段 RuntimeState 和 Protocol 中预放一组未经验证的 Directive 字段。

### 10.3 第三阶段：Sub Workflow

Sub Workflow 由 NestJS 创建独立子 WorkflowRun：

- 子 Run 使用自己的 WorkflowVersion、RuntimeState 和系统变量；
- 父节点进入等待状态并保存 childRunId；
- 子 Run 终态通过宿主 Effect 恢复父节点；
- 子工作流公开结果只来自被调用 Workflow.outputs。

Go 不接收子 Workflow 的完整 DAG。Sub Workflow 需要专门的宿主 Effect、父子 Run 关联、恢复幂等和
取消传播，不能只增加一个 `SUSPENDED` 字符串就视为完成。

## 11. 实施顺序

1. 整理 Core 执行前校验空缺，Start/End 与根 DAG 可达性已落地，继续补 Workflow outputs 和 Config 引用规则。
2. 删除 Runtime 草稿中重复静态校验的设计，让 `buildExecutionPlan()` 只建立索引。
3. 完成 Runtime 最小公开契约、RuntimeState Schema、根 DAG 和变量解析。
4. 建立最小 Protocol Schema，并生成 TypeScript 与 Go 类型。
5. Server 已增加 RuntimeState、revision、Outbox、Inbox 和 lease 持久化。
6. Server 已通过 RabbitMQ Publisher/Consumer 跑通启动、Outbox、结果事务和进程重启后的派发恢复。
7. Go 已提供 Worker、Publisher Confirm、Registry 与真实 LLM、HTTP、Code、Condition Executor；
   下一步补齐持久化幂等副作用存储与真实 RAG 业务逻辑。
8. 验证并行结果乱序、重复消息、进程重启、租约过期和超时恢复。
9. 基础链路稳定后再实现 Loop、通用 Secret Gateway、节点内容/token 级流式事件和 Sub Workflow；
   LLM 当前已有受 NodeRun 租约保护的专用模型解析接口，运行状态 SSE 已由 Server 宿主实现。

每一步只公开已经可用的 API，不让文档中的未来文件名反向绑死实现目录。

## 12. 完成标准

根 DAG 第一阶段完成时，应满足：

- Workflow 静态正确性只由 Core 校验，Runtime Compiler 没有第二套同类规则；
- Runtime 可以从不可变 WorkflowVersion 和持久化 State 确定性恢复；
- NestJS 在同一事务中保存状态迁移和待发布 Command；
- Go 只接收单节点已解析 JSON，不接收完整 Workflow；
- 重复 Command、重复 Result 和迟到租约不会重复推进状态；
- 并行结果以任意顺序到达都不会丢失已提交迁移；
- Start/End 不产生无意义的 MQ 往返；
- 未支持的节点、Loop、Sub Workflow 或 Secret 能力在创建 Run 前被明确拒绝；
- Runtime、Server 或 Go 任一进程重启后，未完成 Run 可以从 PostgreSQL 继续处理。
