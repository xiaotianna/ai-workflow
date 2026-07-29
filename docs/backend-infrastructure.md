# 后端基础设施现状与待办

> 盘点日期：2026-07-29

## 结论

当前后端已经具备 NestJS、PostgreSQL、Redis、Prisma 和日志配置的基础骨架，
但还没有形成可以支撑业务接口的完整运行闭环。

Prisma 并不是没有安装。项目已经完成 Prisma 7 的 schema、migration、Client
generator 和 PostgreSQL driver adapter 配置，当前主要缺少的是 Prisma 与 NestJS
依赖注入、连接生命周期和 Repository 的实际接入。

建议优先完成以下最小闭环：

```text
Prisma 运行时接入
  → UserRepository
  → 登录 DTO 与请求校验
  → 密码哈希与 JWT
  → 统一错误处理
  → 健康检查
```

## 已具备的基础设施

| 范围          | 当前状态                                                         |
| ------------- | ---------------------------------------------------------------- |
| 服务端框架    | `apps/server` 已初始化为 NestJS 11 应用                          |
| 环境配置      | 已使用 `@nestjs/config` 和 Joi 加载、校验环境变量                |
| 日志          | 已接入 Winston、控制台日志和按日期切割的文件日志                 |
| PostgreSQL    | `compose.dev.yaml` 提供 PostgreSQL 17、健康检查和 named volume   |
| Redis         | `compose.dev.yaml` 提供 Redis 7.4、健康检查、AOF 和 named volume |
| Prisma        | 已安装 Prisma 7、`@prisma/client`、`@prisma/adapter-pg` 和 `pg`  |
| Prisma CLI    | 已提供 generate、开发迁移、生产迁移和 Studio 脚本                |
| 数据模型      | 当前已有 `User` 模型和两条 migration                             |
| Prisma Client | 已配置输出到 `apps/server/src/generated/prisma`                  |
| 鉴权配置      | 已声明 `JWT_SECRET` 和 `JWT_EXPIRES_IN_SECONDS` 环境变量         |

## P0：开始业务开发前应完成

### 1. 接入 Prisma 运行时

#### 当前状态

- `apps/server/prisma/schema.prisma` 已定义 PostgreSQL 数据源和 `User` 模型。
- `apps/server/prisma.config.ts` 已从 `DATABASE_URL` 读取 Prisma CLI 连接地址。
- PostgreSQL driver adapter 已安装。
- Prisma Client 已生成。
- `AppModule` 尚未引入 Prisma Module。
- `apps/server/src/repository/user.repository.ts` 仍为空文件。

#### 需要补齐

- 新增 `PrismaModule` 和 `PrismaService`。
- 通过 `ConfigService` 获取 `DATABASE_URL`，不要在业务代码中直接读取环境变量。
- 使用 Prisma 7 的 PostgreSQL driver adapter 创建 Prisma Client。
- 接入 NestJS 模块初始化和销毁生命周期，正确建立、释放数据库连接。
- 在应用入口启用优雅关闭，使数据库连接能够在进程退出时释放。
- 将 Prisma Service 注入 Repository，再由应用 Service 使用 Repository。
- 不把 Prisma Client 或 Prisma Model 直接暴露给 Controller。
- 事务边界由应用 Service 定义，避免 Repository 各自开启无法组合的事务。

建议的基础设施目录：

```text
apps/server/src/infrastructure/prisma/
├── prisma.module.ts
└── prisma.service.ts
```

### 2. 补齐 Prisma Client 的构建和部署流程

`apps/server/src/generated/prisma` 属于生成目录，不应手动修改，而且当前已被
`.gitignore` 忽略。干净的 CI、容器或生产环境不能依赖开发机上现存的生成结果。

需要明确以下流程：

```text
构建阶段：prisma:generate → build
发布阶段：prisma:migrate:deploy → start:prod
```

Prisma 7 的 `migrate dev` 和 `migrate deploy` 不会自动生成 Prisma Client，因此
schema 或 generator 变化后必须显式执行 `prisma:generate`。

### 3. 处理现有 migration 的数据安全问题

当前第二条 migration 会执行以下变更：

- 删除 `users.email`。
- 删除 `users.name`。
- 新增必填的 `password`、`phone` 和 `username`。
- 为 `phone` 增加唯一索引。

这条 migration 在全新的空数据库上可以执行，但如果 `users` 已有数据，可能因为新增
非空字段而执行失败，并且删除字段会造成数据丢失。

在进入共享环境或生产环境前，需要根据 migration 是否已经被其他环境使用选择方案：

- 尚未进入共享环境：可以整理或合并初始 migration。
- 已进入共享环境：新增安全的数据迁移，分阶段增加可空字段、回填数据、建立约束，
  不修改已经应用过的 migration 历史。

### 4. 完成输入校验和 DTO

当前 `auth.dto.ts` 为空，应用入口也没有全局 `ValidationPipe`。

需要补齐：

- 安装并配置 `class-validator`、`class-transformer`。
- 为登录、注册等外部输入定义独立 DTO。
- 在应用入口启用统一校验、转换和未知字段处理策略。
- 不直接使用 Prisma Model 作为接口 DTO。
- 对手机号、密码长度等输入规则做显式校验。

### 5. 完成鉴权基础设施

当前 `AuthController` 和 `AuthService` 只是空壳，JWT 环境变量尚未被实际使用。

需要补齐：

- 密码哈希与校验，数据库中只能保存密码哈希。
- 建议将 Prisma 字段 `password` 重命名为 `passwordHash`，降低误用明文密码的风险。
- JWT Module、令牌签发和过期配置。
- JWT Guard 和当前用户 Decorator。
- 用户不存在、密码错误、手机号重复等可预期错误。
- 禁止在日志和接口响应中输出密码、密码哈希、令牌或密钥。

### 6. 建立统一 API 基础能力

需要补齐：

- 全局异常过滤器。
- 稳定的错误响应结构，例如 `code`、`message`、`details`、`requestId`。
- Request ID 和 HTTP 请求日志。
- 日志敏感信息脱敏。
- 可配置的 CORS 白名单；当前 `cors()` 默认放开全部来源。
- 全局 API 前缀或版本策略，避免后续接口路径难以演进。
- `enableShutdownHooks()` 和进程退出时的资源释放。

## P1：基础闭环完成后补充

### 1. 健康检查

建议提供：

- 存活检查：确认 NestJS 进程可以响应。
- 就绪检查：确认 PostgreSQL 等关键依赖可用。
- Redis 如果不是关键依赖，应根据实际用例决定故障时是否影响就绪状态。

健康检查可用于本地排查、容器编排、负载均衡和发布验收。

### 2. Redis 运行时接入

当前只有 Redis 容器和 `REDIS_URL`，尚未安装或实现 Redis Client Module。

只有在缓存、幂等、限流、短期锁或事件协调需求明确后再接入，并同时明确：

- Key 命名空间和版本。
- 过期时间。
- 主动失效策略。
- 连接生命周期。
- Redis 故障时的降级行为。

Redis 不应作为工作流定义、执行结果等持久数据的唯一事实来源。

### 3. 接口安全与可维护性

按实际需求逐步补充：

- 登录和高频接口限流。
- Swagger 或 OpenAPI 文档。
- 分页、筛选和排序的统一协议。
- 安全响应头。
- 请求体大小限制。
- 审计日志。

### 4. 可观测性

当前已有应用日志，后续还需要根据部署环境决定：

- 生产环境是否只输出结构化 stdout 日志。
- Request ID、用户 ID、工作流执行 ID 的关联方式。
- 指标和告警。
- 分布式追踪。
- 日志保存、采集和脱敏策略。

### 5. 部署基础设施

当前仓库只有本地 PostgreSQL、Redis 的 Compose 配置，尚未发现服务端生产
Dockerfile 或完整发布流程。

需要在准备部署时补齐：

- 服务端生产镜像。
- 配置和密钥注入。
- Prisma Client 生成。
- migration deploy 发布步骤。
- 健康检查和滚动发布策略。
- 生产日志和数据备份策略。

## P2：工作流业务接入

当前 Prisma schema 只有 `User`，尚未提供工作流业务数据模型。后续至少需要根据真实
业务设计：

- 工作流定义。
- 工作流版本。
- 节点类型版本。
- 工作流执行记录。
- 节点执行记录。
- 运行状态、错误信息和必要的检查点。

保存外部工作流 JSON 前，应先使用 `@ai-workflow/core` 完成结构与业务规则校验。
执行能力由 `@ai-workflow/runtime` 承载；如果后续接入 LangGraph，应将其放在可替换的
运行时适配层，不让 Controller 或 Core 模型直接依赖 LangGraph。

## 推荐实施顺序

- [ ] 实现 Prisma Module、Prisma Service 和连接生命周期。
- [ ] 接通 UserRepository，并由 AuthService 使用 Repository。
- [ ] 确认 Prisma Client 在干净构建环境中可以生成。
- [ ] 处理现有 migration 的数据安全问题。
- [ ] 完成登录 DTO、全局 ValidationPipe 和输入校验。
- [ ] 接入密码哈希、JWT、Guard 和当前用户上下文。
- [ ] 建立统一错误响应、异常过滤器和 Request ID。
- [ ] 增加 PostgreSQL 健康检查和优雅关闭。
- [ ] 根据真实需求接入 Redis。
- [ ] 设计工作流持久化模型和运行时边界。
- [ ] 准备生产镜像、迁移发布流程和可观测性。

## 当前最小目标

后端下一阶段不需要一次性补完所有基础设施。最小可用目标是：

1. NestJS 能通过 Prisma Service 正确连接 PostgreSQL。
2. UserRepository 能完成用户查询和创建。
3. 登录输入经过统一校验。
4. 密码只以哈希形式保存和比较。
5. 登录成功后签发 JWT，受保护接口通过 Guard 鉴权。
6. 数据库不可用、输入错误和鉴权失败时返回统一、可追踪的错误响应。

完成以上内容后，后端才具备继续开发用户、工作流和执行接口的稳定基础。
