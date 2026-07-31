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
  `nextCursor`。前端不得解析或自行构造游标。
- `GET /studio/apps/:appId`：获取应用详情；路径参数不是 UUID v4 时返回 `400`，资源不存在或
  不属于当前用户时返回 `404`，两种情况的响应 `message` 均为“应用不存在”。
- `GET /studio/apps/:appId/workflow-draft`：读取当前应用草稿的 `schemaVersion`、`revision`、
  `definition`、`layout` 和 `updatedAt`。
- `PUT /studio/apps/:appId/workflow-draft`：保存当前应用草稿；请求携带当前 `revision`、
  `definition` 和 `layout`，成功后返回递增后的修订号。修订号落后时返回 `409`，不得静默
  覆盖其他编辑会话的更新。
- `POST /studio/apps`：创建应用，并同时创建对应 Workflow 与空草稿。
- `POST /studio/apps/import`：导入 `dslVersion: 1` 的 JSON DSL，校验应用元数据、工作流定义
  与布局后创建新的应用、Workflow 和草稿；导入时重新生成应用与工作流 ID。
- `POST /studio/apps/:appId/duplicate`：复制当前用户的应用与工作流草稿；副本名称依次使用
  `原名称-副本`、`原名称-副本2` 等当前用户下尚未占用的名称。
- `PATCH /studio/apps/:appId`：编辑应用名称、图标或描述，至少提供一个字段。
- `DELETE /studio/apps/:appId`：永久删除当前用户的应用，以及关联工作流、草稿、版本、部署、
  运行、节点运行、API Key 与 API 调用日志；删除操作不可恢复。
- `GET /studio/apps/:appId/dsl`：以 `application/json` 附件直接下载 DSL，不套统一成功响应；
  DSL 使用 `dslVersion: 1`，包含应用元数据、草稿结构版本、修订号、工作流定义与布局。

Studio 的 UUID 路径参数通过 `ParseUUIDPipe` 校验；所有读取与修改都同时检查资源归属，不允许
仅凭应用 ID 跨用户访问。

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

## 依赖方向

- 传输层依赖应用服务，应用服务依赖抽象的数据访问或运行时接口。
- 基础设施实现依赖 Prisma、Redis、LangGraph 等具体库。
- 领域契约不得依赖 Nest HTTP 类型或 Prisma 生成类型。
- 前后端共享的纯协议放入 `@ai-workflow/shared` 前，先确认不包含服务端实现细节。
