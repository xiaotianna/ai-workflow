# `@ai-workflow/ui`

## 职责

提供无业务语义、可跨应用复用的 React 组件、样式 token、全局 CSS、工具和通用 UI Hooks。

## 公开用法

`package.json#exports` 使用通配子路径，不提供根聚合入口：

```ts
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { useIsMobile } from '@ai-workflow/ui/hooks/use-mobile'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import '@ai-workflow/ui/globals.css'
```

## 现有能力

- 基础输入：`Input`、`Textarea`、`Select`、`Slider`、`Checkbox`、`Switch`。
- 数据展示：`Table`、`Badge`。
- 表单布局：`Form`、`Form.Field`。
- 上传：单文件受控 `FileDropzone`。
- 操作与浮层：`Button`、`Dialog`、`Sheet`、`DropdownMenu`、`Tooltip`。
- 布局与反馈：`Sidebar`、`Separator`、`Skeleton`、基于 Sonner 的 `Toaster` 与
  `showToast`。
- Hook：`useIsMobile`。
- 业务界面共享 token：`--workflow-edge` 用于工作流画布普通连线。
- 状态 token：`--success`、`--warning`、`--info` 分别用于成功、警告、信息通知和
  对应状态，错误状态继续使用 `--destructive`。

## 使用规范

- 修改组件视觉前读取 `docs/design-system.md`，token 实际值以 `src/styles/globals.css` 为准。
- 可点击且有 Hover 反馈的组件使用 `cursor-pointer`；拖拽、缩放和禁用态使用对应的专用光标，文本编辑控件除外。
- 禁止重新引入 `ring-*` 交互样式；Button 等可点击组件通过内部背景或文字变化表达聚焦，不增加聚焦边框或阴影，输入型组件使用语义边框。
- 表单使用 `Form` 与 `Form.Field`；实际控件提供 `aria-label`。
- 提交型按钮使用 `confirm` 且在不可提交时设置 `disabled`；取消和返回使用 `secondary`。
- 单文件选择使用 `FileDropzone`，业务校验保留在调用方。
- `SelectContent` 与 `DropdownMenuContent` 统一使用半透明背景、0.5px 语义边框、`shadow-lg`、圆角和背景模糊，不在调用方分别覆盖阴影。
- 应用根节点挂载一次 `Toaster`，业务侧通过 `@ai-workflow/ui/lib/toast` 的
  `showToast(type, message, duration?)` 展示通知；`type` 支持 `success`、`error`、
  `warning`、`info`，可选 `duration` 使用毫秒。不要在业务组件中直接依赖 Sonner
  或重复实现通知容器。
- 使用 `cn()` 合并类名，变体较多时使用 CVA，不在调用方重做基础状态。

## 新增组件

1. 确认组件无业务语义，且不能由现有 primitive 组合完成。
2. 覆盖默认、Hover、Focus visible、Active、Invalid 和 Disabled 中适用的状态。
3. 可点击且有 Hover 反馈时提供 `cursor-pointer`，专用交互与禁用态提供准确光标。
4. 保留原生或 Radix props、ref、受控状态和键盘语义。
5. 检查 `./components/*`、`./hooks/*` 或 `./lib/*` exports 能否覆盖新文件。
6. shadcn 生成结果必须按项目规范移除默认 ring，以及可点击组件的聚焦外圈边框和阴影，并保留现有定制契约。

## 注意事项

- UI 包不得依赖 Web 路由、业务 Feature、Core 节点或服务端代码。
- `useSidebar` 只能在 `SidebarProvider` 内使用。
- `useIsMobile` 首次渲染可能返回 `undefined`，调用方不要错误地把它等同于桌面端。
- 新增、删除或修改公共组件、variant、Hook 和 token 时更新本文件。
