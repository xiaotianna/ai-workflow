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
- 工作流定义顶层包含 `environmentVariables`，服务端草稿解析负责保留并校验其稳定 ID、唯一名称、
  `string` / `number` / `secret` 类型和值；旧草稿缺少该字段时归一为空数组。DSL 导出必须将
  `secret` 类型的值清空；草稿读取与保存响应把 Secret 值固定脱敏为 `********`。保存已有 Secret 时，
  请求中的 `********` 只表示沿用数据库原值，不得把占位符覆盖进持久化定义；提交其他值才更新密钥。
- Studio DSL 使用 JSON 附件导出，固定携带 `dslVersion`、应用元数据、草稿
  `schemaVersion`/`revision`、`definition` 和 `layout`。数据库草稿在导出前至少校验工作流
  顶层结构；在 Core 提供可被 NodeNext 服务端直接加载的构建入口后，改为复用
  `workflowSchema` 与 `validateWorkflow` 做完整校验。
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
- 使用 `@ai-workflow/runtime` 承载与 Nest 无关的执行引擎；当前 runtime 仍是占位包。
- 使用 `@ai-workflow/shared` 共享纯 TypeScript 协议；当前包仍只有占位导出。
- 服务端不得依赖 `@ai-workflow/ui`、`@ai-workflow/form` 或 `@ai-workflow/nodes-ui`。

## 工作流入口

1. 对外部原始数据调用 `workflowSchema.safeParse()`。
2. 保存或编辑场景调用 `validateWorkflow(parsed.data, registry)`。
3. 执行前调用 `validateExecutorWorkflow(parsed.data, registry)`，不先重复调用保存校验。
4. 只有校验无问题后才持久化为有效版本或交给 runtime。
5. 保留工作流版本和节点类型版本的演进空间，不在执行器中修改已保存定义。
6. 当前运行触发方式不包含定时调度；`WorkflowRunTrigger` 只记录 API、手动、测试和子工作流触发。
7. `WorkflowRun.mode` 区分完整运行与单节点运行；`SINGLE_NODE` 时由应用服务保证 `targetNodeId` 存在，`FULL` 时保持为空。

Go Executor 目标架构接入时，运行输入先通过 Core 公共 JSON 对象 Schema，再由 Runtime 根据
Start 节点动态输出定义校验字段、类型、必填项和默认值。应用服务使用
`SYSTEM_VARIABLE_KEYS` 和 Core `SystemVariableValues` 组装完整系统上下文，其中 `app_id` 来自
Workflow 的数据库关联，`workflow_id` 来自已校验快照，`workflow_run_id` 来自新建 Run；不得
使用 `ownerId`、`workflowId`、`startedAt` 等自定义键替代 Core 系统变量键。

## LangGraph

- 把 LangGraph 视为可替换执行适配器，不让 Core 模型直接依赖它。
- 先把 Core 工作流转换为内部执行计划，再交给具体适配器。
- 将重试、超时、取消、检查点和恢复语义定义在 runtime 接口，不散落在 Nest Controller 中。
