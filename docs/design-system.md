# 界面设计规范

本文档约束项目内的通用界面视觉，尤其适用于 `packages/ui` 与 `apps/web/src/components/ui` 中的 shadcn 组件。新增组件、更新 shadcn 组件或编写页面覆盖样式时，均应遵守本规范。

## 基础原则

- 视觉保持轻量、克制，优先使用浅色背景、细边框和低对比阴影表达层级。
- 禁止使用 Tailwind `ring-*`、`focus:ring-*`、`focus-visible:ring-*` 作为默认态、聚焦态、校验态或浮层轮廓。
- 键盘聚焦必须仍然清晰可辨，使用背景、1px 边框和轻阴影组合表达，不得仅移除聚焦反馈。
- 颜色使用 `packages/ui/src/styles/globals.css` 中的语义 token，不在组件内重复硬编码颜色。
- 状态变化需包含过渡，默认过渡背景色、边框色和阴影；复杂展开、折叠等结构变化使用 Motion。

## 表单控件

适用于 Input、Textarea、Select Trigger，以及后续新增的 Combobox、Date Picker、Input Group 等输入型组件。

| 状态          | 背景            | 边框                      | 阴影            | 文字                                                            |
| ------------- | --------------- | ------------------------- | --------------- | --------------------------------------------------------------- |
| 默认/失焦     | `bg-input`      | `border-transparent`      | `shadow-none`   | 正文使用 `text-foreground`，占位符使用 `text-input-placeholder` |
| Hover         | `bg-background` | `border-input-focus`，1px | 无              | 保持原色                                                        |
| Focus visible | `bg-background` | `border-input-focus`，1px | 无              | 保持原色，使用浏览器原生文本光标                                |
| Invalid       | 状态背景        | `border-destructive`，1px | 不使用红色 ring | 错误信息使用 `text-destructive`                                 |
| Disabled      | 保持状态背景    | 保持状态边框              | 无              | `opacity-50`，并使用禁用光标                                    |

标准输入框采用 `h-9 rounded-md px-2.5`。页面可以按密度调整高度和圆角，但不得改变上述状态语言。Hover 与 Focus visible 的视觉必须一致；状态切换使用 `transition-[background-color,border-color]`，避免尺寸或布局跳动。

## 按钮与可点击控件

- Button 默认保留透明边框，以避免聚焦时出现尺寸变化。
- `focus-visible` 使用 `border-input-focus shadow-sm`，不使用 ring。
- Ghost、侧栏菜单等无边框控件以背景色变化呈现聚焦：`focus-visible:bg-accent` 或对应区域的 accent token。
- Destructive 控件使用 destructive 边框表达校验或聚焦，不叠加外圈光晕。
- Slider Thumb 使用边框与 `shadow-md` 表达 Hover/Focus，不扩大 ring。

## 浮层与容器

- Select、Popover、Dropdown、Dialog 等浮层采用 `border border-border shadow-md` 表达轮廓。
- Sidebar floating 变体采用 `border-sidebar-border shadow-sm`。
- 禁止用 `ring-1` 模拟静态边框；需要轮廓时应使用真实 border。

## 语义 Token

| Token                                            | 用途                         |
| ------------------------------------------------ | ---------------------------- |
| `--input` / `bg-input`                           | 输入控件失焦背景             |
| `--input-focus` / `border-input-focus`           | 输入控件与通用控件的聚焦边框 |
| `--input-placeholder` / `text-input-placeholder` | 输入提示文字                 |
| `--background` / `bg-background`                 | 输入控件聚焦背景             |
| `--border` / `border-border`                     | 容器、浮层的静态细边框       |
| `--destructive` / `border-destructive`           | 错误与危险状态               |

`--ring` 仅作为第三方兼容 token 保留，不应在项目组件样式中使用。若 shadcn 更新重新引入 ring 类，合并前必须按本规范替换。

## 组件检查清单

- 默认、Hover、Focus visible、Invalid、Disabled 状态是否齐全。
- 鼠标与键盘操作下是否都能辨识当前状态。
- 是否不存在 `ring-*`、`focus:ring-*`、`focus-visible:ring-*`。
- 聚焦时是否没有尺寸变化和布局抖动。
- 是否复用语义 token，而非硬编码颜色。
- 是否同时检查亮色与暗色主题。
