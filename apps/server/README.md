# AI Workflow Server

`@ai-workflow/server` 是 AI Workflow monorepo 的 NestJS 服务端应用，负责 HTTP 接口、
鉴权、配置、日志、PostgreSQL/Prisma 数据访问、Redis 会话，以及后续的工作流持久化和
运行时接入。

## 当前技术栈

- NestJS 11 + TypeScript
- PostgreSQL 17 + Prisma 7
- Redis 7.4
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
│   │   └── redis/               # Redis Client 和连接生命周期
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
- 工作流结构和业务校验使用 `@ai-workflow/core`。
- 工作流执行计划和调度后续由 `@ai-workflow/runtime` 承载。
- 服务端不依赖 Web、UI、Form 或 Nodes UI。

## 数据表设计

当前 Prisma schema 与 migration 包含用户、工作流和模型配置数据：

| 表                     | 简要职责                             |
| ---------------------- | ------------------------------------ |
| `apps`                 | 应用名称、图标、描述、类型和用户归属 |
| `workflows`            | 工作流稳定身份，与 App 一对一        |
| `workflow_drafts`      | 当前画布定义、布局和乐观锁 revision  |
| `workflow_versions`    | 发布、测试和手动保存的不可变快照     |
| `workflow_deployments` | 各环境当前激活的版本                 |
| `api_keys`             | API Key 前缀、哈希、过期和吊销状态   |
| `api_call_logs`        | HTTP/API 调用结果和耗时              |
| `workflow_runs`        | 一次完整工作流运行                   |
| `workflow_node_runs`   | 节点级执行状态、输入输出、错误和耗时 |
| `model_groups`         | 用户的对话/嵌入供应商配置与加密凭证  |
| `configured_models`    | 模型组内稳定模型 ID、顺序和启用状态  |

工作流节点、连线和输出使用 JSONB 整体保存，React Flow 的位置、Loop 尺寸和 viewport
使用独立 layout JSONB。API 调用日志和运行日志分离，因为 API 可能在启动工作流前失败，
测试或子工作流运行也可能不经过 API。

完整关系、字段和生命周期见
[工作流数据库设计](../../docs/workflow-database-design.md)。

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
| `MODEL_CONNECTION_PRIVATE_HOSTS`  | 允许模型探测访问的私有 `host[:port]`，逗号分隔        |

开发和测试环境未配置模型凭证密钥时，会通过 HKDF 从 `JWT_SECRET` 派生用途隔离密钥；生产环境
必须配置专用密钥。开发环境默认只放行 `localhost:11434`、`127.0.0.1:11434` 和
`[::1]:11434` 访问本机 Ollama，其他私有端点需要显式加入白名单。

## 模型配置接口

模型接口统一使用 Bearer Token，并按当前用户隔离：

- `GET/POST /models/groups`：查询或创建模型组。
- `GET/PUT/DELETE /models/groups/:groupId`：读取、完整保存或删除模型组。
- `PATCH /models/groups/:groupId/enabled`：启停模型组。
- `PATCH /models/groups/:groupId/models/:modelId/enabled`：启停单模型。
- `POST /models/test-connection`：通过 OpenAI/DeepSeek 的 `GET /models` 或 Ollama 的
  `GET /api/tags` 返回网络、认证、响应结构和耗时结果。

模型组响应不会返回 Key 明文；已配置凭证时只返回 `maskedApiKey`，格式固定为前 4 位、`***`
和后 4 位。

Prisma 7 从 `prisma.config.ts` 读取整个 `prisma/` schema 目录和数据库地址，不在
`schema.prisma` 的 datasource 中声明连接地址。

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
