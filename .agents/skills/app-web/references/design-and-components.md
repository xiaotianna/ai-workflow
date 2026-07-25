# 设计与组件使用规范

## 规范来源

修改任何前端界面或 shadcn 组件前，必须读取仓库 `docs/design-system.md`。该文件是视觉、语义 token 和交互状态的详细规范；本文件记录前端应用中的使用方式。

## 组件归属

- 优先使用 `@ai-workflow/ui/components/*` 已有组件。
- 只服务一个业务域的组件放在对应 `features/<feature>/components`。
- 跨业务但仍依赖路由或应用上下文的组件放在 `apps/web/src/components`。
- 无业务语义且可跨应用复用的组件放在 `packages/ui`，同时读取 `$ai-workflow-packages` 的 UI 引用。

## Studio 资源卡片

- Studio 菜单项配置维护在 `features/studio` 内，资源卡片与应用侧栏标识区复用同一份配置；应用侧栏通过 `onImportDsl` 追加“导入 DSL”并打开文件选择弹窗，Studio 页面与资源卡片不提供导入入口。页面通过回调传入实际操作，不在展示组件中内置编辑、复制、导入、删除等业务。
- 资源操作菜单统一使用 `components/action-menu-content` 渲染操作项、分组与危险状态，调用方只负责提供 Dropdown 触发器和操作项配置。
- 操作项使用稳定的 `id`，通过 `separatorBefore` 分组；危险操作设置 `destructive`，暂不可用的操作设置 `disabled`。
- 卡片的整面导航由 `ResourceCard` 内部链接承载，菜单触发器与链接保持为并列交互区域，禁止把按钮嵌套到链接中。

## App 内部布局

- 首页和应用详情页都在各自的 `pages` 布局中直接组合侧栏；侧栏外壳统一复用 `components/layout-sidebar`，固定 `w-60`，两个页面都使用 `h-svh overflow-hidden p-1` 的满高 flex 父容器拉伸侧栏，保证底部账户菜单在页面切换时坐标不偏移；通过 `header` 与导航项 props 注入页面内容，应用侧栏不包含“监测”入口。
- 侧栏底部账户菜单的触发区域按头像与用户名内容宽度收缩，不占满侧栏；用户名使用 `pl-2` 与头像保持间距，Hover、Focus、Active 和展开态背景只覆盖该内容区域。
- 应用侧栏导航从 `/app/:id` 子路由的 `handle.meta` 派生，当前提供“编排”“访问 API”“日志”，不得在侧栏复制另一份导航配置。
- 应用侧栏导航项连续排列，不在“访问 API”和“日志”之间添加分割线。
- 应用侧栏顶部使用 `w-fit self-start` 的返回按钮，返回 `/studio` 并显示 `< / 工作室`；Hover 和 Focus 背景只覆盖内容区域，不铺满侧栏。
- 返回按钮下方为应用标识区：与 Studio `ResourceCard` 标题行一致（40px 圆角图标底、默认桃色背景、标题 `text-sm/5 font-semibold`、类型标签小号大写），整行为可 Hover 的 `rounded-xl` 容器；右侧均衡器图标按钮触发与资源卡片一致的操作菜单，并提供准确的无障碍名称。
- App 页面使用浅色页面底衬分隔侧栏与内容区；应用侧栏沿用首页布局侧栏样式，内容区使用真实边框、低对比阴影与圆角容器。

## 工作流画布

- 节点卡片、添加节点面板和 MiniMap 的节点标识色通过
  `@ai-workflow/nodes-ui` 的 `getNodeThemeColor(type)` 获取，不在 Web 组件中复制
  `NODE_THEMES` 或固定使用主色。
- 节点输入、输出 Handle 使用贴合节点左右边缘的主色短竖条，视觉尺寸为 `4px × 20px`；可在不放大可见图形的前提下扩展透明命中区。
- 普通边与连接预览线使用 `--workflow-edge`，宽度为 `2.5px`，路径使用 Bezier 曲线；选中边使用 `--primary`。

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

- 可点击且有 Hover 反馈的控件必须使用 `cursor-pointer`；拖拽、缩放和禁用态使用对应的专用光标，Input、Textarea 等文本编辑控件除外。
- 禁止使用 `ring-*`、`focus:ring-*`、`focus-visible:ring-*` 表达默认、聚焦、错误或浮层轮廓。
- Button 等可点击控件使用内部背景或文字变化表达聚焦，不增加聚焦边框或阴影；输入型控件使用语义边框，且不得造成尺寸变化或布局抖动。
- 颜色使用 `packages/ui/src/styles/globals.css` 的语义 token，不在业务组件中硬编码通用状态色。
- 输入控件覆盖默认、Hover、Focus visible、Invalid 和 Disabled 状态。
- Select 与 Dropdown 使用 UI 包统一提供的半透明背景、0.5px border、`shadow-lg` 和模糊效果，页面不单独覆盖浮层阴影；其他浮层使用真实 border 与 shadow。

## 无障碍

- 优先使用原生语义元素和 Radix 行为，不用 `div` 模拟按钮。
- 图标按钮提供 `aria-label`，装饰图标使用 `aria-hidden`。
- 可点击、上传和弹出控件必须支持适用的 Tab、Enter、Space 与 Escape 路径。
- 异步加载提供状态语义；当前路由懒加载使用 `LazyLoad` 和 `role="status"`。
- 受控 Dialog 的关闭、取消和提交成功路径应共享一致的临时状态重置逻辑。
