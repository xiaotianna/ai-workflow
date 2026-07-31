# `@ai-workflow/nodes-ui`

## 职责

提供工作流节点通用渲染、节点内容契约、UI 注册表、基础节点外壳、图标和端口渲染扩展点。

## 公开用法

```ts
import {
  RenderNode,
  NodeUIRegistry,
  defineNodeUI,
  defineNodeRendererUI,
  createBuiltinNodeUIRegistry,
  BaseNode,
  NodeWrapper,
  NodeHeader,
  NodePortsRender,
  NodeContentList,
  NodeContentItem,
  AddNode,
  AddNodeButton,
  AddNodeIconButton,
  NodeSelectorPanel,
  NodeSelectorPopover,
  LoopNode,
  getNodeThemeColor,
  NODE_THEMES,
} from '@ai-workflow/nodes-ui'
```

包只暴露根入口，不深层引用内部组件。

## 渲染流程

1. `RenderNode` 从 Core `NodeRegistry` 查找节点类型。
2. 未知类型显示可诊断的默认节点，不让整个画布直接崩溃。
3. 将节点实例的 `label` / `description` 覆盖到类型定义的默认展示文案，再使用 Core
   `getNodePorts` 解析静态或动态端口。
4. 从 `NodeUIRegistry` 获取注册项：`content` 复用 `BaseNode`，`renderer` 接管完整节点。
5. 未注册专属 UI 时只在实例有效描述非空时使用默认内容；普通内容由 `BaseNode` 负责外壳、
   选择、删除和端口区域。
6. 画布通过 `renderPort` 注入具体 Handle，不让本包依赖某个画布库。

循环容器通过 `defineNodeRendererUI(loopNode, LoopNode)` 加入
`builtinNodeUIRegistrations`，由 `RenderNode` 自动选择完整节点渲染器。`LoopNode`
自行渲染通用 `AddNode` 选择器；画布层通过 `editorCapabilities` 提供不同容器类型的
候选节点和添加回调，不再判断节点应渲染什么操作或组件。能力按照
`editorCapabilities[parentNodeType]` 组织，例如 `addChildNode` 提供子节点添加能力、
`resizeControl` 注入画布缩放控件；Loop 节点的缩放外壳与 hover 交互留在
`LoopNode` 内，具体 `NodeResizeControl` 仍由 Web 层注入，避免本包依赖画布库。
普通节点与完整节点渲染器统一复用 `NodeWrapper`、`NodeHeader` 和 `NodePortsRender`。
`NodeHeader.label` 接受自定义 React 节点，供配置面板等场景在不复制图标与操作区的前提下
注入名称编辑控件；未传入时展示 definition label。
`BaseNode` 统一组合 Header、实例输入/输出变量、专属内容和端口。实例 `inputs` 或 `outputs`
非空时，通过 `NodeVariables` 和 `NodeContentItem` 自动渲染变量条目；两者都为空时不渲染
变量区域，也不保留 Body 间距。输出变量直接展示 Key、显示名称、必填状态和数据类型；
输入绑定展示绑定 Key、引用变量名或直接值，类型优先使用匹配的输入端口，单输入端口作为
通用回退。普通内容组件显式使用 `NodeContentList` 管理 `px-3 pb-3 space-y-1.5`，为内部
`NodeContentItem` 提供统一的 Body 间距和条目间距。没有实际可见内容时不渲染
`NodeContentList`。专属 content 注册仍可追加自己的数据摘要或明确空状态，不用 Core 字段
数量代替专属 UI 内容判断。
`NodeWrapper` 统一管理外层交互容器和内层卡片样式，并处理选择、禁用和键盘交互；
普通节点使用默认卡片尺寸；容器节点等特殊场景通过 `className` 覆盖内层卡片的尺寸和圆角，
由 `cn` 与卡片默认样式合并，并通过 `wrapperClassName` 让外层跟随画布节点尺寸；
不在通用 Wrapper 中维护节点类型对应的 variant；
`NodeHeader` 通过 `actions` 提供右侧操作插槽，容器节点的添加操作放在 Header 内；
循环节点的内部区域使用与主画布相同间距和颜色的 CSS 点阵背景，不嵌套 React Flow；
`NodePortsRender` 默认纵向排列端口，容器节点可以使用 `layout="centered"` 将端口放在垂直中线。
开始节点和 End 节点分别注册专属内容摘要。工作流入口输入保存为 `node.outputs`，
Start 摘要展示输入变量的 Key、显示名称、必填状态和数据类型；End 的最终输出绑定保存为
`node.inputs`，摘要只展示输出 Key，不泄露直接值或引用详情。两者的条目前导变量标识复用
UI 包基于 `system-icon.svg` 的 `VariableIcon`，并通过 `text-primary` 跟随主题色。
Code 节点通过 `defineNodeUI(codeNode, CodeNodeContent)` 注册专属内容，读取经过 Code schema
解析后的 `node.config.code`，在保留实例描述的同时展示 JavaScript 标识、总行数和前三行
代码预览；预览保留空格与 Tab 缩进，并通过轻量 JavaScript token 着色区分关键字、字符串、
数字、字面量、内置对象、函数与方法、括号、运算符和注释。预览只负责画布摘要，不加载或
复制 Form 包的 Monaco 编辑能力。
`NodeContentItem` 从 Condition 节点的条目样式抽离，通过 `content` props 接收内容，使用
`rounded-md bg-muted/60 px-2 py-1.5 text-slate-500` 并由内容自然撑开高度。Condition 和
其他节点只负责组合条目内部信息，不重复维护背景、圆角、间距和默认文字颜色；Condition
显式使用 `NodeContentList` 包裹并排列多个 `NodeContentItem`，从结构化 `rules` 生成
“左值 运算符 右值”的摘要，并按分支的公共逻辑关系使用 AND 或 OR 连接；运算符和逻辑关系
文案复用 Core 公共映射，变量引用按作用域格式化，未配置规则时显示明确空状态。
HTTP 节点通过 `defineNodeUI(httpNode, HttpNodeContent)` 注册专属内容，不显示节点描述或
表单字段标题；它在 `NodeContentItem` 中展示经过 HTTP schema 解析后的请求方法徽标和
请求地址，不复制 Core 的请求方法配置。方法徽标只使用 `bg-background` 区分层级，方法和
请求地址都继承 `NodeContentItem` 的默认文字颜色。
LLM 节点通过 `defineNodeUI(llmNode, LlmNodeContent)` 注册专属内容，直接读取经过 LLM
schema 解析后的 `node.config.prompt`，使用 `NodeContentList` 和 `NodeContentItem` 展示
最多三行的提示词摘要；长文本保留完整 `title`，不在 Nodes UI 中复制配置表单字段。
RAG 节点通过 `defineNodeUI(ragNode, RagNodeContent)` 注册专属内容，读取经过 RAG schema
解析后的 `node.config.knowledgeBaseId`，以紧凑条目展示当前知识库标识；未选择时显示明确
空状态。字段标签和空状态提示复用 Core 的 RAG form 定义；Nodes UI 不读取 Web 的知识库
列表，也不复制动态 Select 选项或已有 Core 业务文案。

## 新增节点界面

1. 先在 Core 中完成节点 schema、definition、初始配置和注册。
2. 普通节点实现 `NodeContentProps<TConfig>` 内容组件；需要替换完整外壳的容器节点实现
   `NodeRendererProps<TConfig>`。
   `RenderNode` 会把节点原始 `config` 经过对应 schema 解析后放回 `node.config`；
   内容组件统一从 `node.config`、`node.inputs` 和 `node.outputs` 读取节点数据，
   Props 不再额外提供独立的 `config` 字段。
3. 普通内容使用 `defineNodeUI(coreNodeType, Component)`；完整外壳使用
   `defineNodeRendererUI(coreNodeType, Renderer)`，两者都保持配置类型关联。
4. 加入内置 UI 注册列表，或由插件创建独立 `NodeUIRegistry`。
5. 调用 `assertCompatible(coreRegistry)`，避免 UI 注册未知 Core 类型。
6. 动态端口只从 Core `getNodePorts` 获取，不在 UI 中复制端口规则。
7. Core definition 或 form 已声明的节点业务标签、说明和无障碍名称直接复用对应定义；
   Nodes UI 只自行维护搜索、删除、空状态和计数等纯界面文案。

## 依赖与样式

- 可以依赖 Core、Shared 和 UI，不依赖 Web 页面、路由或服务端。
- React 节点组件直接依赖 React；画布库继续由应用层持有，不加入本包依赖。
- 通用基础控件从 `@ai-workflow/ui` 导入，节点业务内容保留在本包。
- 通用节点选择器使用 `AddNode`；容器 renderer 通过 `NodeEditorCapabilities` 消费应用注入的
  编辑能力，不直接依赖应用 Hook。
- 画布连线等紧凑位置的圆形添加入口使用 `AddNodeIconButton`；组件只提供 20px 主色圆形
  按钮与加号，不包含节点选择器或 React Flow 逻辑。
- `NodeSelectorPanel` 承担搜索、节点列表、主题图标和禁用项展示；`NodeSelectorPopover`
  组合独立受控 Popover、虚拟锚点、选择回调和失败 Toast，`AddNodeButton` 只提供标准添加
  触发器，`AddNode` 组合两者供 Loop 等局部场景使用。根画布等需要从按钮、快捷键和右键
  复用同一弹窗的场景应分别渲染 `AddNodeButton` 与 `NodeSelectorPopover`，并根据入口传入
  按钮元素或弹出目标的屏幕坐标；屏幕坐标由 Popover 内的真实固定定位 Anchor 承载，不复用
  按钮的虚拟锚点。与保持打开的菜单组成级联浮层时，使用 `keepOpenOnFocusOutside` 阻止菜单
  焦点回收关闭选择器，同时仍保留点击外部和 Esc 关闭。通过 `operationLabel` 调整失败文案，
  不复制搜索和节点列表。
- `AddNode` 通过可选的 `disabledNodeTypes` 接收调用方当前不可添加的节点类型集合；禁用项
  保留在搜索和列表结果中，使用原生 `disabled` 阻止选择，并展示禁用光标与透明度反馈。
  `AddNode` 需要由外部快捷键控制面板时，通过可选的 `open`、`onOpenChange` 使用受控模式；
  Loop 内未传入时继续使用内部开关状态。无论关闭来自触发器、Esc 还是外部状态，搜索条件
  都必须重置。
- 修改节点视觉时读取 `docs/design-system.md`，使用语义 token 和无障碍交互。

## 当前注意事项

- `BaseNode` 默认态与选中态保持相同的 `1.5px` 实体边框宽度，选中时只切换
  `border-primary` 和轻量语义阴影；不使用会向外扩张的 ring，也不在状态切换时修改边框
  宽度，避免节点内容区尺寸变化和圆角错位。
- 节点卡片、节点选择器和 MiniMap 的节点标识色统一来自 `NODE_THEMES`；调用方使用
  `getNodeThemeColor(type)` 获取带默认回退的颜色，不复制映射或硬编码节点色。
- `NodePortsRender` 将端口锚点贴在节点左右边缘，`stacked` 布局从卡片顶部 `20px`
  开始并以 `28px` 间距排列；默认端口视觉为 `4px × 20px` 的主色短竖条，
  Web 注入 Handle 时应让端口内侧贴住节点边界并整体向外突出，同时可以扩大透明命中区；
  节点卡片不得使用 `overflow-hidden` 裁剪突出边界的端口。
- `RenderNode` 统一解析配置和端口，内容组件与完整节点渲染器收到的 `node.config`
  已经过 schema 解析并应用默认值；不要再从 Props 中增加独立配置副本。
- `RenderNode` 必须把完整节点实例传给专属内容组件；Start 读取 `node.outputs`，
  End 读取 `node.inputs`，不要按产品区域名称误用存储字段。
- 内容组件必须处理长文本和空数据，不能改变端口 id 或节点定义；没有可见内容时不得使用
  空元素占住 Body 间距。
