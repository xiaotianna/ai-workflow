# `@ai-workflow/nodes-ui`

## 职责

提供工作流节点通用渲染、节点内容契约、UI 注册表、基础节点外壳、图标和端口渲染扩展点。

## 公开用法

```ts
import {
  RenderNode,
  NodeUIRegistry,
  defineNodeUI,
  createBuiltinNodeUIRegistry,
} from '@ai-workflow/nodes-ui'
```

包只暴露根入口，不深层引用内部组件。

## 渲染流程

1. `RenderNode` 从 Core `NodeRegistry` 查找节点类型。
2. 未知类型显示可诊断的默认节点，不让整个画布直接崩溃。
3. 使用 Core `getNodePorts` 解析静态或动态端口。
4. 从 `NodeUIRegistry` 获取专属内容组件，未注册时使用默认内容。
5. `BaseNode` 负责节点外壳、选择、删除、键盘操作和端口区域。
6. 画布通过 `renderPort` 注入具体 Handle，不让本包依赖某个画布库。

## 新增节点界面

1. 先在 Core 中完成节点 schema、definition、初始配置和注册。
2. 实现接收 `NodeContentProps<TConfig>` 的内容组件。
3. 使用 `defineNodeUI(coreNodeType, Component)` 保持配置类型关联。
4. 加入内置 UI 注册列表，或由插件创建独立 `NodeUIRegistry`。
5. 调用 `assertCompatible(coreRegistry)`，避免 UI 注册未知 Core 类型。
6. 动态端口只从 Core `getNodePorts` 获取，不在 UI 中复制端口规则。

## 依赖与样式

- 可以依赖 Core、Shared 和 UI，不依赖 Web 页面、路由或服务端。
- 通用基础控件从 `@ai-workflow/ui` 导入，节点业务内容保留在本包。
- 修改节点视觉时读取 `docs/design-system.md`，使用语义 token 和无障碍交互。

## 当前注意事项

- `BaseNode` 的选中态使用节点实体自身的 `border-primary` 和轻量语义阴影，不使用会向外扩张的 ring，避免轮廓与圆角错位。
- `NodePortsRender` 将端口锚点贴在节点左右边缘，默认端口视觉为 `4px × 20px` 的主色短竖条；Web 注入 Handle 时应保持相同尺寸，并可额外扩大透明命中区。
- `RenderNode` 调用 `getNodePorts` 完成配置解析，但传给内容组件的仍是原始 `node.config`；在契约修正前，不要假设内容组件一定收到 Zod 默认值处理后的配置。
- 内容组件必须处理长文本和空数据，不能改变端口 id 或节点定义。
