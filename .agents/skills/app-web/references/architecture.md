# 前端架构与代码归属

## 当前基线

- 应用目录：`apps/web`
- 应用入口：`src/main.tsx`
- 路由入口：`src/router/index.tsx`
- 全局样式入口：`src/index.css`
- 技术栈：React 19、TypeScript、Vite 8、Tailwind CSS 4、React Router 7、React Compiler

## 分层规则

| 内容                                   | 放置位置                     | 说明                                                      |
| -------------------------------------- | ---------------------------- | --------------------------------------------------------- |
| 路由页面骨架、路由参数和页面级状态编排 | `src/pages`                  | 页面保持轻量，不沉积可复用业务界面                        |
| 单一业务域能力                         | `src/features/<feature>`     | 放组件、类型、数据和 Hook，通过根 `index.ts` 暴露公共入口 |
| 跨业务 Web 组件                        | `src/components`             | 可以依赖路由或应用上下文                                  |
| 无业务语义的通用组件                   | `packages/ui`                | 不得反向依赖 `apps/web`                                   |
| 工作流领域模型                         | `packages/workflow-core`     | 不放 React 代码                                           |
| 工作流节点通用界面                     | `packages/workflow-nodes-ui` | 通过 Core 契约接入                                        |

## 依赖边界

- 页面通过业务功能根 `index.ts` 使用业务能力。
- 页面和其他业务功能不得跨层引用 `features/<name>/components/*` 等内部文件。
- 业务功能可以使用 `src/components` 和 workspace package；package 不得依赖 Web。
- 只有两个以上业务域真实复用时，才把组件提升到 `src/components`。
- 只有无业务语义且可跨应用复用时，才把能力下沉到 package。
- 工作流节点表单依赖的知识库、工作流列表等动态业务数据，在
  `features/workflow/node-form-resolvers` 中按节点类型转换为完整字段配置；通用
  `NodeConfigFields` 不增加控件或业务数据专属参数。

## 新增业务功能

1. 创建 `src/features/<feature-name>/`。
2. 按实际需要创建 `components`、`hooks`、`types.ts`、`schema.ts` 或 `data.ts`，不要预建空目录。
   业务表单的 Zod schema、`z.input` 编辑态类型、`z.output` 提交类型和初始值统一放在
   feature 根目录的 `schema.ts`；跨 feature 使用的提交类型通过该 feature 的 `index.ts`
   导出，不在 `types.ts` 重复声明 interface。
3. 在根 `index.ts` 中只导出外部需要使用的入口。
4. 让页面负责路由和页面级组合，让业务功能负责业务交互与展示。
5. 模拟数据、领域类型和组件职责变复杂后及时拆分，不长期堆在同一文件。

## 导入约定

- Web 内跨目录导入优先使用 `@/` 别名。
- 同一小目录内可以使用相对导入。
- Package 只从 `package.json#exports` 暴露的路径导入，不引用 `packages/*/src` 物理路径。
