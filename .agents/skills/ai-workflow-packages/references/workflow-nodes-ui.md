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
  AddNode,
  LoopNode,
  getNodeThemeColor,
  NODE_THEMES,
} from '@ai-workflow/nodes-ui'
```

包只暴露根入口，不深层引用内部组件。

## 渲染流程

1. `RenderNode` 从 Core `NodeRegistry` 查找节点类型。
2. 未知类型显示可诊断的默认节点，不让整个画布直接崩溃。
3. 使用 Core `getNodePorts` 解析静态或动态端口。
4. 从 `NodeUIRegistry` 获取注册项：`content` 复用 `BaseNode`，`renderer` 接管完整节点。
5. 未注册专属 UI 时使用默认内容；普通内容由 `BaseNode` 负责外壳、选择、删除和端口区域。
6. 画布通过 `renderPort` 注入具体 Handle，不让本包依赖某个画布库。

循环容器通过 `defineNodeRendererUI(loopNode, LoopNode)` 加入
`builtinNodeUIRegistrations`，由 `RenderNode` 自动选择完整节点渲染器。`LoopNode`
自行渲染通用 `AddNode` 选择器；画布层通过 `editorCapabilities` 提供不同容器类型的
候选节点和添加回调，不再判断节点应渲染什么操作或组件。能力按照
`editorCapabilities[parentNodeType].addChildNode` 组织，方便后续为不同节点类型扩展其他能力。
普通节点与完整节点渲染器统一复用 `NodeWrapper`、`NodeHeader` 和 `NodePortsRender`。
`NodeWrapper` 统一管理外层交互容器和内层卡片样式，并处理选择、禁用和键盘交互；
普通节点使用默认样式，容器节点使用 `variant="container"`；特殊场景可以传入 `className`，
由 `cn` 与 Wrapper 的默认外层样式合并；
`NodePortsRender` 默认纵向排列端口，容器节点可以使用 `layout="centered"` 将端口放在垂直中线。

## 新增节点界面

1. 先在 Core 中完成节点 schema、definition、初始配置和注册。
2. 普通节点实现 `NodeContentProps<TConfig>` 内容组件；需要替换完整外壳的容器节点实现
   `NodeRendererProps<TConfig>`。
3. 普通内容使用 `defineNodeUI(coreNodeType, Component)`；完整外壳使用
   `defineNodeRendererUI(coreNodeType, Renderer)`，两者都保持配置类型关联。
4. 加入内置 UI 注册列表，或由插件创建独立 `NodeUIRegistry`。
5. 调用 `assertCompatible(coreRegistry)`，避免 UI 注册未知 Core 类型。
6. 动态端口只从 Core `getNodePorts` 获取，不在 UI 中复制端口规则。

## 依赖与样式

- 可以依赖 Core、Shared 和 UI，不依赖 Web 页面、路由或服务端。
- React 节点组件直接依赖 React；画布库继续由应用层持有，不加入本包依赖。
- 通用基础控件从 `@ai-workflow/ui` 导入，节点业务内容保留在本包。
- 通用节点选择器使用 `AddNode`；容器 renderer 通过 `NodeEditorCapabilities` 消费应用注入的
  编辑能力，不直接依赖应用 Hook。
- 修改节点视觉时读取 `docs/design-system.md`，使用语义 token 和无障碍交互。

## 当前注意事项

- `BaseNode` 的选中态使用节点实体自身的 `border-primary` 和轻量语义阴影，不使用会向外扩张的 ring，避免轮廓与圆角错位。
- 节点卡片、节点选择器和 MiniMap 的节点标识色统一来自 `NODE_THEMES`；调用方使用
  `getNodeThemeColor(type)` 获取带默认回退的颜色，不复制映射或硬编码节点色。
- `NodePortsRender` 将端口锚点贴在节点左右边缘，`stacked` 布局从卡片顶部 `20px`
  开始并以 `28px` 间距排列；默认端口视觉为 `4px × 20px` 的主色短竖条，
  Web 注入 Handle 时应让端口内侧贴住节点边界并整体向外突出，同时可以扩大透明命中区；
  节点卡片不得使用 `overflow-hidden` 裁剪突出边界的端口。
- `RenderNode` 统一解析配置和端口，内容组件与完整节点渲染器都会收到经过 schema
  解析、已应用默认值的 `config`。
- 内容组件必须处理长文本和空数据，不能改变端口 id 或节点定义。
