# `@ai-workflow/ui`

## 职责

提供无业务语义、可跨应用复用的 React 组件、样式 token、全局 CSS、工具和通用 UI Hooks。

## 公开用法

`package.json#exports` 使用通配子路径，不提供根聚合入口：

```ts
import { Button } from '@ai-workflow/ui/components/button'
import { CodeEditor } from '@ai-workflow/ui/components/code-editor'
import { Form } from '@ai-workflow/ui/components/form'
import { TiptapEditor } from '@ai-workflow/ui/components/tiptap-editor'
import { VariableIcon } from '@ai-workflow/ui/components/variable-icon'
import { useIsMobile } from '@ai-workflow/ui/hooks/use-mobile'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import '@ai-workflow/ui/globals.css'
```

## 现有能力

- 基础输入：`Input`、`Textarea`、`CodeEditor`、`Select`、`Slider`、`Checkbox`、`Switch`。
- `CodeEditor` 是基于 Monaco Editor 的无外壳编辑器核心，通过必填 `language` props 支持
  Monaco 语言，内置 JavaScript/TypeScript、CSS、HTML、JSON 与通用 Editor Worker；
  提供 12px 代码字号、随行号位数自适应并额外预留一个字符左侧留白的行号区、透明主题、
  明暗主题自动适配、加载态和禁用态。语言顶栏、边框、尺寸、放大入口、Dialog 与草稿提交等
  场景 UI 由使用方组合，不下沉到 UI 包。
- `TiptapEditor` 是基于 Tiptap 的无业务外壳受控文本编辑核心，使用纯字符串 `value` / `onChange`
  契约并支持换行、占位、禁用、错误语义和键盘编辑。调用方可以通过 `tokens` 声明可序列化的
  内联 token，并使用公开 ref 的 `insertToken` 在当前光标插入；编辑器将 token 显示为紧凑标签，
  回写时仍输出 token 的原始字符串值，不把 HTML 或 Tiptap JSON 泄漏到业务配置。角色、工具栏、
  变量选择器、外层边框和业务校验由使用方组合。
- 数据展示：`Table`、`Badge`、`Pagination`。
- 图标：`VariableIcon` 使用内置 `system-icon.svg` 作为 CSS Mask，通过 `currentColor`
  继承调用处的语义文字色；需要主题主色时传入 `text-primary`，不要用 `<img>` 固定 SVG
  原始颜色。
- `Table` 采用无边框容器，仅保留行间细分隔线；表头与行高均为 `h-9`（36px），表头使用 `text-xs/8 font-normal`、`text-muted-foreground` 与 `whitespace-nowrap`，单元格使用 `text-[13px] leading-4` 与 `px-3` 间距；行 Hover 与选中态默认在 `TableRow` 上使用 `bg-input`。容器默认 `overflow-x-auto`；需要 sticky 列或由外层统一滚动时，传 `containerClassName="overflow-visible"`，滚动交给外层单一容器，表格本体加 `border-separate border-spacing-0`。
- 含 sticky 列的表格：sticky 单元格需默认实底（通常 `bg-background`）以遮挡横向滚动内容；行 hover、选中、行内 Dropdown 打开等态应在**单元格**上用命名 group（如 `group/row`）与其他列同步，不要仅依赖 `<tr>` 背景，也不要让 sticky 列单独维护一套 hover 规则。
- 表单布局：`Form`、`Form.Field`。
- 上传：单文件受控 `FileDropzone`。
- 操作与浮层：`Button`、`Dialog`、`Sheet`、`Popover`、`DropdownMenu`、`Tooltip`。
- 导航与切换：`Tabs`、`TabsList`、`TabsTrigger`、`TabsContent` 基于 Radix Tabs，支持受控、
  非受控状态和标准方向键键盘交互；列表保持透明、支持换行，触发器统一为 32px 高的轻量
  标签，选中、Hover 与 Focus 只使用语义背景和文字色变化，不使用 ring 或额外阴影。
- 布局与反馈：`Sidebar`、`Separator`、`Skeleton`、基于 Sonner 的 `Toaster` 与
  `showToast`。
- `Toaster` 使用无边框状态渐变背景与 20px 描边状态图标；图标直接使用对应的
  `text-success`、`text-destructive`、`text-warning`、`text-info` 语义色，不叠加实心圆底。
- Hook：`useIsMobile`。
- 业务界面共享 token：`--workflow-edge` 用于工作流画布普通连线。
- 状态 token：`--success`、`--warning`、`--info` 分别用于成功、警告、信息通知和
  对应状态，错误状态继续使用 `--destructive`。

## 使用规范

- 修改组件视觉前读取 `docs/design-system.md`，token 实际值以 `src/styles/globals.css` 为准。
- 可点击且有 Hover 反馈的组件使用 `cursor-pointer`；拖拽、缩放和禁用态使用对应的专用光标，文本编辑控件除外。
- 禁止重新引入 `ring-*` 交互样式；Button 等可点击组件通过内部背景或文字变化表达聚焦，不增加聚焦边框或阴影，输入型组件使用语义边框。
- 表单使用 `Form` 与 `Form.Field`；实际控件提供 `aria-label`。字段标题右侧需要操作入口时，
  通过 `Form.Field` 的 `actions` 插槽传入，不在业务组件中重复实现标题行布局。
- `DialogContent` 默认阻止 Radix 打开时的自动聚焦；Dialog 内的表单不得使用 `autoFocus`
  或代码调用 `focus()`，调用方无需重复传入只执行 `event.preventDefault()` 的
  `onOpenAutoFocus`。
- 代码输入使用 `CodeEditor`，通过 `language` 指定 Monaco 语言，通过 `value`、`onChange`
  管理受控值；需要调整 Monaco 行为时传 `options`，不要在业务包重复初始化 Worker 或
  Loader，也不要把业务顶栏、弹窗或提交语义加入编辑器核心。Monaco Worker 从
  `monaco-editor/editor/*` 和
  `monaco-editor/language/*` 公开子路径导入，不使用会绕过 0.56 `exports` 映射的
  `monaco-editor/esm/vs/*` 深路径。
- 需要无格式工具栏的富文本内核或内联业务 token 时使用 `TiptapEditor`；业务层只把稳定、可解析
  的字符串作为 token `value`，展示文案放在 `label`，不得保存业务组件、DOM、HTML 或编辑器实例。
- 提交型按钮使用 `confirm` 且在不可提交时设置 `disabled`；取消和返回使用 `secondary`。
- 单文件选择使用 `FileDropzone`，业务校验保留在调用方。
- `SelectContent` 与 `DropdownMenuContent` 统一使用半透明背景、0.5px 语义边框、`shadow-lg`、圆角和背景模糊，不在调用方分别覆盖阴影。
- `PopoverContent` 使用与 Select、Dropdown 一致的半透明背景、0.5px 语义边框、
  `shadow-lg` 和背景模糊；业务组合组件负责内容尺寸、滚动区域与对齐方式，不在 UI
  primitive 中写入搜索、选择或表单语义。
- 标准 `SelectContent` 使用 `position="popper"`、`align="start"`、`sideOffset={4}` 并通过
  `w-(--radix-select-trigger-width)` 匹配 Trigger 宽度，避免 `item-aligned` 将选中项覆盖在
  Trigger 上。
- 应用根节点挂载一次 `Toaster`，业务侧通过 `@ai-workflow/ui/lib/toast` 的
  `showToast(type, message, duration?)` 展示通知；`type` 支持 `success`、`error`、
  `warning`、`info`，可选 `duration` 使用毫秒。不要在业务组件中直接依赖 Sonner
  或重复实现通知容器。
- 使用 `cn()` 合并类名，变体较多时使用 CVA，不在调用方重做基础状态。
- 同级内容分类使用 `Tabs` 组合；业务层只传入受控值、标签与内容，不复制触发器的选中、
  Hover、Focus、Disabled 样式，也不使用普通按钮组替代 Tabs 键盘语义。
- 表格或列表底部分页使用 `Pagination`；传入 `pageSizeOptions` 与 `onPageSizeChange` 时显示每页条数切换，否则只保留页码导航。分页器独立于表格容器，不带顶部分隔线。

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
