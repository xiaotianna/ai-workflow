# 接口与应用边界

## Controller 与 DTO

- 为外部输入定义显式 DTO，并在应用入口启用统一校验和转换策略。
- 不直接信任请求 JSON、数据库 JSON 或导入文件，先完成结构校验再进入业务服务。
- Controller 只做协议转换、状态码处理和调用应用服务。
- 不把 Prisma model 直接作为公开接口 DTO，避免数据库结构绑死传输契约。
- 分页、筛选和排序采用统一形状；首次确定后在本文件记录真实约定。

## 错误与日志

- 使用领域或应用错误表达可预期失败，再由全局过滤器映射 HTTP 响应。
- 不在每个 Controller 中重复编写相同的 try/catch。
- 错误响应格式尚未建立；首次实现时确定稳定的 `code`、`message`、`details` 和追踪标识。
- Winston 日志级别通过 `ConfigService` 按环境配置：开发环境使用 `silly` 输出全部级别，其他环境默认使用 `info`。
- 日志记录请求或工作流追踪标识，不输出密码、令牌、连接串或完整敏感载荷。

## 鉴权与配置

- 把鉴权放在 Guard、Decorator 等 Nest 边界，不在业务服务中重复解析请求头。
- 配置通过集中配置模块读取并校验，业务代码不散落访问 `process.env`。
- 区分缺失配置、无效配置和运行期外部服务失败。
- 密钥只来自环境或密钥服务，不写入源码、示例返回或日志。

## 当前认证接口

- `POST /auth/login`：手机号和密码登录；用户不存在时自动注册，成功后返回用户信息和 Token。
- `POST /auth/logout`：需要 Bearer Token，删除当前 Token 对应的 Redis 会话。
- `GET /auth/me`：需要 Bearer Token，只返回当前界面使用的 `phone` 和 `username`。
- `PATCH /auth/me`：需要 Bearer Token；`username` 必填，`oldPassword` 与 `newPassword`
  必须同时提供或同时省略。修改密码时先校验旧密码，再使用 Argon2 哈希新密码；响应只返回
  `phone` 和 `username`。旧密码错误属于普通业务错误，不得使用会触发前端退出登录的
  `401` 或 `403`。

## 当前 Studio 接口

以下接口统一使用 Bearer Token，并始终按当前用户 `ownerId` 隔离应用：

- `GET /studio/apps`：游标分页获取应用；`limit` 范围为 1–50，支持 `search` 与
  `updated_desc`、`created_desc`、`created_asc` 排序，返回 `items` 和 opaque
  `nextCursor`。可选 `publishedOnly=true` 只返回当前已有 `WorkflowDeployment` 的应用，供
  子工作流选择器使用。前端不得解析或自行构造游标。
- `GET /studio/apps/:appId`：获取应用详情；路径参数不是 UUID v4 时返回 `400`，资源不存在或
  不属于当前用户时返回 `404`，两种情况的响应 `message` 均为“应用不存在”。
- `GET /studio/apps/:appId/workflow-draft`：读取当前应用草稿的 `schemaVersion`、`revision`、
  `definition`、`layout` 和 `updatedAt`。
- `PUT /studio/apps/:appId/workflow-draft`：保存当前应用草稿；请求携带当前 `revision`、
  `definition` 和 `layout`，成功后返回递增后的修订号。修订号落后时返回 `409`，不得静默
  覆盖其他编辑会话的更新。读取与保存响应中的 `secret` 环境变量值固定为 `********`；保存请求对已有
  Secret 原样提交该占位符时，服务端保留数据库中的原值，只有提交其他值时才替换密钥。
- `GET /studio/apps/:appId/workflow-deployment`：读取当前应用正在部署的发布版本；尚未发布时返回
  `null`，已发布时返回版本 ID、递增版本号和发布时间，不返回版本定义或 Secret。
- `GET /studio/apps/:appId/workflow-deployment/contract`：读取当前部署版本的子工作流公开契约；
  返回 `workflowId`、版本身份、Start 输入变量（`node.outputs`）和 `Workflow.outputs` 公开字段
  （`key`/`label`/`dataType`/`description`），不返回完整 DAG、布局或 Secret。尚未发布时返回
  `400`。
- `POST /studio/apps/:appId/workflow-deployment`：发布前端提交的当前编辑器快照。请求携带
  `definition` 和 `layout`；服务端按当前用户草稿恢复 Secret 占位值并执行 Core 执行前校验，
  成功后创建来源为 `PUBLISH` 的不可变版本并原子切换当前部署，返回新的版本 ID、版本号和发布时间。
- `GET /studio/apps/:appId/workflow-versions`：按版本号倒序返回当前应用由发布形成的历史版本；
  列表只包含版本 ID、版本号、可选名称、创建时间和创建人，不返回工作流定义或 Secret，测试运行
  产生的内部快照不进入版本历史。
- `POST /studio/apps/:appId/workflow-versions/:versionId/restore`：把当前用户和应用内的发布版本
  快照恢复为当前草稿，原子递增草稿修订号并返回脱敏后的完整草稿；版本快照本身保持不可变。
- `PATCH /studio/apps/:appId/workflow-versions/:versionId`：设置发布版本名称，名称去除首尾空白后
  必填且最长 40 个字符。
- `DELETE /studio/apps/:appId/workflow-versions/:versionId`：删除当前用户和应用内未被部署或运行记录
  引用的发布版本；仍被引用时返回 `409`，不得绕过关联约束删除。
- `POST /studio/apps/:appId/workflow-runs/test`：测试当前提交的编辑器快照。`mode=FULL` 运行完整根
  DAG；`mode=SINGLE_NODE` 必须携带 `targetNodeId`，且目标类型须通过 Core
  `supportsSingleNodeTestRun`（拒绝 Start、End、Loop、Loop Start、Loop Exit、Sub Workflow）。
  `SINGLE_NODE` 可携带 `input`：若节点声明了输入变量，则每个 key 必须非空且为可序列化 JSON；
  未携带 `input` 时回退解析快照中的字面量绑定（引用变量仍拒绝）。前端使用 `fetch` 以 POST
  提交请求体并读取 `text/event-stream` 响应，不使用仅支持 GET 的原生 `EventSource`。事件依次为
  当前数据库快照的 `workflow_started`、状态推进时的 `node_finished` 和终态的
  `workflow_finished`。初始快照与每个增量事件都提供最新 `nodeStates`、`nodeRuns`、
  `traceNodeDurations` 和 `traceNodeIds`：`traceNodeIds` 必须从持久化 RuntimeState 的
  Execution `sequence` 生成，只包含真正进入执行链路的节点，禁止按画布拓扑补齐未执行节点；
  `traceNodeDurations` 合并 Runtime 本地控制 Execution 与持久化 NodeRun 的终态耗时，运行中节点
  不返回临时递增耗时。状态包含 `RUNNING` / `SUCCEEDED` / `FAILED`，供前端准确标记当前执行
  节点；尚未领取的 `PENDING` 节点投影为 `RUNNING`，`TIMED_OUT` 节点投影为 `FAILED`。两种模式
  共用 Runtime/Protocol、运行记录、Outbox/Inbox 和 Go Executor 链路；请求中的 Secret 占位值按
  当前用户持久化草稿恢复。运行快照显式返回持久化 Run 的 `traceId`、`trigger`、`input`、触发
  用户、排队/开始/结束时间和耗时；Run `input` 是归一化用户输入与非 Secret `env.<name>`、全部
  `sys.<key>` 的合并结果。每条 NodeRun 返回实际派发的 `input`、`output`、开始/结束时间和耗时，
  供运行详情与追踪展示，不把 Prisma model 直接作为响应。
- `GET /studio/apps/:appId/workflow-runs`：按 `queuedAt`、`id` 倒序游标分页读取当前用户和应用的
  测试与正式运行记录；`limit` 范围为 1–50，响应返回轻量 `items` 和 opaque `nextCursor`，列表
  不携带输入、输出、节点运行或工作流版本快照。可选 `scope=published_calls` 只保留绑定
  `PUBLISH` 版本且触发方式为 `API` / `SUB_WORKFLOW` 的正式调用；同时支持 `status`、`trigger`、
  ISO 时间下界 `from`，以及按触发用户昵称或追踪 ID 的 `search`。日志页必须使用该服务端范围，
  不在浏览器从全量运行记录中过滤。
- `GET /studio/apps/:appId/workflow-runs/latest-by-node/:nodeId`：返回当前用户、当前应用内该
  `nodeId` 最近一次 `WorkflowNodeRun`（按 `createdAt`/`id` 倒序），覆盖完整运行、单节点运行与
  作为子工作流被调用时产生的记录；无记录时返回 `null`。响应包含 NodeRun 输入/输出/状态/耗时，
  以及所属 Run 的 `runMode`、`runTrigger`、`runStatus` 与执行人，不返回完整工作流定义。
- `GET /studio/apps/:appId/workflow-runs/:runId`：按当前用户和应用读取异步测试 Run、节点状态、输出
  或错误，并返回该 Run 绑定版本的 `definition` 供历史追踪还原节点；不得仅凭 runId 跨应用读取，
  `definition` 中的 Secret 环境变量必须清空，不得把版本快照中的真实密钥返回浏览器；也不得由
  Web 用于终态轮询。SSE 内部快照继续使用不携带 `definition` 的运行 VO，避免每个事件重复发送
  完整版本定义。
- `GET /studio/apps/:appId/workflow-runs/:runId/events`：为详情和恢复场景保留的事件流接口；事件
  顺序与 POST 测试接口一致，使用注释心跳防止代理空闲断开，鉴权仍使用 Bearer Token。Web 新建
  测试运行不得先创建再调用此接口；只有 POST 流已返回 runId 后意外中断，才允许自动恢复一次。
  POST/GET SSE 的最后一个客户端异常断开时，Server 必须复用一次性取消事务终止仍在运行的测试
  Run；服务端正常发送 `workflow_finished` 并关闭响应时不得再次触发取消。
- `POST /studio/apps/:appId/workflow-runs/:runId/cancel`：对当前用户、当前应用内仍为 `RUNNING` 的
  测试 Run 执行一次性暂停。服务端把 Run 写为 `CANCELLED`，取消未完成 NodeRun 与待派发
  Outbox；NodeRun 从进入执行链路时开始计时，耗时按 `startedAt` 到暂停时刻计算且已开始记录
  最少为 `1 ms`，随后发布 `workflow_finished`；Run 已进入终态时幂等返回当前快照。该接口不表示
  可恢复的 `PAUSED` 状态。
- `POST /studio/apps`：创建应用，并同时创建对应 Workflow 与空草稿。
- `POST /studio/apps/import`：导入 `dslVersion: 1` 的 JSON DSL，校验应用元数据、工作流定义
  与布局后创建新的应用、Workflow 和草稿；导入时重新生成应用与工作流 ID。
- `POST /studio/apps/:appId/duplicate`：复制当前用户的应用与工作流草稿；副本名称依次使用
  `原名称-副本`、`原名称-副本2` 等当前用户下尚未占用的名称。
- `PATCH /studio/apps/:appId`：编辑应用名称、图标或描述，至少提供一个字段。
- `DELETE /studio/apps/:appId`：永久删除当前用户的应用，以及关联工作流、草稿、版本、部署、
  运行、节点运行、API Key 与 API 调用日志；删除操作不可恢复。
- `GET /studio/apps/:appId/dsl`：以 `application/json` 附件直接下载 DSL，不套统一成功响应；
  DSL 使用 `dslVersion: 1`，包含应用元数据、草稿结构版本、修订号、工作流定义与布局；工作流
  环境变量随定义导出，但 `secret` 值必须清空。

Studio 的 UUID 路径参数通过 `ParseUUIDPipe` 校验；所有读取与修改都同时检查资源归属，不允许
仅凭应用 ID 跨用户访问。

## 当前应用 API 接口

Studio 管理接口使用 Bearer JWT，并按当前用户和应用隔离：

- `GET /studio/apps/:appId/app-api`：返回发布状态和 API 文档分享状态；存在当前部署时状态为
  `RUNNING`，否则为 `UNPUBLISHED`。同时只投影当前及历史 `PUBLISH` 版本的版本身份和 Start
  输入变量元数据，供前端动态生成请求文档，不返回完整工作流定义。
- `PATCH /studio/apps/:appId/app-api/share`：开启或关闭 API 文档公开分享。首次开启生成不可预测的
  分享令牌；关闭后公开链接立即失效，重新开启可继续使用原令牌。
- `GET /studio/apps/:appId/app-api/keys`：只返回 `app-`、固定星号与末尾 5 位组成的掩码、创建时间
  和最后使用时间，不返回明文，也不提供列表复制能力。
- `POST /studio/apps/:appId/app-api/keys`：创建应用 API Key；明文只在本次响应返回一次，数据库只
  保存 SHA-256 哈希、前缀和末尾 5 位，并设置 `Cache-Control: no-store`。
- `DELETE /studio/apps/:appId/app-api/keys/:apiKeyId`：撤销当前用户和应用内的 Key；撤销后不再
  出现在列表，也不能继续鉴权。
- `GET /public/app-api/:shareToken`：只在分享开启时返回公开文档所需的应用元数据、发布状态和各
  发布版本的 Start 输入变量元数据，不使用用户 JWT，不返回完整工作流定义、环境变量或 API Key。

外部 Service API 统一位于 `/v1`，使用 `Authorization: Bearer app-...` 鉴权；Key 只允许访问其
所属应用，成功认证会更新 `lastUsedAt`，请求审计写入 `ApiCallLog`：

- `POST /v1/workflows/run`：执行当前部署版本；JSON 请求体直接以 Start 节点输入变量 Key 作为
  顶层字段，不增加固定 `input` 包装，例如 Start 声明 `username` 时提交 `{ "username": "..." }`。
  Runtime 按当前部署版本的变量类型、必填项和默认值校验后，以 SSE 依次返回
  `workflow_started`、`node_finished`、`workflow_finished`。
- `POST /v1/workflows/versions/:versionId/run`：执行所属应用指定的 `PUBLISH` 历史版本；请求体同样
  使用顶层动态字段，并严格按 URL 中 `versionId` 对应版本的 Start 输入定义校验，事件格式与当前
  版本执行一致。版本不存在或不属于当前 API Key 所绑定应用时统一返回 `404`，错误信息须同时说明
  这两种可能，避免把跨应用 Key 误判为文档版本失效。
- `GET /v1/workflows/runs/:runId`：读取所属应用由 API 或子工作流触发的发布版本 Run 最新快照和
  节点执行详情。
- `GET /v1/workflows/logs`：与应用日志页的 `published_calls` 范围一致，游标分页读取所属应用由
  API 或子工作流触发的发布版本 Run，支持状态、时间下界，以及按触发用户昵称或追踪 ID 搜索。
- `GET /v1/info`：返回应用名称、图标、描述和作者。
- `GET /v1/parameters`：返回系统变量和当前发布版本（未发布时回退草稿）的环境变量；Secret 环境
  变量只返回元数据与 `sensitive=true`，不得返回 `value`。

正式 API SSE 客户端断开不取消已经创建的 Run，调用方通过执行情况接口继续查询；编辑器测试 SSE
仍保留最后一个订阅者断开时取消测试 Run 的语义。

## 当前知识库接口

以下接口统一使用 Bearer Token，并始终按当前用户 `ownerId` 隔离知识库：

- `GET /knowledge-bases`：获取当前用户的全部空白知识库；支持最长 40 字符的 `search` 与
  `updated_desc`、`created_desc`、`created_asc` 排序，返回 `{ items }`。当前阶段不分页，不得
  在前端模拟截断；需要分页时在保持 `items` 的基础上增加 opaque cursor。
- `GET /knowledge-bases/:knowledgeBaseId`：获取知识库详情；路径参数不是 UUID v4 时返回 `400`，
  资源不存在或不属于当前用户时返回 `404`，两种情况的响应 `message` 均为“知识库不存在”。
- `POST /knowledge-bases`：创建空白知识库；`title` 和 `icon` 必填，`description` 可选，不要求
  嵌入模型、文档或索引配置。
- `PATCH /knowledge-bases/:knowledgeBaseId`：修改名称、图标或描述，至少提供一个字段；空描述
  清理数据库中的可选描述。
- `DELETE /knowledge-bases/:knowledgeBaseId`：永久删除当前空白知识库；删除前检查当前用户工作流
  草稿和版本 JSON 中的 RAG 引用，存在引用时返回 `409` 和“知识库正在被工作流使用，无法删除”。
  当前没有文档或外部对象，因此不创建异步清理任务；后续接入这些资源时保持路由不变并升级为
  删除生命周期。

知识库响应使用显式 VO，包含 `id`、`title`、`author`、`description?`、`icon?`、`createdAt` 和
`updatedAt`，不得暴露 Prisma model 或返回尚未实现的文档数量、索引状态。

## 当前模型配置接口

以下接口统一使用 Bearer Token，并始终按当前用户 `ownerId` 隔离模型组：

- `GET /models/groups`：获取当前用户全部模型组；可选 `modelType=chat|embedding` 筛选。
- `GET /models/groups/:groupId`：获取单个模型组；不存在或不属于当前用户时返回 `404`。
- `POST /models/groups`：创建对话或嵌入模型组；每组包含 1–30 个模型，模型 ID 忽略大小写后
  不得重复。
- `PUT /models/groups/:groupId`：原子保存组配置与完整模型列表；模型项携带 ID 时更新原记录，
  未携带时创建，响应中缺失的旧模型会删除。Key 不传表示保留，字符串表示替换，`null` 表示
  清除；修改供应商时必须明确设置或清除 Key。
- `PATCH /models/groups/:groupId/enabled`：只修改模型组启用状态，不覆盖组内模型状态。
- `PATCH /models/groups/:groupId/models/:modelId/enabled`：按配置模型 UUID 修改单模型启用状态。
- `DELETE /models/groups/:groupId`：硬删除模型组并级联删除组内模型。
- `POST /models/test-connection`：按供应商模型列表接口探测连接。输入可携带本次 Key，或通过
  `credentialGroupId` 使用当前用户已保存的 Key；两者不可同时提供。上游 `401/403` 等预期
  探测结果仍使用本接口的 `200` 返回，不得把上游认证状态透传为会触发前端退出的 HTTP 状态。
- `POST /models/test-model`：使用当前供应商、Base URL、Key 和模型 ID 发起最小流式对话请求；
  OpenAI/DeepSeek 读取 SSE `delta.content`；Ollama 请求关闭 thinking，读取 NDJSON
  `message.content`，对于无法关闭 thinking 的模型也将首个 `message.thinking` 分片视为模型已正常
  响应。收到首个非空消息分片后立即取消上游响应体；上游非成功响应或流内错误仍以本接口 `200`
  返回，并优先提取 `error.message`、`error`、`message` 或 `detail` 作为响应 `message`。

模型组响应禁止返回 API Key 明文、密文、IV 或认证标签；存在凭证时返回 `maskedApiKey`，值固定
为 Key 前 4 位、`***` 和后 4 位的组合。
连通性响应分别返回 `reachable`、`authentication`、`responseValid`、`latencyMs` 和可选的
`upstreamStatus`/`errorType`，网络可达不等于配置或具体模型能力可用。
`authentication=not_required` 表示 Ollama 等供应商无需 Key；支持 Key 但未携带时才返回
`not_checked`，不得把“无需认证”展示成“未验证 Key”。

## 当前 Executor 内部接口

- `POST /internal/executor/commands/lease`：只供 Go Worker 使用；请求携带 Command、Run、NodeRun、节点、
  Execution 与 Lease Token 身份，响应 `{ active }`。只有 NodeRun、Run 均为 `RUNNING` 且 deadline
  未到期时返回 `active=true`。Worker 消费命令前必须检查，执行期间按短间隔复查；失效命令直接 Ack
  丢弃且不发布 Result，正在执行的命令通过取消 context 停止。
- `POST /internal/executor/models/resolve`：只供 Go LLM Executor 使用，不接受用户 Bearer Token；请求必须携带
  `commandId`、`runId`、`nodeRunId`、`nodeId`、`executionKey` 和 `leaseToken`。Server 同时校验
  NodeRun、Run 状态与 deadline，从绑定的不可变 WorkflowVersion 重新解析 LLM Config，再按所属应用
  `ownerId` 解析启用的模型组与模型。
- 运行时只信任 Core Config 中的 `groupId` 与 `configuredModelId`；`groupName`、`modelId`、
  `modelName`、`providerType` 是展示快照，不得作为真实供应商配置。
- 成功响应带本次执行所需的真实 `providerType`、`modelId`、`baseUrl` 和可选明文 `apiKey`，并设置
  `Cache-Control: no-store`。该路由只能位于 Server 与 Executor 的受控内部网络并使用 TLS，不得经公网
  网关、缓存或记录响应正文；错误日志不得包含 Lease Token、API Key 或完整请求/响应。

## 依赖方向

- 传输层依赖应用服务，应用服务依赖抽象的数据访问或运行时接口。
- 基础设施实现依赖 Prisma、Redis、LangGraph 等具体库。
- 领域契约不得依赖 Nest HTTP 类型或 Prisma 生成类型。
- 前后端共享的纯协议放入 `@ai-workflow/shared` 前，先确认不包含服务端实现细节。
