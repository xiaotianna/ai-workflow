# AI Workflow Server

`@ai-workflow/server` 是 AI Workflow monorepo 的 NestJS 服务端应用，负责 HTTP 接口、
鉴权、配置、日志、PostgreSQL/Prisma 数据访问、Redis 会话，以及工作流持久化和运行时接入。

## 当前技术栈

- NestJS 11 + TypeScript
- PostgreSQL 17 + Prisma 7
- Redis 7.4
- RabbitMQ 4 + amqplib
- JWT + Argon2
- Winston
- class-validator / class-transformer

## 目录结构

```text
apps/server/
├── prisma/
│   ├── migrations/              # Prisma migration SQL
│   ├── models/
│   │   ├── api-call-log.prisma
│   │   ├── api-key.prisma
│   │   ├── app.prisma
│   │   ├── user.prisma
│   │   ├── workflow-deployment.prisma
│   │   ├── workflow-draft.prisma
│   │   ├── workflow-node-run.prisma
│   │   ├── workflow-command-outbox.prisma
│   │   ├── workflow-result-inbox.prisma
│   │   ├── workflow-run.prisma
│   │   ├── workflow-version.prisma
│   │   └── workflow.prisma
│   ├── enum.prisma              # 跨模型共享枚举
│   └── schema.prisma            # generator 和 datasource
├── public/
│   ├── avatars/                 # 头像静态资源
│   └── images/                  # 通用图片静态资源
├── src/
│   ├── common/interfaces/       # 跨模块的基础接口
│   ├── config/                  # 环境变量与 Winston 配置
│   ├── constant/                # 环境变量名等常量
│   ├── controllers/             # HTTP 传输层
│   ├── decorators/              # NestJS 自定义装饰器
│   ├── dto/                     # 请求 DTO 与输入校验
│   ├── filters/                 # 全局异常过滤器
│   ├── generated/prisma/        # Prisma 自动生成代码，不手动修改
│   ├── guards/                  # JWT 等请求守卫
│   ├── infra/
│   │   ├── model-provider/      # 模型供应商适配、凭证加密与地址策略
│   │   ├── prisma/              # Prisma Client 和连接生命周期
│   │   ├── redis/               # Redis Client 和连接生命周期
│   │   └── workflow-mq/         # RabbitMQ 拓扑、Outbox Publisher 与 Result Consumer
│   ├── interceptors/            # 成功响应统一封装
│   ├── modules/                 # NestJS 模块与依赖装配
│   ├── repositories/            # Prisma/Redis 数据访问封装
│   ├── services/                # 应用用例和事务编排
│   ├── vo/                      # 对外响应对象
│   ├── app.module.ts            # 根模块
│   └── main.ts                  # 应用启动和全局能力注册
├── nest-cli.json
├── package.json
├── prisma.config.ts             # Prisma CLI 路径和 DATABASE_URL
├── tsconfig.json
└── tsconfig.build.json
```

`dist/`、`logs/`、`node_modules/` 和 `src/generated/prisma/` 是构建、运行、依赖或生成产物，
不承担业务源码职责。

## 当前功能

- 手机号和密码登录；用户不存在时自动创建。
- Argon2 密码哈希与校验。
- JWT 签发、Guard 鉴权和 Redis 登录会话。
- 当前用户查询、用户名和密码修改、退出登录。
- Prisma 和 Redis 的 NestJS 生命周期管理。
- 对话/嵌入模型组的持久化、启停、加密凭证和模型列表连通性测试。
- 完整工作流与单节点测试运行，共用 Runtime、Protocol、运行记录和执行器链路。
- RuntimeState revision、Command Outbox、Result Inbox、leaseToken 和 deadline 持久化。
- RabbitMQ 持久队列、Publisher Confirm、Outbox claim/重试、Result 重试与死信队列。
- 全局 DTO 校验、成功响应封装和异常过滤。
- Winston 控制台日志与按日期切割的文件日志。
- `/images/` 和 `/avatars/` 静态资源访问。

当前接口统一返回：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 模块边界

- Controller：HTTP 参数、认证上下文和状态码，不承载业务流程。
- Service：编排业务用例和事务边界。
- Repository：封装 Prisma、Redis 和其他基础设施访问。
- `infra/`：管理具体客户端和连接生命周期。
- 工作流结构、类型、常量和业务校验直接使用 `@ai-workflow/core` 根入口，不在 Server 重复声明。
- 工作流状态机、类型和根 DAG 调度直接使用 `@ai-workflow/runtime` 根入口。
- Executor 消息类型和边界解析直接使用 `@ai-workflow/protocol` 根入口；RabbitMQ 拓扑、Outbox/Inbox
  持久化和租约仍由 Server 负责。
- 服务端不依赖 Web、UI、Form 或 Nodes UI。

## 数据表设计

当前 Prisma schema 与 migration 包含用户、工作流和模型配置数据：

| 表                        | 简要职责                                 |
| ------------------------- | ---------------------------------------- |
| `apps`                    | 应用名称、图标、描述、类型和用户归属     |
| `workflows`               | 工作流稳定身份，与 App 一对一            |
| `workflow_drafts`         | 当前画布定义、布局和乐观锁 revision      |
| `workflow_versions`       | 发布、测试和手动保存的不可变快照         |
| `workflow_deployments`    | 各环境当前激活的版本                     |
| `api_keys`                | API Key 前缀、哈希、过期和吊销状态       |
| `api_call_logs`           | HTTP/API 调用结果和耗时                  |
| `workflow_runs`           | 运行状态、RuntimeState 与 revision       |
| `workflow_node_runs`      | 节点执行、幂等键、租约、输入输出         |
| `workflow_command_outbox` | 待派发的节点协议命令、执行类别和固定路由 |
| `workflow_result_inbox`   | 已消费的节点结果与幂等记录               |
| `model_groups`            | 用户的对话/嵌入供应商配置与加密凭证      |
| `configured_models`       | 模型组内稳定模型 ID、顺序和启用状态      |

工作流节点、连线和输出使用 JSONB 整体保存，React Flow 的位置、Loop 尺寸和 viewport
使用独立 layout JSONB。API 调用日志和运行日志分离，因为 API 可能在启动工作流前失败，
测试或子工作流运行也可能不经过 API。

运行时职责、关系和恢复目标见
[Go 节点执行器架构](../../docs/go-node-executor-architecture.md)。

## 配置

服务端通过 ConfigModule 校验以下环境变量：

| 变量                              | 用途                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                        | `development`、`test` 或 `production`                 |
| `PORT`                            | HTTP 监听端口，默认 `3000`                            |
| `DATABASE_URL`                    | PostgreSQL 连接地址                                   |
| `REDIS_URL`                       | Redis 连接地址                                        |
| `JWT_SECRET`                      | JWT 签名密钥                                          |
| `JWT_EXPIRES_IN`                  | JWT 有效期，默认 `7d`                                 |
| `MODEL_CREDENTIAL_ENCRYPTION_KEY` | 模型 Key 加密使用的 32 字节 Base64 密钥；生产环境必填 |
| `RABBITMQ_URL`                    | AMQP 地址，默认连接 `compose.dev.yaml` 的开发 vhost   |
| `WORKFLOW_EXECUTOR_ROUTING_MODE`  | `legacy` 或 `classified`；默认 `legacy` 保持旧队列    |
| `EXECUTOR_ENABLED_CLASSES`        | 允许派发的执行类别，逗号分隔                          |
| `EXECUTOR_INTERNAL_AUTH_TOKEN`    | Executor 内部接口 Bearer Token；为空时兼容旧部署      |
| `EXECUTOR_REQUIRE_INTERNAL_AUTH`  | 为 `true` 时缺少内部认证令牌会拒绝启动                |

开发和测试环境未配置模型凭证密钥时，会通过 HKDF 从 `JWT_SECRET` 派生用途隔离密钥；生产环境
必须配置专用密钥。模型运行和连通性测试不应用目标地址白名单或内网地址过滤；目标网络限制由
部署层网络策略或出站网关承担。

节点执行路由支持兼容迁移：默认 `legacy` 仍把所有 Go 业务节点发布到
`ai-workflow.node.execute.v1`；部署分类 Worker 后再将
`WORKFLOW_EXECUTOR_ROUTING_MODE` 切换为 `classified`。Outbox 会在创建时固定保存执行类别和
Routing Key，发布重试不会因运行期间的配置变化改投其他 Worker。

## 模型配置接口

模型接口统一使用 Bearer Token，并按当前用户隔离：

- `GET/POST /models/groups`：查询或创建模型组。
- `GET/PUT/DELETE /models/groups/:groupId`：读取、完整保存或删除模型组。
- `PATCH /models/groups/:groupId/enabled`：启停模型组。
- `PATCH /models/groups/:groupId/models/:modelId/enabled`：启停单模型。
- `POST /models/test-connection`：通过 OpenAI/DeepSeek 的 `GET /models` 或 Ollama 的
  `GET /api/tags` 返回网络、认证、响应结构和耗时结果。
- `POST /models/test-model`：向指定对话模型发送最小流式消息；收到首个有效消息片段后立即断开
  上游流，失败时优先返回上游响应中的核心错误信息。

模型组响应不会返回 Key 明文；已配置凭证时只返回 `maskedApiKey`，格式固定为前 4 位、`***`
和后 4 位。

Prisma 7 从 `prisma.config.ts` 读取整个 `prisma/` schema 目录和数据库地址，不在
`schema.prisma` 的 datasource 中声明连接地址。

## 工作流测试运行

`POST /studio/apps/:appId/workflow-runs/test` 同时承载两种编辑器测试入口：`mode=FULL` 运行根 DAG，
`mode=SINGLE_NODE` 携带 `targetNodeId` 只运行指定业务节点。两种模式都会保存不可变测试版本、Run、
NodeRun、Command Outbox 与 Result Inbox。

前端通过 `fetch` 向创建接口发送 POST 请求并直接读取 SSE 响应，依次接收 `workflow_started`、
`node_finished` 和 `workflow_finished`。事件流建连后先发送数据库当前快照，避免创建 Run 与订阅
之间漏掉已完成节点；初始快照和节点完成增量均携带包含 `RUNNING`、`SUCCEEDED`、`FAILED` 的最新
节点状态，其中尚未被 Publisher 领取的 `PENDING` 节点按 `RUNNING` 展示，执行超时按 `FAILED`
展示。POST 事件流在取得 runId 后意外中断时，Web 只使用 GET SSE 自动恢复一次；Server 检测到
最后一个 SSE 客户端断开时会自动取消仍在运行的测试 Run。普通 Run GET 只保留给详情与最终快照
恢复，不用于轮询。

运行中可调用 `POST /studio/apps/:appId/workflow-runs/:runId/cancel` 执行一次性暂停：Run 原子进入
`CANCELLED`，尚未完成的 NodeRun 与待派发 Outbox 同事务取消，并通过 `workflow_finished` 通知
前端；已经启动的子工作流 Run 会沿父子关系递归取消。已经发送到 RabbitMQ 的命令由 Worker 通过
内部租约接口识别：尚未执行的消息直接 Ack 丢弃，执行中的节点取消 Command context；极端竞态
产生的迟到 Result 继续按 stale 忽略。

Go Worker 使用 `POST /internal/executor/commands/lease` 校验 Command、Run、NodeRun、Execution 与
Lease Token 身份。消费前校验失败时不执行节点，执行期间每 500ms 复查，以便 SSE 断开或主动暂停
能够终止 HTTP、LLM 和 Code 等外部工作。该接口只允许 Server 与 Executor 的受控内部网络访问。

两种测试模式都按异步链路执行：创建 Run 时将 RuntimeState、NodeRun 和 Command Outbox 同事务提交；
后台 Publisher 领取 Outbox，经 RabbitMQ Publisher Confirm 后标记已发布；Go Worker 消费命令并在 Result
可靠发布后 Ack；Server Result Consumer 校验协议、commandId、leaseToken 与 revision CAS，在同一事务中
写入 Inbox、推进 RuntimeState，并生成下一批 Outbox。

Outbox 采用 `PENDING → PUBLISHING → PUBLISHED/FAILED` 状态和 stale claim 恢复，消息处理按
at-least-once 设计。损坏的 Outbox 命令与达到最大处理次数的 Result 会把 Run 写入失败终态并发布
`workflow_finished`；后台扫描 `deadlineAt`，把无结果的到期节点与 Run 写入超时终态。普通节点期限
为 30 秒，LLM 与 Sub Workflow 使用 24 小时长任务期限；等待期间 SSE 心跳会维持前端运行态，主动
取消或最后一个 SSE 客户端断开仍会通过租约终止请求。Go 已按节点类型注册 `llm`、`rag`、`code`、
`http`、`condition` 的具体 Executor；RabbitMQ transport、Registry、Runtime、SSE、持久化与幂等
链路均为正式边界。RAG、业务副作用幂等存储和通用 Secret Gateway 仍属于后续阶段。

## 常用命令

在仓库根目录执行：

```bash
pnpm --filter @ai-workflow/server dev
pnpm --filter @ai-workflow/server check
pnpm --filter @ai-workflow/server test
pnpm --filter @ai-workflow/server prisma:generate
pnpm --filter @ai-workflow/server run prisma:migrate:dev
pnpm --filter @ai-workflow/server prisma:studio
```

Prisma schema 变化后需要显式运行 `prisma:generate`。生产环境只执行已经提交的
`prisma:migrate:deploy`，不运行 `prisma:migrate:dev`。
