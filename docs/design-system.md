# 界面设计规范

本文档约束项目内的通用界面视觉，尤其适用于 `packages/ui` 与 `apps/web/src/components/ui` 中的 shadcn 组件。新增组件、更新 shadcn 组件或编写页面覆盖样式时，均应遵守本规范。

## 基础原则

- 视觉保持轻量、克制，优先使用浅色背景、细边框和低对比阴影表达层级。
- 禁止使用 Tailwind `ring-*`、`focus:ring-*`、`focus-visible:ring-*` 作为默认态、聚焦态、校验态或浮层轮廓。
- 键盘聚焦必须仍然清晰可辨；按钮等可点击控件使用控件内部的背景或文字变化，输入型控件使用已有 1px 边框，不使用向外扩张的阴影或聚焦外圈。
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

工作流节点名称、描述等需要与静态文字视觉一致的内联编辑是输入状态语言的局部例外：仍使用
原生 `Input` 和准确的 `aria-label`，但同时移除边框、背景、圆角、阴影、内外边距以及
Hover / Focus 容器反馈，只保留文本光标表示可编辑。该例外不得用于常规表单字段。

## 代码编辑器

- UI 包的 `CodeEditor` 只提供 Monaco 编辑器核心，语言通过 props 指定，内层背景保持透明；
  顶栏、边框、固定尺寸、操作入口和 Dialog 由具体使用场景组合。
- 节点配置的代码字段使用 `bg-input` 作为顶栏、行号区和代码区的统一背景；Hover 与
  Focus visible 只切换到 `border-input-focus`，不把编辑区背景切成白色。
- 代码字段顶栏展示当前语言，不提供语言下拉、AI 生成或复制操作；右侧只保留弹窗编辑
  按钮。按钮使用 Ghost 样式，默认背景透明；Hover 与 Focus visible 使用
  `bg-button-secondary-bg-active`，确保在 `bg-input` 顶栏上仍有清晰反馈；点击后打开大尺寸
  Dialog 编辑代码，并提供准确的无障碍名称。
- Dialog 内使用临时草稿，点击“确定”才回写代码字段；取消、关闭或按 Esc 均丢弃本次
  修改。Dialog 继续复用同一套 Monaco 配置，不在弹窗内展示第二个放大入口。
- Monaco 代码与行号统一使用 `12px` 字号；行号区按当前最大行号位数自适应宽度，并始终
  额外预留一个字符的左侧留白。关闭 glyph margin、代码折叠、MiniMap、Overview Ruler 和
  Sticky Scroll；滚动条使用紧凑尺寸，避免在节点配置面板内占用过多空间。

## 按钮与可点击控件

- 可点击且提供 Hover 反馈的控件必须使用 `cursor-pointer`；拖拽、缩放等专用交互使用对应的 `cursor-grab`、`cursor-*-resize`，禁用态使用 `cursor-not-allowed`。Input、Textarea 等文本编辑控件不适用此规则。
- Button 始终保留边框宽度，以避免聚焦或状态切换时出现尺寸变化。
- Button 的 `focus-visible` 使用背景或文字变化，不增加聚焦边框和阴影。
- Ghost、侧栏菜单等无边框控件以背景色变化呈现聚焦：`focus-visible:bg-accent` 或对应区域的 accent token。
- Destructive 控件使用 destructive 边框表达校验，聚焦时只调整内部背景，不叠加外圈光晕。
- Slider Thumb 使用 `shadow-md` 表达 Hover，Focus 只调整已有边框，不增加阴影。
- 登录、创建、保存、确认等提交型按钮统一使用 `Button` 的 `confirm` variant；普通主操作使用视觉相同的 `default` variant。表单未达到可提交状态时必须设置 `disabled`，不得仅依赖点击后提示。
- 取消、返回等次级操作使用 `secondary` variant，采用 0.5px 语义边框、半透明背景、`shadow-xs` 与 `backdrop-blur-[5px]`，不得由页面使用 `outline` 临时拼接。
- 紧凑型表单按钮使用 `size="sm"`，统一为 `h-8 rounded-lg px-3.5 text-[13px] leading-4 font-medium`。

### 主操作按钮状态

| 状态          | 背景                         | 边框/阴影                          | 文字                      |
| ------------- | ---------------------------- | ---------------------------------- | ------------------------- |
| Default       | `bg-primary`                 | 透明边框、`shadow-xs`              | `text-primary-foreground` |
| Hover         | `bg-primary/85`              | 保持边框与阴影                     | 保持原色                  |
| Focus visible | `bg-primary/85`              | 保持透明边框与默认阴影，不增加外圈 | 保持原色                  |
| Active        | `bg-primary/70`              | `shadow-none` 并下移 1px           | 保持原色                  |
| Disabled      | `bg-button-primary-disabled` | 透明边框、无阴影                   | 保持白色且 `opacity-100`  |

亮色主题的 `--button-primary-disabled` 固定承载登录页使用的 `#dce3ff`，页面不得再次硬编码该颜色。

### 次级按钮状态

| 状态          | 背景                              | 边框                                      | 阴影/文字                  |
| ------------- | --------------------------------- | ----------------------------------------- | -------------------------- |
| Default       | `bg-button-secondary-bg`          | `border-button-secondary-border`，0.5px   | `shadow-xs`、正文色        |
| Hover         | `bg-button-secondary-bg-hover`    | `border-button-secondary-border-hover`    | 保持正文色                 |
| Focus visible | `bg-button-secondary-bg-hover`    | 保持默认边框                              | 保持默认阴影               |
| Active        | `bg-button-secondary-bg-active`   | Hover 边框                                | 无阴影并下移 1px           |
| Disabled      | `bg-button-secondary-bg-disabled` | `border-button-secondary-border-disabled` | 禁用文字、无阴影、不可点击 |

## 表单布局

- 通用表单布局使用 `packages/ui/src/components/form.tsx` 中的复合组件 `Form` 与 `Form.Field`。
- `Form` 是原生 `form` 容器，只统一字段间距，不接管值、校验与提交状态。
- `Form.Field` 使用非点击激活的分组标题统一标签、控件区域、说明和错误信息。实际 Input、Textarea、Select 或业务组件由外部作为 children 传入，字段容器不得克隆或修改这些控件。
- 字段标题右侧需要按钮等操作时，通过 `Form.Field` 的 `actions` 插槽传入，由组件统一标题行布局，不在使用方额外添加标题容器样式。
- 必填字段必须显式传入 `required`；未传入或传入 `false` 时，标签文字后自动添加 `（可选）`。
- 因字段标题不会代理控件点击，外部控件必须提供准确的 `aria-label`，保证无障碍名称完整。
- 表单校验由使用方负责。提交型按钮的 `disabled` 状态必须与当前表单是否可提交保持一致。

```tsx
<Form onSubmit={handleSubmit}>
  <Form.Field required label="应用名称">
    <Input aria-label="应用名称" />
  </Form.Field>
  <Form.Field label="描述">
    <Textarea aria-label="描述（可选）" />
  </Form.Field>
  <Form.Field label="成员" actions={<Button type="button">添加</Button>}>
    <MemberList />
  </Form.Field>
  <Button type="submit" variant="confirm" disabled={!isValid}>
    创建
  </Button>
</Form>
```

## Tabs

- 通用分类切换使用 `@ai-workflow/ui/components/tabs`，保留 Radix Tabs 的 Tab、方向键与
  TabPanel 语义，不用普通按钮组或 Radio DOM 复制同类交互。
- `TabsList` 保持透明、无外框并允许换行，标签间距使用 `gap-1`；`TabsTrigger` 统一为
  `h-8 min-w-12 rounded-lg px-2.5 text-[13px]`。
- 默认文字使用 `text-muted-foreground`；Hover 与 Focus visible 使用 `bg-muted/70` 和正文
  文字色；选中态使用 `bg-muted`、正文文字色和半粗字重，不增加边框、ring 或阴影。
- Disabled 状态使用禁用光标和透明度反馈；状态变化只过渡背景色与文字色，并遵循系统减少
  动态效果设置。

## 文件选择与拖拽

- 单文件拖拽或点击选择统一使用 `packages/ui/src/components/file-dropzone.tsx` 中的 `FileDropzone`。组件基于原生 `input[type="file"]`，业务侧通过 `accept` 限制文件类型，并通过 `file`、`onFileChange` 管理受控状态。
- 默认态使用浅色背景、圆角虚线边框和上传图标；整个内容区域必须可点击，也必须支持键盘聚焦后按 Enter 或 Space 打开文件选择器。
- Hover 与 Focus visible 使用 `border-input-focus` 和浅色背景，不增加聚焦阴影；拖拽悬停使用 `border-primary bg-primary/5`；错误态使用 `border-destructive bg-destructive/5`，均不得使用 ring。
- 选中文件后显示文件名、文件大小与重新选择提示。具体扩展名、大小及业务内容校验由 Feature 负责，错误信息通过 `Form.Field` 的 `error` 属性呈现。
- 禁用态必须阻止点击和拖放，显示禁用光标与透明度反馈。

## 浮层与容器

- Select 与 Dropdown 菜单统一使用 `bg-popover/95 rounded-xl border-[0.5px] border-border shadow-lg backdrop-blur-[5px]`，业务页面不得分别覆盖浮层阴影。
- 标准 Select 菜单使用 `position="popper"`、`align="start"` 和 `sideOffset={4}` 从 Trigger
  下方展开，宽度跟随 `--radix-select-trigger-width`；不得使用 `item-aligned` 让已选项覆盖
  Trigger，只有明确需要原生菜单式选项对齐的特殊场景可以例外。
- Popover、Dialog 等浮层使用真实语义边框与低对比阴影表达轮廓。
- Sidebar floating 变体采用 `border-sidebar-border shadow-sm`。
- 禁止用 `ring-1` 模拟静态边框；需要轮廓时应使用真实 border。

## 工作流节点

- 节点卡片、节点选择器和 MiniMap 使用 `@ai-workflow/nodes-ui` 的
  `NODE_THEMES` 作为唯一节点标识色来源，并通过 `getNodeThemeColor(type)` 获取未知
  类型的默认回退色。
- 节点输入、输出 Handle 保持使用 `--primary`，不跟随节点标识色变化。
- 节点没有可见 Body 内容时只显示 Header，不保留 Body 的水平或底部间距；默认描述为空时
  不渲染空 Body 容器，专属节点可以保留有明确文案的空状态。

## 语义 Token

| Token                                            | 用途                         |
| ------------------------------------------------ | ---------------------------- |
| `--input` / `bg-input`                           | 输入控件失焦背景             |
| `--input-focus` / `border-input-focus`           | 输入控件与通用控件的聚焦边框 |
| `--input-placeholder` / `text-input-placeholder` | 输入提示文字                 |
| `--workflow-edge` / `text-workflow-edge`         | 工作流画布普通连线           |
| `--background` / `bg-background`                 | 输入控件聚焦背景             |
| `--border` / `border-border`                     | 容器、浮层的静态细边框       |
| `--info` / `bg-info`                             | 信息状态与信息通知           |
| `--warning` / `bg-warning`                       | 警告状态与警告通知           |
| `--success` / `bg-success`                       | 成功状态与成功通知           |
| `--destructive` / `border-destructive`           | 错误与危险状态               |
| `--button-primary-disabled`                      | 主操作按钮禁用背景           |
| `--button-secondary-*`                           | 次级按钮各交互状态           |

`--ring` 仅作为第三方兼容 token 保留，不应在项目组件样式中使用。若 shadcn 更新重新引入 ring 类，合并前必须按本规范替换。

## 组件检查清单

- 默认、Hover、Focus visible、Invalid、Disabled 状态是否齐全。
- 可点击且有 Hover 反馈的控件是否使用 `cursor-pointer`，专用交互与禁用态是否使用正确光标。
- 鼠标与键盘操作下是否都能辨识当前状态。
- 是否不存在 `ring-*`、`focus:ring-*`、`focus-visible:ring-*`。
- Button、Slider、FileDropzone 等可点击控件是否不存在 `focus-visible` 外圈阴影或额外聚焦边框。
- 聚焦时是否没有尺寸变化和布局抖动。
- 是否复用语义 token，而非硬编码颜色。
- 是否同时检查亮色与暗色主题。
- 提交型按钮是否在表单无效时禁用，并使用 `confirm` variant。
- 取消、返回等操作是否使用 `secondary` variant，状态样式是否未在页面重复覆盖。
- 非必填的 `Form.Field` 是否自动显示 `（可选）`，外部控件是否提供无障碍名称。
- 文件上传是否同时支持点击、键盘和拖拽，拖拽与错误状态是否清晰可辨。
