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
- PostgreSQL driver adapter 依赖已安装，但当前 NestJS 源码尚未提供 Prisma Module/Service；业务开始访问数据库时再补充实际的数据访问入口和连接生命周期管理。
- 把 Prisma schema、migration 和 client 生命周期放在服务端基础设施边界。
- 由应用服务定义事务边界，Repository 不自行开启彼此无法组合的事务。
- JSON 字段保存工作流前，先使用 `@ai-workflow/core` 校验结构和业务规则。
- 数据模型变更时同步检查 DTO、迁移、索引、唯一约束和历史数据兼容性。
- `App` 统一表示工作流应用，不通过 `AppKind` 或 `kind` 字段区分 Workflow 与 Chatflow。
- 部署不区分环境；每个 `Workflow` 最多有一条 `WorkflowDeployment`，指向当前对外运行的版本。
- 创建 Studio 应用时，在同一个 Prisma 嵌套写入中生成 `App`、一对一 `Workflow` 和
  `WorkflowDraft`；空草稿仍保存完整的工作流顶层结构与空布局，避免后续导出或编辑补建记录。
- Studio DSL 使用 JSON 附件导出，固定携带 `dslVersion`、应用元数据、草稿
  `schemaVersion`/`revision`、`definition` 和 `layout`。数据库草稿在导出前至少校验工作流
  顶层结构；在 Core 提供可被 NodeNext 服务端直接加载的构建入口后，改为复用
  `workflowSchema` 与 `validateWorkflow` 做完整校验。
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
6. 当前运行触发方式不包含定时调度；`WorkflowRunTrigger` 只记录 API、手动、测试和子工作流触发。
7. `WorkflowRun.mode` 区分完整运行与单节点运行；`SINGLE_NODE` 时由应用服务保证 `targetNodeId` 存在，`FULL` 时保持为空。

## LangGraph

- 把 LangGraph 视为可替换执行适配器，不让 Core 模型直接依赖它。
- 先把 Core 工作流转换为内部执行计划，再交给具体适配器。
- 将重试、超时、取消、检查点和恢复语义定义在 runtime 接口，不散落在 Nest Controller 中。
