# 设计与组件使用规范

## 规范来源

修改任何前端界面或 shadcn 组件前，必须读取仓库 `docs/design-system.md`。该文件是视觉、语义 token 和交互状态的详细规范；本文件记录前端应用中的使用方式。

## 组件归属

- 优先使用 `@ai-workflow/ui/components/*` 已有组件。
- 只服务一个业务域的组件放在对应 `features/<feature>/components`。
- 跨业务但仍依赖路由或应用上下文的组件放在 `apps/web/src/components`。
- 无业务语义且可跨应用复用的组件放在 `packages/ui`，同时读取 `$ai-workflow-packages` 的 UI 引用。

## 表单

- 使用 `@ai-workflow/ui/components/form` 提供的 `Form` 与 `Form.Field`。
- 使用 `<Form.Field required label="名称">` 标记必填；未传 `required` 时自动显示 `（可选）`。
- 值、校验、提交和业务错误由调用方管理，通过 `Form.Field error` 展示字段错误。
- 字段标题不会代理点击，实际输入控件必须提供准确的 `aria-label`。
- 登录、创建、保存、确认使用 `Button variant="confirm"`；不可提交时传入 `disabled`。
- 取消、返回使用 `Button variant="secondary"`，不要在页面重复拼接按钮状态样式。

## 文件选择

- 单文件点击与拖拽上传使用 `@ai-workflow/ui/components/file-dropzone`。
- 通过 `accept` 限制候选类型，通过 `file` 和 `onFileChange` 管理受控状态。
- 扩展名、大小和文件内容校验属于业务功能，不放入基础组件。
- 错误通过 `Form.Field error` 展示；禁用态必须同时阻止点击、键盘和拖放。

## 视觉与交互

- 禁止使用 `ring-*`、`focus:ring-*`、`focus-visible:ring-*` 表达默认、聚焦、错误或浮层轮廓。
- 使用语义边框、背景和轻阴影表达聚焦，且不得造成尺寸变化或布局抖动。
- 颜色使用 `packages/ui/src/styles/globals.css` 的语义 token，不在业务组件中硬编码通用状态色。
- 输入控件覆盖默认、Hover、Focus visible、Invalid 和 Disabled 状态。
- 浮层使用真实 border 与 shadow；结构展开和折叠需要动画时使用项目约定的 Motion 方案。

## 无障碍

- 优先使用原生语义元素和 Radix 行为，不用 `div` 模拟按钮。
- 图标按钮提供 `aria-label`，装饰图标使用 `aria-hidden`。
- 可点击、上传和弹出控件必须支持适用的 Tab、Enter、Space 与 Escape 路径。
- 异步加载提供状态语义；当前路由懒加载使用 `LazyLoad` 和 `role="status"`。
- 受控 Dialog 的关闭、取消和提交成功路径应共享一致的临时状态重置逻辑。
