---
name: app-web
description: '维护 AI Workflow 的 Web 前端应用。修改 apps/web 下的页面、路由、布局、业务功能、组件、表单交互、前端状态或 Hooks，以及把 workspace packages 接入前端时使用。'
---

# 前端应用开发规范

## 执行流程

1. 先读取仓库根目录的 `AGENTS.md`，再定位改动属于页面、业务功能、Web 公共组件还是 workspace package。
2. 根据任务类型只读取下方必要的引用文件，不要默认一次加载全部内容。
3. 检查相邻实现和依赖包的公开入口，优先复用现有模式。
4. 保持页面、业务功能、Web 公共组件与通用 package 的职责边界。
5. 涉及 `packages/*` 时，同时读取 `$ai-workflow-packages` 中对应子包的引用文件。
6. 如果目录结构、设计规范、组件用法、Hooks 约定或路由方式发生变化，在同一任务中更新本技能。

## 按需读取

- 调整目录、职责、依赖方向或业务功能分层：读取 [references/architecture.md](references/architecture.md)。
- 新增或修改界面、表单、上传和交互组件：读取 [references/design-and-components.md](references/design-and-components.md)，并读取仓库 `docs/design-system.md`。
- 新增 Hook、调整状态归属或副作用：读取 [references/hooks-and-state.md](references/hooks-and-state.md)。
- 修改路由、布局、导航或页面懒加载：读取 [references/routing-and-layout.md](references/routing-and-layout.md)。

## 基础约束

- 沿用 React 19、TypeScript、Vite、Tailwind CSS 4、React Router 7 和 React Compiler。
- 使用 `@/` 引用 `apps/web/src`，使用 `@ai-workflow/*` 的公开导出引用 workspace package。
- 不在页面中复制通用组件能力，不从业务功能外部深层引用其内部文件。
- 不为局部需求提前增加全局状态、通用 Hook 或新抽象；先确认存在真实复用。
- 遵守根目录命令约束，不自动运行 `dev`、`build` 或任何 git 命令。

## 维护本技能

- 代码或正式规范与引用文件不一致时，以当前代码和正式规范为准，并立即修订对应引用。
- 技能适用范围变化时，同步更新顶部 `description` 与 `agents/openai.yaml`。
- 删除失效规则，不在技能中保留历史方案或重复整份源码文档。
