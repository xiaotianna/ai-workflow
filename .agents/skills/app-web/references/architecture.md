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
| 后端接口请求与响应契约                 | `src/api/<feature>`          | 按功能分目录，统一使用 Axios，不放入 `features`           |
| 单一业务域能力                         | `src/features/<feature>`     | 放组件、类型、数据和 Hook，通过根 `index.ts` 暴露公共入口 |
| 跨业务 Web 组件                        | `src/components`             | 可以依赖路由或应用上下文                                  |
| 无业务语义的通用组件                   | `packages/ui`                | 不得反向依赖 `apps/web`                                   |
| 工作流领域模型                         | `packages/workflow-core`     | 不放 React 代码                                           |
| 工作流节点通用界面                     | `packages/workflow-nodes-ui` | 通过 Core 契约接入                                        |

## 依赖边界

- 页面通过业务功能根 `index.ts` 使用业务能力。
- 所有后端接口调用统一放在 `src/api`，按 `auth`、`studio` 等功能划分子目录；页面或业务功能
  从对应 API 功能目录导入，不在 `features`、`pages` 或组件文件中直接声明 Axios 请求。
- `src/api/client.ts` 是 Web 请求的统一 Axios 入口：请求拦截器注入登录 Token，响应拦截器
  解包统一响应的 `data`，并按真实 HTTP 状态处理错误 Toast；携带认证信息的请求收到
  `401` 或 `403` 时清理本地会话并跳转登录页。业务 API 不自行创建 Axios 实例、不判断
  响应体 `code`，也不重复展示请求错误。
- 页面和其他业务功能不得跨层引用 `features/<name>/components/*` 等内部文件。
- 业务功能可以使用 `src/components` 和 workspace package；package 不得依赖 Web。
- 只有两个以上业务域真实复用时，才把组件提升到 `src/components`。
- 只有无业务语义且可跨应用复用时，才把能力下沉到 package。
- 工作流节点表单依赖的知识库、工作流列表等动态业务数据，在
  `features/workflow/node-form-resolvers` 中按节点类型转换为完整字段配置；通用
  `NodeConfigFields` 只透传字段通用上下文，不请求业务数据。
- 平台可复用的复杂配置优先建模为字段 UI 类型，并由 `NodeConfigFields` 与字段 renderer
  registry 分发；依赖 Web API 的字段 renderer 留在
  `features/workflow/node-config-renderers`，通过 `NodeConfigFields.renderers` 注入。LLM 模型字段
  使用该路径，上下文字段由 Form 内置实现。无法按顶层配置字段拆分且需要 API 数据的完整节点
  配置界面继续通过同目录的整节点 registry 与 `NodeConfigSection.renderers` 注入；Core 只保存
  renderer 名称和领域 schema，Form 不依赖 Web API。
- 模型供应商的节点参数能力放在 `features/models/model-parameter-strategies.ts` 注册；工作流
  renderer 和参数 Dialog 只消费策略输出，不复制供应商条件分支。
- 节点变量区先通过 Core `resolveNodeVariableForm` 解析 `NodeType.variableForm`；整个配置
  未声明时默认拥有输入、输出区，配置对象存在时只渲染其中实际声明的方向，不使用 `null`
  占位。通用编辑组件由 `@ai-workflow/form` 提供；Web 只计算上游变量候选、管理表单状态并
  写回节点，不按节点类型维护变量区配置表或重复默认规则。

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
