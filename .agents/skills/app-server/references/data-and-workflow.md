# 数据与工作流接入

## 本地开发基础设施

- 根目录 `compose.dev.yaml` 统一提供 PostgreSQL 17 与 Redis 7.4，NestJS 默认在宿主机运行，不加入 Compose。
- 根目录通过 `docker:dev:up`、`docker:dev:down`、`docker:dev:logs` 和 `docker:dev:status` 脚本管理开发基础设施。
- PostgreSQL 与 Redis 数据使用 Docker named volume；日常停止不得隐式删除 volume。
- 若未来把 NestJS 加入 Compose，数据库和 Redis 主机名改用 Compose service 名称，不继续使用 `localhost`。

## PostgreSQL 与 Prisma

- Prisma schema 使用多文件目录：`schema.prisma` 只保存 generator 和 datasource，
  `models/*.prisma` 按领域保存模型，`enum.prisma` 保存跨模型共享枚举；
  `apps/server/prisma.config.ts` 的 `schema` 指向整个 `prisma/` 目录。
- 使用 Prisma 7 的 `prisma-client` generator，Client 输出到 `apps/server/src/generated/prisma`，该目录由命令生成且不手动修改。
- Prisma 7 的 `migrate dev` 和 `db push` 不自动生成 Client；schema 或 generator 配置变化后显式执行 `prisma:generate`。`--name init` 只用于创建第一条迁移，已有迁移的项目首次启动使用不带名称的 `prisma:migrate:dev`。
- 服务端 `build` 固定先执行 `prisma:generate` 再编译；`start:prod:migrate` 用于简单部署时执行 `prisma:migrate:deploy` 后启动。多实例或独立发布流水线应将 migration 作为单次发布任务执行，再分别运行 `start:prod`。
- Prisma CLI 从 `apps/server/prisma.config.ts` 读取 `DATABASE_URL`，NestJS 通过 `ConfigModule` 加载应用环境变量。
- PostgreSQL driver adapter 已通过全局 `PrismaModule`/`PrismaService` 接入 NestJS，并由各业务 Repository 封装数据访问。
- 把 Prisma schema、migration 和 client 生命周期放在服务端基础设施边界。
- 由应用服务定义事务边界，Repository 不自行开启彼此无法组合的事务。
- JSON 字段保存工作流前，先使用 `@ai-workflow/core` 校验结构和业务规则。
- 数据模型变更时同步检查 DTO、迁移、索引、唯一约束和历史数据兼容性。
- `App` 统一表示工作流应用，不通过 `AppKind` 或 `kind` 字段区分 Workflow 与 Chatflow。
- 部署不区分环境；每个 `Workflow` 最多有一条 `WorkflowDeployment`，指向当前对外运行的版本。
- 创建 Studio 应用时，在同一个 Prisma 嵌套写入中生成 `App`、一对一 `Workflow` 和
  `WorkflowDraft`；空草稿仍保存完整的工作流顶层结构与空布局，避免后续导出或编辑补建记录。
- Studio 草稿保存使用 `WorkflowDraft.revision` 乐观锁：Repository 在事务内同时校验
  `ownerId`、应用、Workflow ID 与修订号，并用带修订号条件的更新原子递增 `revision`；
  冲突返回 `409`。保存成功时同步更新 `App.updatedAt`，让 Studio 的最近编辑排序反映画布
  修改。
- 工作流发布使用前端提交的当前编辑器快照，不等待自动保存完成；服务端从当前用户持久化草稿
  恢复 Secret 占位值并调用 `validateExecutorWorkflow`。发布事务与测试运行创建版本共用
  Workflow 行锁串行分配递增版本号，创建来源为 `PUBLISH` 的不可变 `WorkflowVersion`，再通过
  `WorkflowDeployment.workflowId` 唯一约束原子创建或切换当前部署；发布接口不得返回版本定义或
  Secret。发布版本默认不设置名称，用户后续通过版本历史命名；版本历史只投影 `PUBLISH` 来源，
  测试运行快照不作为用户可管理版本。恢复版本只覆盖并递增当前草稿，不修改原版本；删除前必须
  阻止仍被部署或运行记录引用的版本。
- 工作流定义顶层包含 `environmentVariables`，服务端直接使用 Core `workflowSchema` 与
  `validateWorkflow` 校验其稳定 ID、唯一名称、类型和值，不维护简化的 Workflow 类型或第二套
  解析规则。旧草稿缺少该字段时由 Core Schema 归一为空数组。DSL 导出必须将
  `secret` 类型的值清空；草稿读取与保存响应把 Secret 值固定脱敏为 `********`。保存已有 Secret 时，
  请求中的 `********` 只表示沿用数据库原值，不得把占位符覆盖进持久化定义；提交其他值才更新密钥。
- Studio DSL 使用 JSON 附件导出，固定携带 `dslVersion`、应用元数据、草稿
  `schemaVersion`/`revision`、`definition` 和 `layout`。数据库草稿与导入文件使用 Core
  `workflowSchema` 和 `validateWorkflow` 完成结构及保存校验；测试运行额外使用
  `validateExecutorWorkflow` 执行完整执行前校验。所有入口都直接依赖 package 根入口，不得在
  Server 复制 Workflow、Runtime 或 Protocol 契约。
- Studio DSL 导入只接受 `dslVersion: 1` 的 JSON 结构；服务端校验应用元数据、节点与连线
  基本结构、ID 唯一性、连线引用和画布布局后再持久化。导入会生成新的 App/Workflow ID，
  保留草稿结构版本并从新的修订记录开始，不沿用导出文件中的系统修订号。
- 复制应用只复制当前草稿和应用元数据，不复制版本、部署、运行或 API Key；工作流 ID
  重新生成，副本名称在当前用户的未删除应用中按 `-副本`、`-副本2` 递增。
- 删除 Studio 应用使用硬删除而不是只写入 `deletedAt`。Repository 在单个事务中按调用日志、
  API Key、节点运行、工作流运行、部署、版本、草稿、Workflow、App 的顺序清理，避免版本
  和运行之间的限制型外键阻止级联；只有当前 `ownerId` 的未删除应用可以进入删除事务。
- 不把数据库连接或 Prisma client 暴露给 Controller。

## 模型配置持久化

- `ModelGroup` 按 `ownerId` 归属用户，通过 `ModelType.CHAT`/`EMBEDDING` 区分对话和嵌入配置；
  供应商类型保存稳定字符串，并在 DTO 与服务端供应商注册表中校验。
- `ConfiguredModel` 通过 UUID 保持稳定身份，`normalizedModelId` 保存
  `modelId.trim().toLowerCase()` 并与 `groupId` 建立唯一约束；`sortOrder` 保留表单顺序。
- 模型组和单模型分别保存 `enabled`，运行时有效状态为两者同时启用；关闭组不得覆盖模型状态。
- 保存完整模型组时在一个 Prisma 事务中完成组字段、凭证和模型集合变更；已有模型先使用临时
  唯一规范 ID，再写入最终 ID，保证模型 ID 互换时不会触发中间态唯一约束冲突。
- 模型供应商 API Key 使用 AES-256-GCM 加密，组 UUID 作为 AAD；数据库只保存密文、IV、认证
  标签和密钥版本。生产环境必须通过 `MODEL_CREDENTIAL_ENCRYPTION_KEY` 提供 32 字节 Base64
  密钥；开发/测试未配置时使用 HKDF 从 `JWT_SECRET` 派生用途隔离密钥。
- 模型组响应中的 `maskedApiKey` 由服务端解密后即时生成，只保留 Key 前 4 位、`***` 和后 4 位；
  不持久化掩码，也不返回 Key 明文。
- 用户配置的模型 Base URL 只允许 HTTP/HTTPS，不得包含 URL 凭证、查询参数或片段。服务端默认
  阻止私有、回环和保留地址；通过 `MODEL_CONNECTION_PRIVATE_HOSTS` 显式放行需要访问的 Ollama
  或可信内网端点，探测请求禁止自动跟随重定向并限制超时与响应体大小。
- Go LLM Executor 不使用工作流中的模型展示快照，也不从 MQ 接收 API Key。它使用 Command 自带的
  NodeRun 身份和 Lease Token 调用 `ExecutorModelModule`；Server 校验运行状态和 deadline，从不可变
  WorkflowVersion 读取稳定模型引用，再按应用 Owner 解析启用状态、真实模型 ID、Base URL 和凭证。
  该专用解析接口是当前已落地的最小模型凭证边界，不代表通用 Secret Gateway 已完成。
- LLM 上下文正文来自 Core `config.messages`；完整运行注册 Runtime 的 `projectLlmNodeConfig`，在派发前
  解析正文中的节点、环境与系统变量引用。HTTP 与 Condition 分别注册 `projectHttpNodeConfig` 和
  `projectConditionNodeConfig`，显式解析其 Schema 声明的 VariableValue，禁止把 Core 引用结构交给
  Go 猜测。节点 `inputs` 是独立且可选的通用输入绑定，Server 与 Go 均不得假设存在名为 `input` 的
  字段，也不得把它自动追加成一条模型消息。

## 知识库持久化

- 完整表设计和状态流程以根目录 `docs/knowledge-base-design.md` 为准。当前已建立最小
  `KnowledgeBase` Prisma 模型和迁移，包含 UUID、`ownerId`、名称、描述、图标、时间字段以及
  `(ownerId, updatedAt)` 列表索引；空白知识库创建、列表、详情、编辑和删除接口已经实现，其余
  知识库表与文档、索引、检索能力尚未实现。
- 当前删除使用硬删除，并通过 PostgreSQL JSONB `array_contains` 同时检查当前用户的工作流草稿
  和版本中的 RAG 引用；匹配当前 `knowledgeBases: [{ id }]` 引用快照，以及历史
  `knowledgeBaseIds` 数组和 `knowledgeBaseId` 单值，存在任一引用时拒绝删除。引用投影表落地后
  必须改用强外键投影做事务内删除保护，文档和外部资源落地后再升级为异步清理流程。
- 空白 `KnowledgeBase` 是合法资源，允许 `activeIndexId` 为空并被 RAG 节点选择；上传、召回、
  测试运行和发布前再校验 active Index 与 READY 文档。
- `KnowledgeBase.activeIndexId` 是当前检索索引的唯一事实来源。嵌入模型、维度、距离算法或知识库级
  切分配置变化时创建新的 `KnowledgeBaseIndex` 代际，全部非删除文档构建成功后在事务中原子切换，
  不按文档逐个切换知识库正在服务的模型。
- 原始文件、文档索引结果和 Worker 尝试分别使用 `KnowledgeDocumentSource`、
  `KnowledgeDocumentVersion` 和 `KnowledgeIngestionAttempt` 建模；文档在每个 Index 下的当前成功
  版本由 `KnowledgeDocumentIndexHead` 维护。
- 文档入库、重建和清理任务通过同事务 `OutboxEvent` 可靠发布；Redis 不作为任务事实来源。
  `KnowledgeCleanupJob` 保留外部资源清理进度，清理成功前业务行保持删除中状态。
- 工作流草稿和版本分别使用具有真实知识库外键的引用投影表；工作流 JSON 仍是事实来源，保存
  JSON 与重建投影必须在同一事务完成。
- 检索次数从 `KnowledgeRetrievalLog` 与 `KnowledgeRetrievalHit` 聚合，召回测试不计入生产召回；
  不在知识库或文档行维护高频递增计数。
- pgvector 列、维度 CHECK、部分向量索引和 Prisma 无法表达的复合约束使用自定义 migration；
  Prisma 模型中的向量列使用 `Unsupported("vector")`，向量查询封装在 `VectorStore`/Repository
  边界内。

## Redis

- 只在缓存、幂等、限流、短期锁或事件协调需求明确时使用。
- Key 包含稳定命名空间和版本，并明确过期时间与失效策略。
- Redis 不作为必须持久化的工作流定义或执行结果的唯一事实来源。
- 缓存失败的降级策略由用例决定，不静默吞掉影响正确性的错误。

## Workspace package 边界

- 使用 `@ai-workflow/core` 读取工作流 schema、节点注册表、端口和校验规则。
- 使用 `@ai-workflow/runtime` 承载与 Nest 无关的执行状态机；当前已提供根作用域 DAG v1、
  RuntimeState 恢复、`start()`、`applyNodeResult()` 和 Effect 公共契约，并已接入测试运行应用服务。
- 使用 `@ai-workflow/protocol` 承载 TypeScript 与 Go 共用的版本化节点 Command/Result JSON 协议；
  当前 Server RabbitMQ Publisher/Consumer 与 Go Worker 两端都使用 v1 parser/codec。
- 使用 `@ai-workflow/shared` 共享纯 TypeScript 协议；当前包仍只有占位导出。
- 服务端不得依赖 `@ai-workflow/ui`、`@ai-workflow/form` 或 `@ai-workflow/nodes-ui`。

## 工作流入口

1. 对外部原始数据调用 `workflowSchema.safeParse()`。
2. 保存或编辑场景调用 `validateWorkflow(parsed.data, registry)`。
3. 执行前调用 `validateExecutorWorkflow(parsed.data, registry)`，不先重复调用保存校验。
4. 只有校验无问题后才持久化为有效版本或交给 runtime。
5. Runtime 的 ExecutionPlan 只从已验证快照建立查询索引；Server 不依赖 Compiler 再做一次静态
   Workflow 校验。缺失的静态执行规则回到 Core 增加。
6. 保留工作流版本和节点类型版本的演进空间，不在执行器中修改已保存定义。
7. 当前运行触发方式不包含定时调度；`WorkflowRunTrigger` 只记录 API、手动、测试和子工作流触发。
8. `WorkflowRun.mode` 区分完整运行与单节点运行；`SINGLE_NODE` 时由应用服务保证 `targetNodeId` 存在，`FULL` 时保持为空。

测试运行通过同一个应用服务与持久化链路处理 `FULL` 和 `SINGLE_NODE`：每次运行创建不可变
`WorkflowVersion`，并保存 Run、NodeRun、RuntimeState revision、Command Outbox、Result Inbox、
idempotencyKey、leaseToken 和 deadline。结果事务必须先校验 commandId/NodeRun/leaseToken，再用
revision CAS 推进 RuntimeState。Command Outbox 通过 `PENDING → PUBLISHING → PUBLISHED/FAILED`
和 `FOR UPDATE SKIP LOCKED` claim 派发；stale claim 可恢复。Go 只有在 Result 获得 Publisher Confirm
后才 Ack Command，Server 只有在 Inbox/Runtime 事务提交后才 Ack Result。LLM、HTTP、Code 与
Condition Executor 已按 Core Config 执行真实业务逻辑，RAG 仍为最小实现；
所有 Result 与后续完整实现使用同一协议链路，Server 不识别执行器实现类型，
不从版本快照改写或补齐输出。Result Inbox 始终保留 Executor 原始结果；完整运行的 NodeRun 保存
Runtime Execution 已归一化的输出，因此 `node.outputs` 中声明的直接值和上游变量映射会同时用于下游
引用与运行追踪展示，节点内置但未声明的结果字段不会导致运行失败。单节点运行没有 Runtime 上下文，
NodeRun 继续保存 Executor 原始成功输出，并复用相同 Config projector；节点输入或 Config 存在引用
变量时在创建 Command 前明确拒绝，避免把引用对象误当成业务值发送给 Go。
Executor 返回成功但 Runtime 在输出归一化阶段拒绝结果时，NodeRun 必须按对应 Execution 的最终失败
状态落库；不能再次按原始 Executor `SUCCEEDED` 强读 outputs，否则会掩盖真实 Runtime 错误并触发
Result Consumer 重试。
后台按 `deadlineAt` 扫描 `PENDING` / `RUNNING` NodeRun，原子写入 Run `TIMED_OUT`、目标
NodeRun `TIMED_OUT` 并取消同 Run 其余派发，迟到 Result 必须按 stale 忽略。损坏的 Outbox 命令和
达到最大处理次数的 Result 必须通过同一失败终态入口写库，并在事务提交后发布
`workflow_finished`。业务副作用幂等存储和真实节点不得假装已经实现。

编辑器暂停测试运行使用一次性取消语义：Repository 只允许当前用户、当前应用的 `RUNNING` Run
原子切换为 `CANCELLED`，同事务取消 `PENDING` / `RUNNING` NodeRun 和尚未发布的 Outbox。已经
发布给 Worker 的命令可以完成传输，但 Result 因 Run 已终态必须按 stale 忽略；当前不提供恢复
执行，不得把该能力描述为可续跑的 `PAUSED`。NodeRun 在进入执行链路并创建派发记录时写入
`startedAt`，派发器领取时不得重置；取消事务按该时间到取消时刻固化每条未完成 NodeRun 的耗时，
不足 `1 ms` 的已开始记录按 `1 ms` 保存。

测试运行进度通过 Server SSE 推送：Controller 建连后先读取持久化快照以覆盖建连竞态，Result
事务提交成功后才发布 `node_finished`，并携带最新 `nodeStates`、`nodeRuns`、
`traceNodeDurations` 与 `traceNodeIds`；Run 进入终态后发布 `workflow_finished`。追踪顺序从
RuntimeState 已持久化的 Execution `sequence` 生成，Start/End 等本地控制节点也以其 Execution
为准，只返回真正进入执行链路的节点；终态耗时由本地控制 Execution 与 NodeRun 合并投影。当前事件
订阅器是 Server 进程内边界；部署多个 Server 实例前必须替换为 Redis Pub/Sub 等跨实例事件协调，
但数据库仍是恢复快照、追踪顺序和最终状态的事实来源。

完整测试运行中，Runtime 根据 Start 节点动态输出定义校验运行输入字段、JSON 值、
类型、必填项和默认值。应用服务使用 `SYSTEM_VARIABLE_KEYS` 组装
`Record<SystemVariableKey, JsonValue>` 系统上下文，其中 `app_id` 来自 Workflow 的数据库关联，
`workflow_id` 来自已校验快照，`workflow_run_id` 来自新建 Run；不得使用 `ownerId`、`workflowId`、
`startedAt` 等自定义键替代 Core 系统变量键。系统变量与环境变量只参与 Runtime 引用解析，不直接
进入 Run 顶层输入、Start 输出、NodeRun 输入或 MQ Command 输入；当声明输入（例如 `user_id`）引用
系统变量或环境变量时，只在该声明 key 下写入解析后的真实值。单节点测试同样不得自动展开上下文变量。
`executionKey`、`attempt` 继续作为结果关联、幂等和重试所需的服务端内部数据，不进入用户侧运行追踪响应。

## LangGraph

- 把 LangGraph 视为可替换执行适配器，不让 Core 模型直接依赖它。
- 先把已经通过 Core 执行前校验的工作流转换为只读查询索引，再交给具体适配器；转换过程不维护
  第二套静态校验。
- 将重试、超时、取消、检查点和恢复语义定义在 runtime 接口，不散落在 Nest Controller 中。
