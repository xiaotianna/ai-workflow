# 数据与工作流接入

## 本地开发基础设施

- 根目录 `compose.dev.yaml` 统一提供 PostgreSQL 17 与 Redis 7.4，NestJS 默认在宿主机运行，不加入 Compose。
- 服务端本地变量从 `apps/server/.env.example` 复制到未提交的 `.env`；默认使用 `localhost:5432` 和 `localhost:6379`。
- 根目录通过 `docker:dev:up`、`docker:dev:down`、`docker:dev:logs` 和 `docker:dev:status` 脚本管理开发基础设施。
- PostgreSQL 与 Redis 数据使用 Docker named volume；日常停止不得隐式删除 volume。
- 若未来把 NestJS 加入 Compose，数据库和 Redis 主机名改用 Compose service 名称，不继续使用 `localhost`。

## PostgreSQL 与 Prisma

- 使用 Prisma 7 的 `prisma-client` generator，Client 输出到 `apps/server/src/generated/prisma`，该目录由命令生成且不手动修改。
- Prisma 7 的 `migrate dev` 和 `db push` 不自动生成 Client；schema 或 generator 配置变化后显式执行 `prisma:generate`。`--name init` 只用于创建第一条迁移，已有迁移的项目首次启动使用不带名称的 `prisma:migrate:dev`。
- Prisma CLI 从 `apps/server/prisma.config.ts` 读取 `DATABASE_URL`，NestJS 通过 `ConfigModule` 加载应用环境变量。
- PostgreSQL driver adapter 依赖已安装，但当前 NestJS 源码尚未提供 Prisma Module/Service；业务开始访问数据库时再补充实际的数据访问入口和连接生命周期管理。
- 把 Prisma schema、migration 和 client 生命周期放在服务端基础设施边界。
- 由应用服务定义事务边界，Repository 不自行开启彼此无法组合的事务。
- JSON 字段保存工作流前，先使用 `@ai-workflow/core` 校验结构和业务规则。
- 数据模型变更时同步检查 DTO、迁移、索引、唯一约束和历史数据兼容性。
- 不把数据库连接或 Prisma client 暴露给 Controller。

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

## LangGraph

- 把 LangGraph 视为可替换执行适配器，不让 Core 模型直接依赖它。
- 先把 Core 工作流转换为内部执行计划，再交给具体适配器。
- 将重试、超时、取消、检查点和恢复语义定义在 runtime 接口，不散落在 Nest Controller 中。
