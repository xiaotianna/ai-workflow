# `@ai-workflow/ui`

## 职责

提供无业务语义、可跨应用复用的 React 组件、样式 token、全局 CSS、工具和通用 UI Hooks。

## 公开用法

`package.json#exports` 使用通配子路径，不提供根聚合入口：

```ts
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { useIsMobile } from '@ai-workflow/ui/hooks/use-mobile'
import { cn } from '@ai-workflow/ui/lib/utils'
import '@ai-workflow/ui/globals.css'
```

## 现有能力

- 基础输入：`Input`、`Textarea`、`Select`、`Slider`。
- 表单布局：`Form`、`Form.Field`。
- 上传：单文件受控 `FileDropzone`。
- 操作与浮层：`Button`、`Dialog`、`Sheet`、`DropdownMenu`、`Tooltip`。
- 布局与反馈：`Sidebar`、`Separator`、`Skeleton`。
- Hook：`useIsMobile`。

## 使用规范

- 修改组件视觉前读取 `docs/design-system.md`，token 实际值以 `src/styles/globals.css` 为准。
- 禁止重新引入 `ring-*` 交互样式；使用语义边框、背景和阴影表达聚焦。
- 表单使用 `Form` 与 `Form.Field`；实际控件提供 `aria-label`。
- 提交型按钮使用 `confirm` 且在不可提交时设置 `disabled`；取消和返回使用 `secondary`。
- 单文件选择使用 `FileDropzone`，业务校验保留在调用方。
- 使用 `cn()` 合并类名，变体较多时使用 CVA，不在调用方重做基础状态。

## 新增组件

1. 确认组件无业务语义，且不能由现有 primitive 组合完成。
2. 覆盖默认、Hover、Focus visible、Active、Invalid 和 Disabled 中适用的状态。
3. 保留原生或 Radix props、ref、受控状态和键盘语义。
4. 检查 `./components/*`、`./hooks/*` 或 `./lib/*` exports 能否覆盖新文件。
5. shadcn 生成结果必须按项目规范移除默认 ring，并保留现有定制契约。

## 注意事项

- UI 包不得依赖 Web 路由、业务 Feature、Core 节点或服务端代码。
- `useSidebar` 只能在 `SidebarProvider` 内使用。
- `useIsMobile` 首次渲染可能返回 `undefined`，调用方不要错误地把它等同于桌面端。
- 新增、删除或修改公共组件、variant、Hook 和 token 时更新本文件。
