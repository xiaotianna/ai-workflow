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

当前 migration 只落地了 `users` 表。工作流相关模型已经按多文件 Schema 定义，但尚未生成
和执行 migration，也尚未接入 Repository 或 Service：

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

工作流节点、连线和输出使用 JSONB 整体保存，React Flow 的位置、Loop 尺寸和 viewport
使用独立 layout JSONB。API 调用日志和运行日志分离，因为 API 可能在启动工作流前失败，
测试或子工作流运行也可能不经过 API。

完整关系、字段和生命周期见
[工作流数据库设计](../../docs/workflow-database-design.md)。

## 配置

服务端通过 ConfigModule 校验以下环境变量：

| 变量             | 用途                                  |
| ---------------- | ------------------------------------- |
| `NODE_ENV`       | `development`、`test` 或 `production` |
| `PORT`           | HTTP 监听端口，默认 `3000`            |
| `DATABASE_URL`   | PostgreSQL 连接地址                   |
| `REDIS_URL`      | Redis 连接地址                        |
| `JWT_SECRET`     | JWT 签名密钥                          |
| `JWT_EXPIRES_IN` | JWT 有效期，默认 `7d`                 |

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
