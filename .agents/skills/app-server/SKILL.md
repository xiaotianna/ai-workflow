---
name: app-server
description: '规划和维护 AI Workflow 的服务端应用。设计或修改 apps/server、接口、模块边界、DTO、鉴权、PostgreSQL、Prisma、Redis、工作流持久化与运行时接入时使用。'
---

# 后端应用开发规范

## 执行流程

1. 先读取根目录 `AGENTS.md`，确认 `apps/server` 当前是否仍为空或已经初始化。
2. 根据任务只读取必要的引用文件，不要把暂定架构当成已经安装的依赖。
3. 当前首选框架为 NestJS；仓库出现真实实现后，以实际代码为准并同步更新本技能。
4. 划清传输层、应用服务、数据访问层和工作流运行时的职责边界。
5. 涉及 workspace package 时，同时读取 `$ai-workflow-packages` 中对应子包的引用文件。
6. 框架、模块、数据模型或基础设施约定变化时，在同一任务中更新本技能。

## 按需读取

- 初始化服务端、调整目录或 NestJS 模块：读取 [references/framework-and-layout.md](references/framework-and-layout.md)。
- 设计 Controller、DTO、错误、鉴权或配置：读取 [references/api-and-boundaries.md](references/api-and-boundaries.md)。
- 接入 Prisma、PostgreSQL、Redis、LangGraph 或工作流 package：读取 [references/data-and-workflow.md](references/data-and-workflow.md)。

## 当前结论

- 根 `README.md` 暂定后端技术栈为 NestJS、PostgreSQL、Prisma、Redis 和 LangGraph。
- `apps/server` 已初始化为 `@ai-workflow/server`（NestJS 11 + oxlint）；根目录 `compose.dev.yaml` 已提供 PostgreSQL 与 Redis 开发基础设施。
- Prisma 7 的 schema、migration、Client generator 和 PostgreSQL driver adapter 依赖已配置；NestJS 已通过全局 `PrismaModule`/`PrismaService` 接入数据库，认证与 Studio 模块已使用 Repository 封装数据访问。Redis 已接入认证会话，LangGraph 尚未接入应用。
- 模型管理已通过 `ModelsModule` 接入：按用户持久化对话/嵌入模型组，API Key 使用 AES-256-GCM 加密，并由服务端供应商适配器执行模型列表连通性与单模型流式对话测试。`ExecutorModelModule` 另提供受 NodeRun 租约保护的内部解析接口，只按不可变版本中的稳定模型 ID 向 Go LLM Executor 提供本次运行所需配置。
- 知识库已落地最小 `KnowledgeBase` Prisma 模型和迁移，并通过 `KnowledgeBaseModule` 提供按用户
  隔离的空白知识库创建、列表、详情、编辑和删除接口；删除会阻止仍被工作流草稿或版本引用的
  知识库。文档、索引代际、向量和异步任务尚未实现。
- 首次实现时补齐明确的依赖、配置、环境变量和 workspace 脚本，不在无关任务中顺手搭建后端。
- 遵守根目录命令约束，不自动运行 `dev`、`build` 或任何 git 命令。

## 维护本技能

- 服务端首次初始化后，立即用真实目录、模块、命令和依赖替换引用文件中的暂定内容。
- 数据模型、接口约定、鉴权方式或运行时边界变化时，更新对应引用文件。
- 技能适用范围变化时，同步更新顶部 `description` 与 `agents/openai.yaml`。
