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
- 实施节点执行类别、分级 Command Queue、Outbox 路由或 Worker 能力校验：读取 [`docs/node-execution-isolation-implementation.md`](../../../docs/node-execution-isolation-implementation.md)。
- 实施知识库文档入库、OpenSearch 混合检索、准确性评测或对外知识库 API：读取
  [`docs/knowledge-base-production-api-design.md`](../../../docs/knowledge-base-production-api-design.md)，并组合读取接口与数据引用。

## 当前结论

- 根 `README.md` 暂定后端技术栈为 NestJS、PostgreSQL、Prisma、Redis 和 LangGraph。
- `apps/server` 已初始化为 `@ai-workflow/server`（NestJS 11 + oxlint）；根目录 `compose.dev.yaml` 已提供 PostgreSQL 与 Redis 开发基础设施。
- Prisma 7 的 schema、migration、Client generator 和 PostgreSQL driver adapter 依赖已配置；NestJS 已通过全局 `PrismaModule`/`PrismaService` 接入数据库，认证与 Studio 模块已使用 Repository 封装数据访问。Redis 已接入认证会话，LangGraph 尚未接入应用。
- 模型管理已通过 `ModelsModule` 接入：按用户持久化对话/嵌入模型组，API Key 使用 AES-256-GCM 加密，并由服务端供应商适配器执行模型列表连通性与单模型流式对话测试。`ExecutorModelModule` 另提供受 NodeRun 租约保护的内部解析接口，只按不可变版本中的稳定模型 ID 向 Go LLM Executor 提供本次运行所需配置。
- 应用 Service API 已通过 `StudioModule` 接入：应用级 `app-` API Key 只保存 SHA-256 哈希和末尾
  展示字符，正式调用直接绑定发布版本并复用 Runtime/MQ/SSE 链路；API 文档可通过独立分享令牌
  开放只读正文，公开读取不经过用户 JWT。
- 知识库已落地管理、设置、Source/Version/Head/Attempt/Projection 事实模型、RabbitMQ + Outbox
  异步入库、Embedding、OpenSearch `BM25 + Dense + RRF` 混合召回、召回测试和工作流 RAG 主链路；
  文档顶层状态只反映当前可服务索引的 `PROCESSING / READY / FAILED`，Web 上传完成页通过文档查询
  接口轮询到终态。设置可引用当前用户模型页中启用的 Embedding 模型组和模型 UUID，被引用模型的
  删除及模型 ID/供应商破坏性修改会被阻止。分段配置变更只标记旧文档待更新，不自动覆盖 Chunk。
  全局 Rerank、生产环境联调和独立 `kb-` Key 的 `/v1/knowledge/*` Service API 仍待完成。
- 插件发布已通过 `PluginModule` 接入：登录用户可以上传 CLI `pack` 生成的 `.tgz`，服务端校验
  TAR、Manifest 和完整性摘要后，以不可变版本写入已有 Plugin/PluginVersion 模型，并把压缩包
  保存到可配置的本地产物目录。Marketplace 列表已接入真实数据、访问范围、搜索、筛选、排序和
  opaque cursor；安装/指定版本切换、启停与卸载已接入真实 `PluginInstallation` 数据和权限授权快照。编辑器 Runtime Catalog
  始终解析当前启用的安装版本，已发布和历史版本的 Server Catalog 仍按精确插件锁解析，并为草稿、测试版本与发布版本维护
  插件制品引用投影。Remote UI 已按工作流 Catalog 动态装载；`sandbox-js` 已通过 Protocol v2 的固定
  `plugin-sandbox-js` 执行适配器进入 Sandbox Profile，内部制品接口按有效 Command 租约、插件版本、
  整体摘要和 Manifest 入口返回 ESM；`host-llm` 插件节点可保留逻辑类型并复用固定 `llm` Executor，
  模型解析接口会核验不可变工作流锁中的 Manifest 声明。Firecracker Controller 代码已落地，生产 Kernel/rootfs、KVM
  节点和网络策略仍需独立部署验收。
- 首次实现时补齐明确的依赖、配置、环境变量和 workspace 脚本，不在无关任务中顺手搭建后端。
- 遵守根目录命令约束，不自动运行 `dev`、`build` 或任何 git 命令。

## 维护本技能

- 服务端首次初始化后，立即用真实目录、模块、命令和依赖替换引用文件中的暂定内容。
- 数据模型、接口约定、鉴权方式或运行时边界变化时，更新对应引用文件。
- 技能适用范围变化时，同步更新顶部 `description` 与 `agents/openai.yaml`。
