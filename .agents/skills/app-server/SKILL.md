---
name: app-server
description: '规划和维护 AI Workflow 的服务端应用。设计或修改 apps/server、接口、模块边界、DTO、鉴权、PostgreSQL、Prisma、Redis、工作流持久化与运行时接入时使用；当前服务端尚未初始化。'
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
- `apps/server` 已初始化为 `@ai-workflow/server`（NestJS 11 + oxlint）；Prisma、PostgreSQL、Redis、LangGraph 仍是目标方向，尚未接入。
- 首次实现时补齐明确的依赖、配置、环境变量和 workspace 脚本，不在无关任务中顺手搭建后端。
- 遵守根目录命令约束，不自动运行 `dev`、`build` 或任何 git 命令。

## 维护本技能

- 服务端首次初始化后，立即用真实目录、模块、命令和依赖替换引用文件中的暂定内容。
- 数据模型、接口约定、鉴权方式或运行时边界变化时，更新对应引用文件。
- 技能适用范围变化时，同步更新顶部 `description` 与 `agents/openai.yaml`。
