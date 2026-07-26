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
- 知识库列表页与 Studio 使用相同的页面结构，通过 `PageTitle`、`PageHeaderActions`、`PageContent` 组合标题、工具栏与内容区；列表内容复用 `ResourceCard` 展示知识库条目；卡片点击进入 `/knowledge-base/:id/documents`，操作菜单配置维护在 `features/knowledge-base` 内。
- 知识库文档页（`/knowledge-base/:id/documents`）使用 `PageTitle`、`PageHeaderActions`、`PageContent` 组合标题、工具栏与内容区；工具栏、表格与分页分别由 `DocumentToolbar`、`DocumentTable`、`DocumentPagination` 承担，添加文件弹窗使用 TanStack Form 管理 `FileDropzone` 字段校验与提交。表格与分页的详细约定见下方「知识库文档表格」。
- `PageTitle` 支持可选 `subtitle`，样式为 `flex items-center space-x-0.5 text-sm font-normal text-muted-foreground mt-1`；各 feature 的工具栏只负责业务控件，外层间距由 `PageHeaderActions` 统一提供。
- 资源操作菜单统一使用 `components/action-menu-content` 渲染操作项、分组与危险状态，调用方只负责提供 Dropdown 触发器和操作项配置。
- 操作项使用稳定的 `id`，通过 `separatorBefore` 分组；危险操作设置 `destructive`，暂不可用的操作设置 `disabled`。
- 卡片的整面导航由 `ResourceCard` 内部链接承载，菜单触发器与链接保持为并列交互区域，禁止把按钮嵌套到链接中。

## 知识库文档表格

参考实现：`features/knowledge-base/components/document-table.tsx`、`document-action-menu.tsx`、`document-pagination.tsx`。

### 页面高度与滚动

- 文档页根容器使用 `flex h-full min-h-0 flex-col overflow-hidden`，占满详情布局主内容区剩余高度，不在页面级滚动。
- `PageContent` 与 `DocumentTable` 沿 flex 链传递 `flex-1 min-h-0 overflow-hidden`；表格主体区域单独 `flex-1 overflow-auto`，行数超出时在表格内部滚动；底部分页器固定于表格外，不参与滚动。
- 详情布局主内容区默认 `overflow-auto`；需要表格内滚动的页面须用 `h-full overflow-hidden` 约束自身高度，避免整页与表格双层滚动。

### 列结构

- 使用 TanStack Table 管理列定义、排序、分页与行选择；表格设置 `minWidth` 保证窄屏时可横向滚动。
- 「操作」列与 dot 菜单列分离：操作列表头为「操作」，内容为 `Switch`；其后为**无表头**的 dot 列，内容为 `DocumentActionMenu`（`MoreHorizontal`）。
- dot 列 `sticky right-0`；横向滚动时两列始终贴在右侧。默认 `bg-background` 遮挡下层内容，行态背景与其他列保持一致（见下方行背景）。
- dot 列左侧使用**短竖线**分隔，不用整列 `border-l`；在数据行单元格**内部容器**上用 `before` 伪元素实现，高度约 `h-3.5`，垂直居中；表头对应单元格不显示竖线。sticky 单元格本身不可加 `relative`，否则会覆盖 `sticky` 定位。

### 行背景与 sticky 一致

- 表格行使用 `group/row`；**关闭** `<tr>` 上的 `hover:bg-*` 与 `data-[state=selected]:bg-*`，改由**所有** body 单元格统一承担行态背景，避免 sticky 列与其他列不同步。
- 单元格共用：`group-hover/row:bg-input`、`group-data-[state=selected]/row:bg-input`、`group-has-[[data-state=open]]/row:bg-input`；下拉打开、鼠标移入 Portal 菜单时整行背景保持，不因失焦消失。
- 需要 sticky 与横向遮罩时，dot 列单元格额外保留默认 `bg-background`，行态类名与其他列相同。

### dot 操作菜单

- `DocumentActionMenu` **始终渲染** dot 按钮，禁止在无操作项时用空白占位替代图标；无操作项时按钮 `disabled`，有操作项时正常展开 `ActionMenuContent`。
- `getDocumentActions` 不因缺少 handler 返回空数组；页面应提供默认 `onDocumentAction`，路由未注入时使用页面内 handler。
- dot 按钮在行未 hover 时，hover / focus 使用 `bg-muted`；行已 hover 或菜单已打开（行背景为 `bg-input`）时，hover / focus / `aria-expanded` 使用 `bg-button-secondary-bg-active`，比行背景略深、可分辨；不得使用比行背景更浅的 `bg-background` 作为激活态。

### 分页

- 分页器使用 `@ai-workflow/ui/components/pagination`，独立于表格滚动容器，位于 `DocumentTable` 底部；支持页码与每页条数切换。

## 详情页布局

- 应用与知识库详情页复用 `components/detail-layout`，统一提供返回链接、左侧 `LayoutSidebar` 与右侧内容容器；页面通过 `backTo`/`backLabel` 设置返回目标，通过 `resourceIdentity` 插槽注入各 feature 的资源标识组件。
- 资源标识区使用 `components/resource-identity` 封装图标、标题、类型标签与右侧 `actions` 插槽；通用操作菜单触发器使用 `components/resource-action-menu`，各 feature 在 `AppDetailIdentity`、`KnowledgeBaseDetailIdentity` 等组件中组装业务操作项并注入插槽。
- 侧栏外壳固定 `w-60`，外层使用 `h-svh overflow-hidden p-1` 的满高 flex 容器，保证底部账户菜单在页面切换时坐标不偏移。
- 侧栏底部账户菜单的触发区域按头像与用户名内容宽度收缩，不占满侧栏；用户名使用 `pl-2` 与头像保持间距，Hover、Focus、Active 和展开态背景只覆盖该内容区域。
- 详情页导航从对应父路由子项的 `handle.meta` 派生，通过 `router/navigation` 的 `getNavigationItemsFromRoute` 生成，不得在侧栏复制另一份导航配置。
- 详情页侧栏导航项连续排列，不在导航项之间添加分割线。
- 详情页侧栏顶部使用 `w-fit self-start` 的返回按钮，显示 `< / {列表页名称}`；Hover 和 Focus 背景只覆盖内容区域，不铺满侧栏。
- 返回按钮下方为资源标识区：由 `ResourceIdentity` 提供与 Studio `ResourceCard` 标题行一致的样式（40px 圆角图标底、标题 `text-sm/5 font-semibold`、类型标签小号大写），整行为可 Hover 的 `rounded-xl` 容器；操作菜单通过 `actions` 插槽由各 feature 注入，应用默认桃色图标底，知识库默认蓝色图标底。
- 详情页使用浅色页面底衬分隔侧栏与内容区；侧栏沿用首页布局侧栏样式，内容区使用真实边框、低对比阴影与圆角容器。

## 工作流画布

- 节点卡片、添加节点面板和 MiniMap 的节点标识色通过
  `@ai-workflow/nodes-ui` 的 `getNodeThemeColor(type)` 获取，不在 Web 组件中复制
  `NODE_THEMES` 或固定使用主色。
- 节点输入、输出 Handle 使用贴合节点左右边缘的主色短竖条，视觉尺寸为 `4px × 20px`；可在不放大可见图形的前提下扩展透明命中区。
- 普通边与连接预览线使用 `--workflow-edge`，宽度为 `2.5px`，路径使用 Bezier 曲线；选中边使用 `--primary`。
- Loop 容器只通过右下角悬停显示的缩放控件调整尺寸，并以默认 Loop 尺寸作为最小宽高；
  缩放控件保留透明命中区，视觉使用贴合容器圆角的低对比内侧圆弧，不显示外置折线图标；
  子节点使用相对父节点的自定义 `extent` 限制在 Header 下方的点阵背景区域内，并在父容器
  缩放时同步边界；边界相对点阵背景四周保留 `20px` 安全边距，不得设置 `expandParent`
  反向撑大容器。

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
