# NestJS 框架与目录规范

## 当前状态

`apps/server` 已初始化，包名为 `@ai-workflow/server`，基于 NestJS 11 脚手架，使用 oxlint 替代 ESLint，与 monorepo 工程化配置对齐。

## 技术方向

- 使用仓库 Node.js 22+ 与 TypeScript 6 基线。
- 首选 NestJS 11（CommonJS + `module: nodenext`），沿用根 `README.md` 的技术方向。
- `tsconfig.json` 显式加载 `node` 与 `jest` 类型，不依赖 TypeScript 自动发现环境类型；显式设置 `rootDir: "./src"` 与 `outDir: "./dist"`，并通过 `paths` 将 `@/*` 映射到 `./src/*`，TypeScript 6 下不额外设置已弃用的 `baseUrl`。
- 服务端源码内部使用 `@/` 别名导入；Nest CLI 编译器负责将别名转换为相对路径，Jest 通过 `moduleNameMapper` 解析同一别名。
- Lint 使用 oxlint，继承 `configs/oxc/.oxlintrc.json` 并在 `apps/server/.oxlintrc.json` 补充 Node/NestJS 规则。
- 格式化使用根目录 `configs/prettier` 共享配置。
- 测试默认使用 Jest（NestJS v12 将切换为 Vitest + oxlint 原生模板，届时再评估升级）。
- 使用 PostgreSQL 作为主数据存储，使用 Prisma 作为数据访问层。
- Redis 只用于明确的缓存、幂等、限流、短期锁或事件协调需求。
- 只有工作流编排确实需要时才接入 LangGraph，并隔离在运行时适配层。

## 当前目录

```text
apps/server/
├── prisma/
│   ├── migrations/
│   ├── models/
│   │   ├── model-group.prisma
│   │   └── *.prisma
│   ├── enum.prisma
│   └── schema.prisma
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── controllers/
│   │   ├── app-api.controller.ts
│   │   ├── app-api-management.controller.ts
│   │   ├── public-app-api.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── executor-model.controller.ts
│   │   ├── model.controller.ts
│   │   ├── studio-app.controller.ts
│   │   └── workflow-run.controller.ts
│   ├── dto/
│   │   ├── auth.dto.ts
│   │   ├── executor-model.dto.ts
│   │   ├── model.dto.ts
│   │   └── studio.dto.ts
│   ├── generated/prisma/
│   ├── infra/model-provider/
│   │   ├── model-credential.service.ts
│   │   └── *adapter.ts
│   ├── infra/plugin-artifact/
│   │   ├── plugin-artifact-store.ts
│   │   └── plugin-package-inspector.ts
│   ├── infra/workflow-mq/
│   ├── modules/
│   │   ├── auth.module.ts
│   │   ├── executor-model.module.ts
│   │   ├── models.module.ts
│   │   ├── plugin.module.ts
│   │   └── studio.module.ts
│   ├── repositories/
│   │   ├── app-api.repository.ts
│   │   ├── executor-model.repository.ts
│   │   ├── model-group.repository.ts
│   │   ├── studio-app.repository.ts
│   │   └── workflow-run.repository.ts
│   ├── workflow-catalog/
│   │   ├── runtime-node-config-projector.registry.ts
│   │   ├── workflow-execution.registry.ts
│   │   └── workflow-server-catalog.ts
│   └── services/
│       ├── app-api.service.ts
│       ├── auth.service.ts
│       ├── executor-model.service.ts
│       ├── model-connection-test.service.ts
│       ├── model-group.service.ts
│       ├── plugin.service.ts
│       ├── studio-app.service.ts
│       ├── workflow-run-sse.service.ts
│       ├── workflow-run-timeout-scanner.service.ts
│       └── workflow-run.service.ts
├── .oxlintrc.json
├── nest-cli.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── tsconfig.build.json
```

Server 直接从 `@ai-workflow/core`、`@ai-workflow/runtime` 和 `@ai-workflow/protocol` 根入口使用公开
契约，不创建本地类型镜像或 package 加载适配层；各 package 的条件导出负责 NodeNext 类型解析和
CommonJS 运行时入口。`infra/workflow-mq` 的 `WorkflowMqModule` 统一提供共享 RabbitMQ 连接和
Confirm Channel 生命周期；工作流与知识库模块只注册各自的 Publisher / Consumer。工作流拓扑与
`infra/knowledge-mq` 知识任务拓扑使用独立持久化 exchange、queue、retry queue 和 DLQ，不得复用
业务队列。知识任务消息只携带稳定聚合 ID，Worker 回查 PostgreSQL 的 Index、Version、Attempt 和
Outbox 事实；Publisher Confirm、手动 Ack、延迟重试和死信必须保持闭环。
`infra/knowledge` 封装 S3/MinIO Source Store、Embedding 调用与 OpenSearch projection/search；业务
Service 只传稳定事实 ID 和领域参数，不拼接 OpenSearch DSL，也不把向量或供应商原始响应暴露为
Controller DTO。PostgreSQL 是唯一事实源，OpenSearch 只保存可按 Index/Version 重建的投影。Source
GC 只扫描平台严格格式的托管 key，经过保护期并确认新旧事实表均无引用后才允许幂等删除。
`WorkflowRunTimeoutScanner` 作为 `StudioModule` provider 管理
`deadlineAt` 扫描生命周期，并复用 `WorkflowRunService` 的统一终态入口。业务服务不得自行访问
`process.env` 或把 AMQP 细节散落到 Controller。
`workflow-catalog` 负责按工作流解析不可变 Core、Runtime projector 与执行能力目录；业务 Service
只消费 `WorkflowCatalogResolver` 返回的同一 Catalog，不直接导入 Core 全局 Registry，也不在 MQ
Routing Service 中维护节点类型表。

## 常用命令

在 `apps/server` 目录或通过 `pnpm -F @ai-workflow/server <script>` 执行：

| 命令                      | 说明                                |
| ------------------------- | ----------------------------------- |
| `dev` / `dev:server`      | 开发模式启动（watch）               |
| `start:dev`               | NestJS 兼容启动入口                 |
| `build`                   | 生成 Prisma Client 并编译到 `dist/` |
| `prisma:generate`         | 生成 Prisma Client                  |
| `prisma:migrate:dev`      | 创建并执行开发迁移                  |
| `prisma:migrate:deploy`   | 执行已有生产迁移                    |
| `prisma:studio`           | 打开 Prisma Studio                  |
| `start:prod:migrate`      | 执行生产迁移后启动服务              |
| `lint` / `lint:fix`       | oxlint 检查 / 自动修复              |
| `format` / `format:check` | Prettier 格式化 / 检查              |
| `check`                   | format:check + lint                 |
| `test` / `test:e2e`       | 单元测试 / E2E 测试                 |

根目录 `pnpm lint` 会递归 lint 整个 monorepo，包括 `apps/server`。
根目录 `pnpm dev` 通过 Turbo 同时启动 Web 和 Server，`pnpm dev:server`
只启动 Server。

## oxlint 约定

- 继承 monorepo 基础规则：`extends: ["../../configs/oxc/.oxlintrc.json"]`。
- 启用 `node` 插件，`env.node: true`。
- NestJS 装饰器场景关闭 `eslint/new-cap`，允许 `@Module()` 等装饰器空类。
- 关闭 `typescript/parameter-properties`，保留 NestJS 构造函数注入写法。
- 测试文件 override 关闭 `eslint/init-declarations`（`let app` 等 Jest 惯用法）。

## 模块职责

- Controller 负责 HTTP 传输、认证信息和 DTO，不承载业务流程。
- Service 编排用例与事务边界，不直接拼接 HTTP 响应。
- Repository 或基础设施适配器封装 Prisma、Redis 和第三方服务。
- Nest Module 显式声明 imports、providers、controllers 和 exports，只导出其他模块确实需要的 provider。
- Controller 使用 `@JwtAuth()` 时，所属业务模块必须导入项目封装的
  `modules/jwt.module.ts`，确保 Nest 在该模块上下文实例化 `JwtAuthGuard` 时可以解析已配置的
  `JwtService`；禁止直接导入未注册配置的 `@nestjs/jwt` 原始 `JwtModule`。
- 不跨模块深层导入私有文件，通过模块公开 provider 或共享 package 传递契约。
- `common` 只放真正跨模块的基础设施，不作为杂物目录。
