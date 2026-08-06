# 路由、布局与页面加载

## 当前结构

- 使用 `createBrowserRouter` 在 `src/router/index.tsx` 集中声明路由。
- `App.tsx` 作为 `/` 路由树的统一鉴权边界：存在本地登录会话时渲染根 `Outlet`，否则
  重定向到 `/auth`。
- `/` 下的布局页面直接组合 `LayoutSidebar` 和主内容区域，并通过子路由渲染页面。
- 首页布局当前包含 `/studio`、`/knowledge-base`、`/models` 和 `/plugin`；模型页导航位于
  知识库与插件之间，继续从 `models` 路由的 `handle.meta` 派生。
- 插件详情使用 `/plugin/:author/:pluginId`，作者昵称和插件 ID 在生成链接时分别使用
  `encodeURIComponent` 转义；详情路由与首页布局同级，作为独立的受保护全屏页面，不渲染首页
  侧栏。详情页固定复用插件列表的 Marketplace Header，正文滚动时 Header 保持在页面顶部；Header
  的 Logo Hover 或键盘 Focus 后切换为返回箭头，点击返回 `/plugin`。
- `/models` 使用 `tab=chat|embedding` 保存“对话 / 嵌入”分类；缺失或无效值通过 replace
  规范化为 `tab=chat`，切换时保留其他查询参数。
- `/app/:id` 与 `/knowledge-base/:id` 是与首页布局并列的根级详情布局，不渲染首页侧栏内容；两者复用 `components/detail-layout`，由内容区承载子路由。
- 应用卡片进入 `/app/:id/workflow`；应用内页面使用 `/app/:id/:section` 形式的嵌套路由，当前包含 `workflow`、`api` 和 `logs`，父路由保留 `Outlet`，索引路由重定向到 `workflow`。
- `/knowledge-base/:id` 与 `/app/:id` 同级，为知识库详情布局；子路由包含 `documents` 和 `recall-test`，索引路由重定向到 `documents`。
- `/share/api/:shareToken` 位于 `/` 鉴权路由树之外，通过公开接口校验分享状态后只展示应用 API
  文档正文；该路由不得挂载应用详情 Header、侧栏或读取用户登录会话。
- 页面使用 React `lazy`，由 `LazyLoad` 统一提供 Suspense fallback。
- 路由 `handle.meta` 保存标题、鉴权标记和导航图标；侧栏从路由配置派生导航。
- `/auth` 仅允许未登录访问；已登录访问时重定向到 `/`。登录成功也统一重定向到 `/`，
  再由根索引路由进入默认业务页。

## 修改路由

1. 为路由设置稳定且唯一的 `id`。
2. 页面模块保持默认导出，以配合当前 `lazy(() => import(...))` 写法。
3. 需要进入侧栏的页面提供 `path`、`meta.title` 和 `meta.icon`。
4. 重定向使用 `Navigate replace`，避免增加无意义历史记录。
5. 不在侧栏复制第二份导航配置，保持路由为导航元数据来源。
6. 鉴权实现后以 `meta.requiresAuth` 为路由约定，不在各页面散落重复判断。
7. 需要鉴权的页面统一放在 `/` 的受保护路由树下；不要在各业务页面重复读取登录会话。
8. 公开分享页必须放在受保护路由树之外，并由服务端公开资源接口验证不可猜测的分享令牌；
   前端路由不能把“无 JWT”当作分享授权依据。

## 布局规则

- 页面只负责自身内容，不重复创建全局侧栏或根级加载遮罩。
- 首页布局在页面中直接组合 `LayoutSidebar`；应用与知识库详情页复用 `DetailLayout`，统一使用 `h-svh overflow-hidden p-1` 的外层容器，主内容区使用 `min-h-0 overflow-auto`，确保共享侧栏及底部账户菜单在路由切换时保持相同位置。
- 详情页导航项通过 `router/navigation` 的 `getNavigationItemsFromRoute` 从子路由 `handle.meta` 派生，不在页面中复制导航配置。
- 主布局保持 `min-w-0` 和可滚动内容区域，避免子页面撑破横向布局。
- 页面级空态、错误态和局部加载态靠近数据消费区域；只有路由代码块加载使用全页 `LazyLoad`。
- 新增嵌套路由时让父页面保留 `Outlet`，不要手工根据路径切换组件。
- 详情子页面若含「占满剩余高度、内容区内部滚动」的表格或列表，页面根使用 `h-full min-h-0 overflow-hidden` 与 flex 高度链，见 `$app-web` 的 [design-and-components.md](design-and-components.md) 中「知识库文档表格」。
