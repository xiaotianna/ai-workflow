---
name: ai-workflow-packages
description: '维护 AI Workflow 仓库的全部 workspace packages。修改或使用 packages/ui、shared、workflow-core、workflow-form、workflow-nodes-ui、workflow-runtime、workflow-protocol、workflow-plugin、workflow-plugin-cli，以及调整包职责、公开 API、导出路径或跨包依赖时使用。'
---

# Workspace Packages 开发规范

## 执行流程

1. 先读取根目录 `AGENTS.md`，确定任务涉及哪些 package。
2. 只读取对应子包的引用文件；跨包改动再组合读取多个文件，不要默认加载全部内容。
3. 检查目标包的 `package.json#exports`、公开入口、真实依赖和所有调用方。
4. 保持依赖方向稳定，不让 package 反向依赖 `apps/*`。
5. 修改公开契约时同步更新全部消费者和对应引用文件。
6. 新增 package 时，在本技能中增加一个独立引用文件并登记其职责、用法和注意事项。

## 子包导航

- 通用组件、样式、表单基础组件和通用 UI Hooks：读取 [references/ui.md](references/ui.md)。
- 跨端共享类型、协议、常量、纯工具，以及统一表单状态与 Zod 校验：读取 [references/shared.md](references/shared.md)。
- 工作流领域模型、节点、端口、schema 和校验：读取 [references/workflow-core.md](references/workflow-core.md)。
- schema 驱动的节点配置表单：同时读取 [references/workflow-form.md](references/workflow-form.md) 和 [references/shared.md](references/shared.md)。
- 工作流节点渲染、UI 注册表和端口展示：读取 [references/workflow-nodes-ui.md](references/workflow-nodes-ui.md)。
- 工作流执行计划、执行器和运行上下文：读取 [references/workflow-runtime.md](references/workflow-runtime.md)。
- TypeScript 与 Go 的节点执行消息、JSON Schema 和边界校验：读取 [references/workflow-protocol.md](references/workflow-protocol.md)。
- 第三方插件声明 DSL、Schema AST、manifest、公共 UI 门面与 Executor 契约：读取 [references/workflow-plugin.md](references/workflow-plugin.md)。
- 第三方插件 package 发现、配置检查、Manifest/Artifact 构建、打包和本地开发服务：同时读取
  [references/workflow-plugin-cli.md](references/workflow-plugin-cli.md) 和
  [references/workflow-plugin.md](references/workflow-plugin.md)。

## 总体边界

- 从包名或 `package.json#exports` 声明的子路径导入，不引用其他包的 `src` 物理路径。
- 每个包在自己的 `package.json` 声明直接运行时依赖，不依赖根目录提升的偶然结果。
- 领域模型放在 Core，React 基础组件放在 UI，节点专属渲染放在 Nodes UI，执行逻辑放在 Runtime。
- Shared 的协议、类型与纯工具保持环境无关；React 表单 Hook 只放在明确的 `hooks` 子路径。
  Form 负责配置表单组合，不承载工作流保存或执行。
- 任何 package 中只要组件持有表单值或执行表单校验，就必须使用 Shared 的
  `useFormData`、`validateFormByZod` 和 Zod schema；无状态 UI primitive 与纯字段 renderer
  只透传值和错误，不重复管理或校验。
- 包内只增加当前任务需要的抽象和目录，不预建空结构。
- 遵守根目录命令约束，不自动运行 `dev`、`build` 或任何 git 命令。

## 维护本技能

- 子包新增、删除、重命名，或职责、公开 API、导出与依赖方向变化时，立即更新对应引用文件。
- 技能适用范围变化时，同步更新顶部 `description` 与 `agents/openai.yaml`。
- 当前代码与引用内容不一致时，以代码为准并在同一任务中修订技能，不保留失效说明。
