# 设计与组件使用规范

## 规范来源

修改任何前端界面或 shadcn 组件前，必须读取仓库 `docs/design-system.md`。该文件是视觉、语义 token 和交互状态的详细规范；本文件记录前端应用中的使用方式。

## 组件归属

- 优先使用 `@ai-workflow/ui/components/*` 已有组件。
- 只服务一个业务域的组件放在对应 `features/<feature>/components`。
- 跨业务但仍依赖路由或应用上下文的组件放在 `apps/web/src/components`。
- 无业务语义且可跨应用复用的组件放在 `packages/ui`，同时读取 `$ai-workflow-packages` 的 UI 引用。

## Studio 资源卡片

- Studio 菜单项配置维护在 `features/studio` 内，资源卡片与应用侧栏标识区复用同一份配置；Studio 当前只有工作流应用，`StudioAppListItem` 不维护分类字段，列表卡片与应用侧栏标识区统一传入并显示固定分类文字“工作流”。Studio 工具栏通过 `onImportApp` 打开 DSL 文件选择弹窗，导入只接受 `.json` 文件并创建应用，资源卡片不提供导入入口；应用侧栏仍可通过 `onImportDsl` 追加“导入 DSL”。页面通过回调传入实际操作，不在展示组件中内置编辑、复制、导入、删除等业务。
- Studio 排序选项及卡片时间展示统一由 `studio-app-sort-strategies.ts` 的策略表维护：
  `updated_desc` 使用 `updatedAt` 并显示“编辑于”，`created_desc`、`created_asc` 使用
  `createdAt` 并显示“创建于”。Toolbar 与 Grid 必须消费同一策略表，不在组件中按排序值写
  条件分支；通用 `ResourceCard` 只接收时间文案和值，不判断业务排序。
- Studio 与应用详情页删除工作流时统一先打开 `DeleteStudioAppDialog`；弹窗明确列出草稿、版本、
  部署、运行内容、API Key 和调用日志均会永久删除，请求期间禁止关闭和重复提交。列表删除
  成功后刷新当前查询，详情页删除成功后返回 Studio。
- 知识库列表页与 Studio 使用相同的页面结构，通过 `PageTitle`、`PageHeaderActions`、`PageContent` 组合标题、工具栏与内容区；列表内容复用 `ResourceCard` 展示知识库条目，角标使用 `BookOpen` 与 Studio 的工作流图标区分，角标内图标统一为 `size-2.5`；卡片点击进入 `/knowledge-base/:id/documents`，操作菜单配置维护在 `features/knowledge-base` 内。
- 知识库文档页（`/knowledge-base/:id/documents`）使用 `PageTitle`、`PageHeaderActions`、`PageContent` 组合标题、工具栏与内容区；工具栏、表格与分页分别由 `DocumentToolbar`、`DocumentTable`、`DocumentPagination` 承担，添加文件弹窗使用 `useFormData` 管理 `FileDropzone` 字段，通过 `validateFormByZod` 与对应 Zod schema 完成校验和提交。表格与分页的详细约定见下方「知识库文档表格」。
- `PageTitle` 支持可选 `subtitle`，样式为 `flex items-center space-x-0.5 text-sm font-normal text-muted-foreground mt-1`；各 feature 的工具栏只负责业务控件，外层间距由 `PageHeaderActions` 统一提供。
- 资源操作菜单统一使用 `components/action-menu-content` 渲染操作项、分组与危险状态，调用方只负责提供 Dropdown 触发器和操作项配置。
- 操作项使用稳定的 `id`，通过 `separatorBefore` 分组；危险操作设置 `destructive`，暂不可用的操作设置 `disabled`。下拉操作项默认只显示文字，不提供通用 `icon` 配置；只有用户或业务规范明确要求时才单独实现图标。
- 卡片的整面导航由 `ResourceCard` 内部链接承载，菜单触发器与链接保持为并列交互区域，禁止把按钮嵌套到链接中。

## 模型管理

- `/models` 的业务界面放在 `features/models`，请求契约与调用统一放在 `src/api/models`；页面从
  `GET /models/groups` 加载当前用户配置并管理请求状态和弹窗开关，不再生成客户端 ID 或内置
  默认模型组。模型组表单继续使用统一 Zod、`useFormData` 和 `validateFormByZod` 方案。
- OpenAI、DeepSeek、Ollama 等供应商的名称、图标、默认地址、配置字段和 API 文档地址由
  `provider-strategies.ts` 的前端展示策略统一提供；持久化、默认探测地址和响应校验由后端供应商
  注册表负责。新增供应商时两端分别注册策略，不在页面、手风琴或弹窗中增加类型分支。
- 模型组列表使用可多项展开的手风琴；模型组与模型项分别保留独立启用状态，关闭模型组不覆盖
  各模型项原有状态。模型组默认折叠；模型组头部和模型项整行只在鼠标 Hover 时使用
  `bg-input`，展开、选中或控件获得焦点时不保留整行背景；行内普通图标按钮的 Hover 与
  Focus visible 使用更深一级的 `bg-button-secondary-bg-active`，危险按钮继续使用 destructive
  状态，确保局部按钮不会与整行背景混在一起。键盘焦点由实际控件自身的文字或局部状态表达。
  模型组的编辑与删除收纳到横向三点操作菜单，并复用 `ActionMenuContent`；删除项使用危险态
  且与普通编辑操作分组，两个菜单项只显示文字，不在组头并列展示编辑、删除图标按钮。
  展开折叠、组新增与删除使用 Motion，并通过 `MotionConfig` 遵循系统减少动态效果设置。
- 新增和编辑复用同一模型组 Dialog；模型组名称与供应商类型固定展示，供应商配置表单根据策略
  声明的字段动态渲染（OpenAI、DeepSeek 为可选 Base URL 与 Key，Ollama 为可选 Base URL）。
  配置项下方展示当前供应商的 API 文档链接，使用主题色、外链图标并在新窗口打开，不在 Base
  URL 下显示默认值提示。模型列表支持动态添加、删除模型 ID 和可选显示名称。Dialog 提供
  “测试连通性”按钮通过 `POST /models/test-connection` 请求后端：表单输入了 Key 时验证当前
  配置；编辑已有模型组时将响应中的 `maskedApiKey` 回填到 Key 输入框，值仍等于原掩码时通过
  `credentialGroupId` 使用已保存密文，用户输入与掩码不同时才作为新 Key；主动清空表示清除
  凭证。没有可用 Key 时先验证
  网络，匿名请求返回 2xx 时再验证响应结构。结果按网络可达、认证和响应结构三部分使用 Toast 反馈，测试中状态不写入
  表单值；Ollama 等无需 Key 的供应商在接口返回 `authentication=not_required` 且响应结构有效时
  直接提示“配置可用”，不得提示“未验证 Key”。Key 输入框不额外展示“已保存”等说明文字；
  掩码只用于展示和变更判断，不得作为新 Key 提交。切换供应商且未输入新 Key 时明确清除旧
  Key。删除模型组需先展示确认 Dialog。
- 模型页工具栏左侧使用 `@ai-workflow/ui/components/tabs` 在“对话”和“嵌入”之间切换，
  右侧放置“新增模型组”并保持水平对齐；两类模型组使用相互独立的页面状态，当前分类由
  `tab=chat|embedding` 查询参数驱动。组与单模型启停使用服务端 UUID，前端可以先乐观更新，
  请求失败时恢复原状态；关闭模型组不得覆盖各模型的启用状态。

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
- 详情资源请求加载中或失败时，所有依赖该资源的按钮和编辑入口必须使用真实禁用态；状态来源、
  Outlet context 传递方式及工作流禁用范围见
  [hooks-and-state.md](hooks-and-state.md) 的「详情资源可用性」。

## 工作流画布

- 底部画布工具栏以“添加节点”按钮作为定位锚点，撤销/重做按钮组绝对定位在其左侧，
  AI 入口绝对定位在其右侧；工具栏根容器通过 `-84px` 左外边距补偿历史按钮组及间距，
  避免新增历史操作后添加按钮向右偏移。历史操作使用 Feature 内原生封装的紧凑快捷键
  Tooltip，不依赖 shadcn/Radix Tooltip；视觉采用 28px 高白底浮层、细边框、低对比阴影
  和独立键帽，不显示指向箭头。撤销支持 `Command/Ctrl+Z`，重做支持
  `Command/Ctrl+Shift+Z` 和 `Ctrl+Y`。节点增删、拖动、Loop 缩放、节点配置与连线变更
  进入历史，选择态和视口不进入历史；焦点位于输入框或可编辑文本区域时保留原生文本撤销
  行为。
- 工作流操作栏的系统变量按钮复用 `@ai-workflow/ui/components/variable-icon`，由图标组件
  通过 `currentColor` 继承按钮文字色，不在 Web 层直接用 `<img>` 渲染固定色 SVG。
- Web 内的紧凑操作提示统一复用 `components/tooltip.tsx` 的 `Tooltip`，且只在 Hover 时
  展示；按钮获得键盘焦点、被点击或保持选中状态时不单独展示提示。工作流右上操作栏直接
  使用通用 Tooltip 并显示在按钮下方；底部画布工具栏由 Feature 内的 `ToolbarTooltip`
  封装文字与快捷键键帽，提示显示在按钮上方。
- 节点卡片、添加节点面板和 MiniMap 的节点标识色通过
  `@ai-workflow/nodes-ui` 的 `getNodeThemeColor(type)` 获取，不在 Web 组件中复制
  `NODE_THEMES` 或固定使用主色。
- 右侧节点配置面板放在 `features/workflow/components`，由工作流业务功能管理节点选择、
  面板开关和配置校验；配置字段列表使用
  `@ai-workflow/form/components/node-config-fields` 的 `NodeConfigFields` 渲染，不在 Web
  中复制字段类型分发逻辑。复杂动态配置通过 Core `NodeType.configRenderer` 声明，由
  `@ai-workflow/form/components/node-config-section` 的 `NodeConfigSection` 从注册表选择
  受控 renderer；Web 只透传 config、错误、上游变量和变更回调，不按节点类型分支。
  配置面板通过 Core `resolveNodeVariableForm` 解析
  `NodeType.variableForm`，再使用
  `@ai-workflow/form/components/node-variable-section` 的 `NodeVariableSection` 渲染输入、
  输出变量区；整个配置未声明时默认同时显示两区，配置对象存在时只显示其中实际声明的
  方向，不使用 `null` 占位。输入变量、节点配置和输出变量中相邻且实际存在的分区之间使用
  面板全宽的独立 `Separator`，不在字段容器上拼接边框；缺失分区不保留分割线占位。
  Core 只声明区域和 renderer，Form 提供受控组件，Web 不按节点类型复制映射。
  Start 的“输入变量”通过专属 renderer 展示紧凑列表，右上角加号打开新增 Dialog，已有变量
  可通过同一 Dialog 编辑；Dialog 编辑字段类型、变量名称、显示名称、类型匹配的默认值与
  必填状态，不提供最大长度或隐藏预填，最终仍写入 `node.outputs`；End 的“输出变量”通过输入
  绑定 renderer 写入 `node.inputs`，Code 使用默认配置并按输入变量、代码配置、输出变量排列。
  Condition 使用专属配置 renderer 编辑 IF / ELIF / ELSE 分支；条件两侧复用 Form 的
  `VariableValueEditor`，支持直接值和完整上游变量引用，比较运算符和同一分支统一使用的
  AND/OR 逻辑关系都来自 Core 公共契约。Condition 声明空 `variableForm`，不再同时显示与
  分支配置重复的默认输入/输出变量区。
  当前节点可
  引用变量由 Web 根据执行 Edge 收集所有可达
  上游节点的动态输出和静态输出端口，并将来源节点、变量名称和数据类型作为结构化候选传入
  Form；Form 的变量选择器按节点分组，支持搜索并显示变量类型，普通节点输入区与 End 输出区
  共用该交互。首期只支持直接值和完整上游变量引用，不包含系统变量、环境变量和嵌套 Path。
  Condition 画布摘要通过 Nodes UI 的 `resolveVariableReferenceDisplay` 消费 Web 根据当前
  React Flow 节点生成的来源名称与变量名，显示文案必须与 Config Form 的“来源名称 / 变量名”
  一致，不得直接展示持久化 `nodeId`；源节点实例名称变化时摘要同步更新。
  名称、描述、`config`、`inputs`、
  `outputs` 统一由 `useFormData` 管理，并通过对应 Zod schema 与 `validateFormByZod`
  校验后即时写回节点。动态业务数据通过 `features/workflow/node-form-resolvers` 中按节点类型注册的
  Resolver 合并为完整字段配置后再交给 `NodeConfigFields`。RAG Resolver 当前从知识库业务
  公开数据生成选项，Core 与 Form 不依赖 Web 数据；新增其他动态控件时增加对应 Resolver，
  不扩展 `NodeConfigFields` 的控件专属参数。
- 节点配置面板头部直接复用 `@ai-workflow/nodes-ui` 公开导出的 `NodeHeader`，通过
  `className` 适配面板间距，通过 `actions` 组合语义色短竖线与 `icon-xs` 关闭按钮；
  不在 Web 层复制节点标识色或图标。节点实例名称通过 `NodeHeader.label` 插槽渲染原生
  `Input`，描述也使用原生 `Input`；二者修改后即时进入编辑器状态和保存链路，画布节点同步
  展示实例名称。名称清空时回退到带实例编号的默认名称（首个为类型 label，后续为
  `label 2`、`label 3`），描述允许清空。两个内联输入均覆盖通用 Input 的边框、背景、圆角、
  阴影、内外边距和 Hover / Focus 容器状态，只通过文本光标表达正在编辑，使非编辑外观与
  普通文字一致；节点说明输入使用 `text-xs leading-4`，与下方标签栏保留 `mt-2`，避免在
  紧凑面板头部形成大块空白。
- 节点配置面板通过 Motion 的 `AnimatePresence` 管理开关动画：打开时从右侧滑入并淡入，
  关闭时向右滑出并淡出；面板使用稳定 key，切换节点只更新配置内容，不重复播放开场动画，
  并通过 `MotionConfig reducedMotion="user"` 遵循系统的减少动态效果设置。
- 节点配置面板底部统一使用 Feature 内的 `WorkflowNextStep` 展示“下一步”入口，并复用根画布
  已有的 `NodeSelectorPopover` 与 `useWorkflowNodePicker`，不得另建节点选择面板或另一套开关状态。
  `WorkflowNextStep` 使用 `Form.Field required` 统一渲染标题，说明文字和节点连接选择区域放在
  Field content 中，不在组件内另写标题字号和标题间距；组件间距由包裹 Field 的普通外层容器
  承担，不把顶部 `padding` 直接加到 `fieldset`，避免原生 `legend` 的特殊布局绕过间距。它与
  上方配置区之间的横向分割线使用 Field 外部独立的 `Separator`，禁止把 `border-t` 加到
  `fieldset` 上导致 `legend` 切断边线。
  连接区域按 Edge 顺序展示当前节点去重后的直接下游节点；节点项显示实例名称并可切换到对应
  配置面板，末尾入口在已有下游时使用“添加并行节点”。每个已连接节点项右侧使用工作流
  节点同规格的 `Button variant="secondary" size="icon-sm"` dot 按钮，内部保留
  `size-6` 图标区；菜单复用 `ActionMenuContent`，提供更改节点、断开当前直连边和删除节点，
  不在整行按钮内嵌套另一个按钮。源节点外壳、连接项和添加入口统一为
  `36px` 高，节点主题图标容器与 `NodeHeader` 一致为 `24px`、内部 `NodeIcon` 为 `16px`；
  已连接节点名称使用 `text-sm`，添加入口文案使用低一级的 `text-xs`；颜色和图标仍从
  `@ai-workflow/nodes-ui` 获取，不在 Feature 中复制映射或放大画布节点规格。
  选择节点后由 `useWorkflowEditor.addConnectedNode` 在同一个历史检查点中原子创建节点和连线：
  根节点放在当前节点右侧并纵向避开已有直接下游，Loop 子节点继续放在同一 Loop 作用域；
  连线使用当前节点首个仍可连接的输出端口和新增节点首个可用输入端口。当前节点没有可用输出
  端口时入口使用真实禁用态，目标节点没有输入端口或不允许出现在当前作用域时不得选择。
- 节点输入、输出 Handle 使用贴合节点左右边缘的主色短竖条，视觉尺寸为 `4px × 20px`；可在不放大可见图形的前提下扩展透明命中区。
- 普通边与连接预览线使用 `--workflow-edge`，宽度为 `2.5px`，路径使用 Bezier 曲线；选中边使用 `--primary`。
  鼠标悬停节点时，与该节点输入或输出端口相连的全部边使用 `--primary` 高亮；离开节点后恢复
  普通边颜色，不把该临时展示状态写入工作流数据或历史。
- 仅在鼠标 Hover 普通边时，在 Bezier 路径中点显示
  `@ai-workflow/nodes-ui` 的 `AddNodeIconButton`；边选中、节点 Hover/选中和端口状态不触发
  该按钮。点击按钮复用根画布节点选择器；选择节点后删除原边，使用新增节点的首个输入、
  输出端口建立“原上游 → 新节点 → 原下游”两条边，再自动排列根节点并适配视口。没有同时
  提供输入和输出端口的节点类型在该入口中禁用。
- 根画布“添加节点”的禁用态由规则集合统一派生：始终禁用类型直接进入禁用集合，单实例
  类型仅在画布已有对应实例时进入禁用集合。当前 Start 属于单实例类型，已存在时仍在面板中
  展示但不可选择；删除或撤销到不存在该类型的状态后自动恢复可用。新增入口必须查询同一份
  禁用结果，不按具体节点类型重复条件判断。
- 工作流快捷键帮助入口固定在画布右下角，使用问号图标按钮打开右侧 Sheet；快捷键名称与
  键位统一读取 Feature 内的快捷键定义，不在按钮、监听 Hook 与帮助面板中分别维护文案。
- 工作流快捷键 Sheet 与画布/节点右键菜单统一复用 `WorkflowShortcutKeys` 渲染键帽：
  组合键拆成独立键帽，使用等宽灰色文字、浅色背景、细边框和轻阴影；右键菜单不得另写
  一套缩小或纯文本快捷键样式。菜单项只在 `workflow-shortcut-definitions.ts` 已声明对应
  操作时展示键帽。
- 画布和节点右键菜单使用同一套轻量 Popover 视觉，但动作由 Workflow Feature 的策略注册表
  提供，不在菜单组件内硬编码。画布菜单不提供“添加注释”；根画布使用独立的受控节点选择
  弹窗，底部按钮和快捷键打开时锚定底部工具栏，右键“添加节点”和“更换节点”打开时锚定
  对应菜单项右侧。右键菜单在节点选择期间保持打开，选中节点或关闭选择器后两个浮层一起
  关闭；右键新增同时保留最初右键位置对应的画布坐标，选中类型后以该坐标为
  节点中心。导入应用通过 Dialog 明确提示会覆盖当前
  节点、连线和布局，用户选择文件并确认后才执行。
- 节点右上方的 dot 在节点 Hover、键盘焦点或选中时展示；按钮右侧相对节点内收 `4px`，
  底部与节点保持 `4px` 间距；
  点击 dot 通过原生 `contextmenu` 事件进入现有节点右键链路，不维护第二套菜单开关或动作
  状态。dot 使用单层 `Button variant="secondary" size="icon-sm"` 并覆盖为
  `rounded-lg`，通过次级按钮自身的语义背景、`0.5px` 外边框和轻阴影呈现，不额外嵌套
  工具栏外壳，也不得使用胶囊或圆形。按钮 Hover、Focus 和 Active 时外层保持默认背景，
  只让内部 `size-6 rounded-md` 图标区切换对应次级背景，四周保留 `4px` 留白。右键菜单的
  浮层与菜单项统一由
  `WorkflowContextMenuContent` 渲染；
  `ContextMenu.Trigger` 必须绑定真实 DOM 元素，不得直接以不透传 DOM props/ref 的 Provider
  组件作为 `asChild` 子元素。
- Loop 容器只通过右下角悬停显示的缩放控件调整尺寸，并以默认 Loop 尺寸作为最小宽高；
  缩放控件保留透明命中区，视觉使用贴合容器圆角的低对比内侧圆弧，不显示外置折线图标；
  子节点使用相对父节点的自定义 `extent` 限制在 Header 下方的点阵背景区域内，并在父容器
  缩放时同步边界；边界相对点阵背景四周保留 `20px` 安全边距，不得设置 `expandParent`
  反向撑大容器。

## 表单

- 使用 `@ai-workflow/ui/components/form` 提供的 `Form` 与 `Form.Field`。
- 所有表单都必须先声明 Zod schema；表单值类型使用 `z.input<typeof schema>`，校验成功后的业务数据类型使用 `z.output<typeof schema>`，不得手写一份与 schema 重复的表单类型。
- 所有表单值状态统一使用 `@ai-workflow/shared/hooks/use-form-data` 的 `useFormData` 管理；单字段、批量和重置操作分别使用 `updateFormField`、`updateForm` 和 `resetForm`，不得为每个字段分别创建 `useState`。
- 所有表单校验统一使用 `@ai-workflow/shared/utils/validate-form-by-zod` 的 `validateFormByZod`。实时校验可在 `useFormData` 的 `onChange` 中执行；提交前必须再次校验，并且只把成功结果的 `data` 交给请求或业务逻辑，禁止直接提交未经解析的 `form`。
- `validateFormByZod` 返回的前端表单校验错误按字段路径传给 `Form.Field error`，展示在对应输入控件下方；前端表单级校验错误使用 `errors.form` 或返回的 `message`。不要另外维护与 Zod 结果重复的手写校验规则。
- 请求产生的错误统一使用 `@ai-workflow/ui/lib/toast` 的 `showToast('error', message)` 展示，包括后端接口返回的错误信息、后端校验错误和网络失败；即使后端错误指向具体字段，也不得写入 `Form.Field error`、`errors.form` 或展示在输入控件下方。
- 接手修改不符合该约定的已有表单时，必须在同一任务中把该表单的全部字段状态与校验迁移到统一方案，不保留新旧两套表单状态或校验逻辑。
- 动态字段和相关字段的批量变更仍使用 `useFormData`；复杂对象或数组通过字段函数式更新或 `updateForm` 处理，不切换到另一套表单状态库。
- 弹窗开关、请求中、分页等不属于表单值的 UI 状态可以使用普通状态管理；字段值、动态字段集合和待提交数据必须留在 `useFormData` 中。
- 不使用 TanStack Form、Formik、React Hook Form 或零散 `useState` 替代该约定；若字段超过 20 个或更新频率极高，必须先获得用户明确同意才能更换状态方案，Zod schema 与 `validateFormByZod` 仍不可省略。
- 使用 `<Form.Field required label="名称">` 标记必填；未传 `required` 时自动显示 `（可选）`。
- 值、校验与提交由调用方按上述统一方案管理；只有前端表单校验错误通过 `Form.Field error` 展示，请求错误必须使用 Toast。
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
- Dialog 和表单打开或渲染后均不得默认、自动或通过代码聚焦任何输入框、按钮等控件；
  禁止使用 `autoFocus` 或调用 `focus()`。Radix Dialog 在 `DialogContent` 的
  `onOpenAutoFocus` 中只调用 `event.preventDefault()`，不再指定其他聚焦目标。
- 可点击、上传和弹出控件必须支持适用的 Tab、Enter、Space 与 Escape 路径。
- 异步加载提供状态语义；当前路由懒加载使用 `LazyLoad` 和 `role="status"`。
- 受控 Dialog 的关闭、取消和提交成功路径应共享一致的临时状态重置逻辑。
