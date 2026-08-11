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
- 知识库列表页与 Studio 使用相同的页面结构，通过 `PageTitle`、`PageHeaderActions`、`PageContent` 组合标题、工具栏与内容区；列表内容复用 `ResourceCard` 展示真实接口条目，列表卡片副标题和详情页身份区都根据 `segmentationMode` 展示“通用 / Q&A / 父子分段”，不使用固定的“空白知识库”；角标使用 `BookOpen` 与 Studio 的工作流图标区分，角标内图标统一为 `size-2.5`；卡片点击进入 `/knowledge-base/:id/documents`，操作菜单配置维护在 `features/knowledge-base` 内，只提供“编辑信息”和危险态“删除”，两项之间使用分隔线，禁止提供复制。
- 知识库创建和编辑复用 `KnowledgeBaseFormDialog`；编辑时回填名称、图标和描述，请求期间禁止
  关闭或重复提交。删除统一使用 `DeleteKnowledgeBaseDialog` 二次确认；请求期间禁止关闭，失败
  时保留弹窗，列表成功后刷新当前查询，详情成功后返回知识库列表。
- 工作流 RAG 知识库引用卡片和选择弹窗的右侧标签展示当前知识库真实的分段模式
  “通用 / Q&A / 父子分段”；该值每次从知识库目录的 `segmentationMode` 映射，不写死文案，也不冗余
  持久化到工作流节点配置。旧配置引用在当前目录不可用时显示“分段模式未知”。
- 文档页（`/knowledge-base/:id/documents`）使用真实分页接口，搜索、启停、删除、上传和手动重新索引都必须持久化，不得回退为本地 mock。手动重新索引先乐观显示“处理中”，请求失败时回滚；当前分页存在处理中条目时每 1.5 秒短轮询一次分页接口，全部进入终态后停止，轮询失败后停止自动请求并在工具栏提供重试入口，不为该状态单独接入 SSE。点击文件名进入 `/knowledge-base/:id/documents/:documentId`，该页展示真实分段、分页搜索、文档信息和当前分段参数；Header 通过 Feature 内的 `KnowledgeDocumentSwitcher` 搜索并切换同一知识库中的文档，候选列表使用 50 条一批的触底续载与虚拟渲染，请求失败后停止自动续载并提供重试入口。
- 知识库设置页将“索引模型”、入库侧“文本分段”与查询侧“检索”分区编辑。配置内容使用带最大宽度且相对页面标题保留左侧缩进的布局，每项采用固定宽度说明栏与自适应控件栏；只有分段模式、检索画像等枚举选择使用带边框的选项卡，普通 Select、Input 和 Checkbox 不增加外层卡片。嵌入模型复用 `GET /models/groups?modelType=embedding`，只允许选择已启用组中的已启用模型，Select 触发器和模型组标题统一复用供应商图标；保存模型组和模型稳定 UUID，失效旧引用保留并提示不可用，设置页提供 `/models?tab=embedding` 管理入口。保存分段配置只提升配置修订号并将旧文档标记为待更新，不在保存时覆盖已有 Chunk；只有用户明确点击“重新索引”时才使用当前配置替换该文档分段。最新索引失败时在设置顶部展示失败原因和“重新构建”入口，提交后轮询新代际状态；构建期间禁止重复提交。
- 文档分段列表的编辑入口从右侧以短过渡滑入内容面板，面板只编辑分段正文并保留取消、
  保存和 Escape 关闭路径，不混入上传、摘要、关键词等其他字段。内容表单使用统一 Zod、`useFormData`、
  `validateFormByZod` 与 `Form.Field`；保存成功后原位更新分段列表并关闭面板。面板在内容区右侧保留 8px 浮层间距，
  最大宽度 34rem，使用完整圆角、0.5px 低对比边框和 `shadow-lg` 表达层级；头部不加分隔线，元信息带 Grip 图标，
  其外层定位、视觉、滑入动画和 Escape 关闭统一复用 Web 公共 `FloatingSidePanel`；知识库召回测试的检索设置面板也必须使用该外壳，不单独复制面板样式。
  正文 Textarea 移除可见输入框外壳并与面板共用透明底色，底部操作栏保持紧凑。列表中当前编辑分段的
  Grip 和分段编号使用 `text-primary`，该区域同时是可键盘操作的编辑切换入口；面板打开时点击其他分段编号
  或卡片其他非操作区域都会直接重置表单并切换内容，外层面板保持挂载且不重放进出动画。Checkbox 位于卡片外且保持独立，
  卡片右上编辑、删除和启停工具栏必须停止点击冒泡；保存请求期间禁止切换。
- 添加文件固定使用“选择数据源 → 文本分段与清洗 → 处理并完成”三步。步骤 2 左侧选择“通用 / Q&A /
  父子分段”之一，并只编辑该模式允许调整的文档级分段与保守清洗配置；右侧始终保留按文件切换
  的预览区，列表和处理摘要使用模式值映射展示名称，不冗余保存 label。点击“预览块”后显示服务端
  用当前配置生成的临时块，配置变化时旧预览必须标记过期。左侧设置容器和右侧预览容器统一使用 `border-border/50`、0.5px 边框、`rounded-xl` 与 `shadow-xs`；嵌套的预览块降一级使用 `border-border/60`、0.5px 边框与 `rounded-lg`，Hover 时切换 `border-input-focus` 和完整内容卡片规格的 `shadow-lg`。字符数使用浅色 `bg-input/70`、低对比细边框的紧凑元信息徽标，禁止使用深色实心胶囊。预览区的标题、文件选择、计数和内容统一放在满高圆角容器中，头部固定、内容独立滚动；右栏外层使用紧凑的 16–20px 间距，头部使用 14–20px 内边距，内容区使用 16–20px 内边距，避免多层容器留白叠加；请求期间使用多组块标题和正文骨架展示加载结构。步骤 2 底部操作栏与步骤 1、步骤 3 一致使用 `border-border border-t` 顶部分隔线。清洗默认保留 URL、邮箱、编号、标点、
  段落、列表、表格与代码结构，不提供删除全部 URL 和邮箱的选项；预览和正式处理复用同一
  Parser、Cleaner 与 Chunker 配置解释。
  上传步骤不编辑“经济 / 高质量”、倒排 / 向量 / 混合方式或 `TopK`；索引与检索配置最多显示
  当前知识库配置的只读摘要和设置入口。步骤 3 的标题和每个文件状态必须消费服务端返回的
  `PROCESSING / READY / FAILED`，分别展示处理中、完成和失败语义；不得在上传接口返回后固定显示
  “嵌入已完成”。
  上传白名单与服务端解析能力保持一致，当前支持 PDF、Markdown、TXT、DOCX、PPTX、XLSX、CSV
  和 HTML；PDF 只支持文本型内容，不在 Web 端宣称具备 OCR。
- 召回测试在知识库未选择嵌入模型时禁用测试按钮，并在输入区提供前往知识库设置的明确入口；
  服务端必须区分未配置模型、索引构建中、索引失败和知识库不存在，不能统一返回模糊错误。
- 召回测试记录表不使用选中行背景高亮，“来源文件”列展示本次命中的真实文件名而非知识库名称；
  每个召回分段单独占一行，查询、来源文件、分段编号与时间按行完整展示，不把多个命中塞进同一
  单元格；数据单元格统一垂直居中，文件类型图标相对“文件名 + 分段编号”组合居中；来源与结果卡
  统一复用 `DocumentFileTypeIcon` 展示具体文件类型图标。查询文本和文件名
  必须完整换行展示，不使用省略号或 `+N` 隐藏；结果卡明确分离排名、
  来源文件、分段编号与当前画像的最终得分，Accurate 显示“重排得分”，Fast 显示“RRF 融合得分”，
  并展示 BM25 与 Dense 的候选排名；两路原始分数放在排名诊断的悬浮说明中，不把 RRF 或 Dense
  原始分伪装成相关概率。结果头部显示实际生效的画像路径。来源区域按
  “来源文件 → 文件类型图标 → 文件名”排列；长分段默认
  完整展开，并允许通过遵循 reduced motion 的高度过渡
  手动收起，文件名链接到对应文档详情。
- `PageTitle` 支持可选 `subtitle`，样式为 `flex items-center space-x-0.5 text-sm font-normal text-muted-foreground mt-1`；各 feature 的工具栏只负责业务控件，外层间距由 `PageHeaderActions` 统一提供。
- 资源操作菜单统一使用 `components/action-menu-content` 渲染操作项、分组与危险状态，调用方只负责提供 Dropdown 触发器和操作项配置。
- 操作项使用稳定的 `id`，通过 `separatorBefore` 分组；危险操作设置 `destructive`，暂不可用的操作设置 `disabled`。下拉操作项默认只显示文字，不提供通用 `icon` 配置；只有用户或业务规范明确要求时才单独实现图标。
- 卡片的整面导航由 `ResourceCard` 内部链接承载，菜单触发器与链接保持为并列交互区域，禁止把按钮嵌套到链接中。

## 插件 Marketplace

- Marketplace Header 的文档图标在新窗口打开 `/docs/plugin`；其左侧固定提供插件发布入口，点击
  打开 `PluginPublishDialog`；发布表单
  上传 CLI `pack` 生成的 `.tgz` 插件包，并填写公开范围和可选版本说明。package 名和版本以包内
  Manifest 为准；平台 UUID 由服务端生成，作者取当前认证用户，均不允许在表单或 CLI 中覆盖。Header 默认通过 `src/api/plugins` 调用真实
  `/plugins/publish`，同时允许用 `onPublish` 覆盖提交实现。请求失败由统一 API Client 展示错误并
  保留表单，成功后清空临时文件和参数并关闭 Dialog。
- 插件列表与详情页复用 `PluginMarketplaceHeader`；列表把 Header 放入可折叠 Hero，详情页作为
  不渲染首页侧栏的独立全屏页面，只使用固定在页面顶部的 Header，不复制搜索、品牌标识或发布入口。
  详情页滚动容器与插件信息摘要区统一使用和输入框内部一致的 `bg-input` 页面底衬；Header 外层
  吸顶容器保持透明并继承该底衬，背景、边框和模糊效果只由 `PluginMarketplaceHeader` 自身承担。Markdown
  正文区使用全宽 `bg-background`，并以 `border-border` 与顶部灰色区域分隔。
  详情页 Header 的 Logo 区域 Hover 或键盘 Focus 时切换为返回箭头，点击返回 `/plugin`；Logo 与
  箭头使用透明度和轻量位移过渡，并为减少动态效果偏好关闭过渡。列表页继续显示原 Logo，不启用该
  返回态，标题区域也不触发图标切换。
  插件信息摘要和 Markdown 主内容都使用居中的 `max-w-5xl` 内容宽度，避免宽屏下正文与版本侧栏
  过度分散；两区保持相同的左右内容轴。
  详情链接统一由 `getPluginDetailPath` 使用平台 UUID 生成。
- 插件列表卡片的描述默认以无渐变的两行截断文本展示；只有整张卡片 Hover 或 Focus-within 时才
  通过透明度交叉过渡切换到底部渐隐版本，减少动态效果偏好下关闭该过渡。不得让渐变遮罩在卡片
  默认态持续生效。插件列表项不维护分类字段，列表卡片不显示分类角标。Hero 承载品牌、搜索、发布
  入口，以及“所有集成 / 已安装 / 已使用 / 我发布的插件”四个原始白色选中标签；不得替换为正文
  灰色 Select 工具栏。列表使用真实 `GET /plugins` 数据，搜索覆盖名称、描述、package 名与上传作者；搜索或筛选变化后重置游标并从首批
  重新加载。
- 插件详情摘要中的插件标识使用 `size-20`、`rounded-2xl` 和 0.5px 语义边框，不添加阴影；名称使用
  `text-2xl leading-8 font-semibold`，版本标签固定为 `h-6 px-2 text-xs`。描述使用
  `text-sm leading-5`，作者、插件短标识和安装量使用紧凑的 13px 元信息行，安装量前保留下载
  图标；认证发布者在名称后使用主题色认证标识。不得直接复制外部项目的字体别名或硬编码颜色。
- 插件详情的安装主操作使用固定 `h-9` 的 `gap-0.5 overflow-hidden rounded-lg` 分体结构，两侧子控件均固定为 `h-9`，
  并分别使用 `rounded-l-lg` 与 `rounded-r-lg`，消除 Button 与 Select 默认盒模型和透明边框造成的视觉高度差。两个子控件各自使用
  `bg-primary`，中间保留 2px 页面底色间隔，不使用边框模拟分隔；Hover 与 Focus visible 使用标准 `bg-primary/85`。左侧保持 `w-[135px]`，未安装或有更新时
  使用主按钮，已是当前版本时使用非禁用态的主色状态区显示“已安装”或“已禁用”，不得借用主按钮 Disabled 的浅色视觉。
  已安装时，右侧使用 `size-9` 的 Select Trigger，选项提供启用或禁用以及卸载；
  卸载必须二次确认。插件详情返回的 `usage.workflowCount` 大于 0 时，卸载弹窗必须说明引用数量并禁用
  确认按钮；服务端仍需在删除前重新校验引用，不能只依赖前端状态。详情摘要不提供独立下载按钮。
- 列表卡片、详情页和版本历史的安装/切换操作统一打开 `PluginInstallationDialog`。权限只能使用服务端返回的
  目标版本 Manifest 权限，不允许前端自行补充；弹窗展示权限名称与风险说明，版本切换时对安装版本尚未
  授予的权限标记“新增权限”，无额外权限时也要明确说明。版本切换必须展示影响提示，并在请求中显式提交
  `acknowledgeVersionChange=true`；权限弹窗内不直接展示版本影响，用户确认权限后再打开独立的版本
  切换确认 Dialog。第二个 Dialog 的外框、标题和操作按钮沿用标准样式，只有版本影响内容区使用 warning
  边框和浅色背景；详情场景应同时展示工作流和草稿引用数量。取消后返回原权限弹窗，只有再次确认才提交请求。确认请求期间禁止关闭或重复提交，成功后
  原位更新安装状态。插件安装升级后，编辑中的工作流在下次加载 Catalog 时使用当前安装版本；
  已发布、历史版本及已创建的运行继续使用各自的精确插件锁。
- 插件详情正文与版本更新日志保存为 Markdown，并通过 `fumadocs-core/content/md` 渲染，外层使用
  已接入的 `@fumadocs/tailwind/typography` `prose prose-sm` 样式，以 14px 作为基础字号。页面侧栏只
  展示最新版本；完整版本记录与 Markdown 更新日志放在版本历史 Dialog 中，版本记录表格复用 UI
  `Table`。
- 版本历史 Dialog 与工作流测试运行面板复用 Web 公共 `PanelTabsList` / `PanelTabsTrigger`，使用
  透明背景、底部分隔线和主色选中下划线，不使用默认胶囊选中态。版本表格沿用应用日志表格样式：
  不增加带边框的表格外壳，表头使用 `bg-input`，首尾表头单元格使用 `rounded-l-lg` /
  `rounded-r-lg`；数据行只保留 `border-border` 行间分隔线和轻量 Hover。表头与数据行继续使用 UI
  `Table` 默认 `h-9` 高度。版本列表不显示分页器，在固定高度的单一滚动容器中按批次触底续载，
  表头保持吸顶；更新日志页签使用更大的响应式内容视口，优先占 70svh、最高 36rem，并在内部
  滚动，不沿用版本表格的五行可见高度。
  版本表格最后一列提供指定版本安装入口；行版本与当前 `installation.versionId` 一致时不显示安装按钮。

## 列表与表格加载方式

- 数据列表和表格必须在“可见分页器”与“滚动续载”之间二选一。没有分页器时统一使用滚动续载：
  首屏只加载一个批次，在单一滚动容器接近底部时自动加载下一批，禁止一次性请求或渲染全部数据，
  也不使用独立的“加载更多”按钮代替触底续载。
- 滚动续载容器必须有稳定的可见高度，长表格表头保持吸顶，并避免页面与表格双层纵向滚动。异步
  数据源必须展示首屏加载、续载中、续载失败重试和数据结束状态；续载失败后停止自动请求，用户
  主动重试成功后才恢复。切换搜索、筛选或数据源时清空旧游标并从首批重新加载。
- 使用分页器时继续复用 `@ai-workflow/ui/components/pagination`，分页器独立于滚动区域，不得同时
  监听触底续载。

## 模型管理

- `/models` 的业务界面放在 `features/models`，请求契约与调用统一放在 `src/api/models`；页面从
  `GET /models/groups` 加载当前用户配置并管理请求状态和弹窗开关，不再生成客户端 ID 或内置
  默认模型组。模型组表单继续使用统一 Zod、`useFormData` 和 `validateFormByZod` 方案。
- LLM 节点模型选择器复用 `GET /models/groups?modelType=chat`，在 Web 中只保留已启用的模型组和
  已启用的对话模型；Select 以模型组为分组，组标题显示供应商图标与模型组名称，模型项显示
  模型名称与 `CHAT` 标签。节点配置写回 `groupId`、`configuredModelId` 与可选模型参数；右侧
  设置入口打开模型参数 Dialog，不得编辑模型组。参数能力、初始值、字段可见性与保存前清理由
  `model-parameter-strategies.ts` 统一管理，Dialog 不按供应商添加条件分支。DeepSeek 开启或沿用
  默认思考模式时不展示并清除 `temperature`、`topP`。参数 Dialog 的每个参数直接使用
  `Form.Field` 与策略默认值，不增加逐字段开关；Select、输入框、Slider 组合和停止序列操作区
  都占满字段整行。字段错误只在对应控件失焦或提交后展示；停止序列删除按钮默认使用弱化色，
  仅在 Hover 或键盘 Focus visible 时进入 destructive 状态。已选模型被停用或删除时保留节点
  原引用，并在 Select 占位文案中提示重新选择，字段下方不显示额外描述。模型 Select 与设置按钮只共用静态 `bg-input`
  底色，Hover / Focus 的背景和边框只反馈当前具体子控件，不改变整个组合容器。
  工作流编辑器通过共享模型目录上下文加载一次完整对话模型组列表，模型选择器与画布摘要共用
  同一份数据和重试入口；画布将模型组名称、模型名称及供应商图标解析后注入 Nodes UI，不让
  Nodes UI 请求 Web API。LLM 画布摘要不展示 Prompt，并为加载中、未选择和失效引用保留明确状态。
  工作流知识库目录同样由配置表单与 RAG 画布摘要共用；画布把知识库名称和 API 图标解析后
  注入 Nodes UI，每个引用分别使用统一节点内容条目展示。配置表单与画布的知识库图标共同复用
  Nodes UI 的 `KnowledgeBaseReferenceIcon`，按场景使用默认或紧凑尺寸。
  子工作流字段同样由 Web 注入：`WorkflowStudioAppCatalogProvider` 懒加载且只请求已发布的
  Studio 应用，`SubWorkflowField` 单选目标后拉取发布契约（非草稿）；选择后通过配置面板
  `applySubWorkflowSelection` 同步 `config.workflow`、Start 输入绑定与 `Workflow.outputs`
  公开输出，禁止字段 `onChange` 用旧 node 覆盖变量。选择器排除当前应用，配置区在子工作流
  节点上置于输入变量之前。画布摘要直接读取持久化 `name` / `icon` 快照，图标复用 Nodes UI
  的 `WorkflowReferenceIcon`。
  LLM 配置的 Prompt 已替换为“上下文”消息编辑器；旧 Prompt 由 Core schema 自动迁移为 SYSTEM
  消息。消息支持 SYSTEM、ASSISTANT、USER 角色，卡片工具区只保留插入变量与删除，字段标题区
  提供新增消息；变量选择复用 Form 的 `NodeVariablePicker`，编辑核心复用 UI 的 `TiptapEditor`。
  变量在编辑器中显示为 token，持久化仍使用 `{{#来源标识.变量名#}}` 形式的纯文本模板。
  消息卡片沿用代码字段的 `rounded-lg` 轻量外壳与 36px 工具栏，默认使用 `bg-input` 并预留
  1px 描边；角色选择与图标按钮作为同高的内嵌控件，不显示独立输入框轮廓。角色 Trigger 为
  24px 高，菜单使用紧凑宽度、28px 选项与浅色交互背景，并保留 Select 原有的主色勾选标记。
  Hover 使用 `border-input-focus` 语义色，任一内部控件聚焦时切换 `bg-background`，并沿外边
  显示主色到信息色的流动渐变描边；动画必须遵循 reduced motion，错误态优先显示 destructive
  实体边框；校验文案切换时消息项只做位置布局动画，不缩放编辑卡片。上下文字段标题的新增
  按钮与输入、输出变量字段统一使用 Ghost `icon-xs`、弱化前景色和 16px Plus 图标。消息新增
  和删除使用 Motion，并保持至少一条消息。
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
  Key。对话模型的每个模型 ID 行在添加按钮前显示 Cable 图标按钮，通过
  `POST /models/test-model` 使用当前表单配置执行单模型流式探测；测试中禁用重复提交，成功和
  后端提取的核心错误均使用 Toast 反馈。嵌入模型不展示该流式对话测试入口。删除模型组需先
  展示确认 Dialog。
- 模型页工具栏左侧使用 `@ai-workflow/ui/components/tabs` 在“对话”和“嵌入”之间切换，
  右侧放置“新增模型组”并保持水平对齐；两类模型组使用相互独立的页面状态，当前分类由
  `tab=chat|embedding` 查询参数驱动。组与单模型启停使用服务端 UUID，前端可以先乐观更新，
  请求失败时恢复原状态；关闭模型组不得覆盖各模型的启用状态。

## 知识库文档表格

参考实现：`features/knowledge-base/components/document-table.tsx`、`document-action-menu.tsx`、`document-pagination.tsx`。

- 知识库文档的文件类型图标统一复用 `features/knowledge-base/components/document-file-type-icon.tsx`
  中的 `DocumentFileTypeIcon`，调用方按数据条件传入 `fileType`、`fileName` 或两者；PDF、Markdown、
  Word、PPT、Excel 与未知类型的图标映射及扩展名别名只在该组件内维护，图标资源统一使用
  `apps/web/public` 下对应的 SVG，不在表格、文档切换器和上传步骤中直接使用 Lucide 文件图标或
  重复类型分支。SVG 不增加浅色外围背景，知识库内的紧凑文档列表和选择器统一使用 20px 图标；
  文档数据尚未加载时使用同尺寸骨架屏，不用未知类型图标表达加载状态。
- 文档工具栏提供文件类型、排序、搜索和添加文件；文件类型默认“全部”，并与服务端实际支持的
  PDF / Markdown / TXT 保持一致。排序提供上传时间、召回次数、字符数和名称；查询变化后回到第一页，禁止只对当前页做本地筛选或排序。
  列表请求期间搜索框必须保持可输入和当前焦点，不得因 loading 切换为 `disabled`；旧请求通过 AbortController 取消。
- 文档表格的头部复选框只全选当前页，筛选、分页或每页数量变化后清空选择。当前页存在已选文档时，
  在分页器上方展示与分段列表共用的 `KnowledgeSelectionActions`，提供批量启用、禁用、删除和取消；
  批量启停与删除必须持久化，删除前必须二次确认，请求期间禁止重复提交、修改选择或触发行内操作。
- 文档详情的分段列表使用独立复选框列，头部复选框只全选当前页；状态筛选固定为“全部 / 已禁用 /
  已启用”并由服务端分页查询。分段正文卡片默认无边框，Hover、选中或内部聚焦时使用 `bg-input`
  以外的独立浅色交互背景 `bg-muted/60`；卡片与行间分隔线上下各保留 8px。右侧常驻状态在 Hover
  或内部聚焦时切换为编辑、删除与启停操作条。单项复选框中心与卡片第一行元信息中心对齐；分段
  启停必须持久化，不得只修改当前页本地状态。分段页状态筛选和搜索框与文档页工具栏保持相同的
  `h-8`、`rounded-lg` 和紧凑间距规格；筛选 Trigger 显示“字段名 + 当前值”，不得只显示当前值。
  当前页存在已选分段时，在分页器上方 `bottom-16` 居中显示批量操作浮层；浮层使用 `p-1`、
  `rounded-[10px]`、由 primary 与 background 混合得到的不透明淡蓝背景、低对比主色边框和 `shadow-xl`，
  不使用透明背景或背景模糊。数量徽标使用 `size-5`，启用、禁用、删除和取消按钮统一使用 `h-8`；
  普通操作 Hover / Focus visible 使用更深一级的 primary 不透明混合色，删除使用对应的 destructive
  不透明混合色。批量启用和禁用必须持久化，取消只清空当前选择；批量请求期间禁止重复提交和
  修改选择。
  分段详情首次加载时，左侧列表与右侧文档信息分别使用贴合真实行结构的骨架屏；分页、状态筛选或
  搜索触发新请求时，左侧立即以骨架替换旧分段，不显示加载文案或继续保留上一页内容，右侧已加载的
  文档信息保持稳定。
  分段正文只对无序/有序列表和单反引号行内代码应用 Tailwind Typography `prose` 富文本样式；
  标题、引用、粗体、链接、代码围栏等其他 Markdown 语法保持原始文本，不得按完整 Markdown 渲染。

### 页面高度与滚动

- 文档页根容器使用 `flex h-full min-h-0 flex-col overflow-hidden`，占满详情布局主内容区剩余高度，不在页面级滚动。
- `PageContent` 与 `DocumentTable` 沿 flex 链传递 `flex-1 min-h-0 overflow-hidden`；表格主体区域单独 `flex-1 overflow-auto`，行数超出时在表格内部滚动；底部分页器固定于表格外，不参与滚动。
- 详情布局主内容区默认 `overflow-auto`；需要表格内滚动的页面须用 `h-full overflow-hidden` 约束自身高度，避免整页与表格双层滚动。

### 列结构

- 使用 TanStack Table 管理列定义、排序、分页与行选择；表格设置 `minWidth` 保证窄屏时可横向滚动。
- 文档列展示名称、分段模式、字符数、分段数、召回次数、上传时间、状态、操作和 dot 菜单。
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

- 分页器使用 `@ai-workflow/ui/components/pagination`，独立于表格滚动容器，位于 `DocumentTable` 底部；支持上一页 / 下一页、点击「当前页 / 总页数」后整块替换为单个页码输入框跳转，以及每页条数切换，不展示数字页码列表。

## 应用 API 文档与密钥

- 应用详情的 `/api` 页面由 `features/app-api` 组合接口文档、发布状态、分享和 API 密钥管理；
  页面只负责传入应用 ID 与资源可用性，不在页面文件中维护请求状态或复制弹窗逻辑。
- 文档头部固定在详情页主内容滚动容器顶部，使用不透明背景和明确层级遮挡滚动正文；头部展示
  API 服务地址和发布状态。存在已发布版本时使用 success 语义色显示“运行中”；尚未发布时使用
  primary 主题色显示“未发布”，不得用错误态或警告态表达未发布。
- API 密钥列表使用 `@ai-workflow/ui/components/table`。服务端只返回 `app-`、固定星号和末五位
  组成的掩码，列表不得提供复制入口，也不得通过 Tooltip、DOM 属性或本地状态保留完整密钥。
  创建按钮在请求期间先展示 loading，请求成功后才打开一次性密钥弹窗；完整密钥仅在该弹窗
  中允许复制，关闭后立即清理前端状态，后续无法再次查看。创建结果弹窗叠加在密钥列表 Dialog
  之上，打开或关闭时不得联动关闭列表 Dialog。删除入口必须先在列表 Dialog 之上叠加确认
  Dialog，确认成功后才移除列表项；删除失败时保留确认 Dialog，关闭确认 Dialog 也不得关闭列表。
- 分享设置通过独立 Dialog 开关。启用后生成 `/share/api/:shareToken` 地址并允许复制；公开页面
  只渲染接口文档正文，不渲染应用详情页的 API 地址、状态、分享和密钥头部。
- 工作流执行接口的 OpenAPI Request Body 必须根据服务端返回的发布版本 Start 输入契约动态生成：
  每个输入变量直接作为 JSON 顶层字段，展示真实 Key、string / number / boolean / json 类型、
  必填项、说明和默认值，禁止重新引入固定 `input` 包装。当前执行接口使用当前部署版本契约；
  指定版本接口以 `oneOf` 列出各历史发布版本契约，并明确版本 ID 与 schema 的对应关系。公开分享
  页面复用同一动态文档生成逻辑。Authentication 必须说明 API Key 与应用绑定；指定版本接口前
  使用 UI Table 独立展示版本号、名称、UUID、当前版本标记与复制入口，Path Parameter 只展示
  当前版本 UUID 示例，不再把全部 UUID 作为 enum 重复渲染成长列表。Request Body 不展示或复制
  TypeScript Definitions；每个 Start 输入字段在 Key 后直接显示契约中的 `dataType`，字段说明区域
  展示变量显示名称及描述，不得使用显示名称覆盖类型位置。执行接口文档必须说明首个
  `workflow_started` SSE 事件的 `data.id` 即 `runId`；获取执行情况的 Path Parameter 同时说明
  该值也可从运行日志接口响应的 `data.items[].id` 获取。上述事件名、字段路径、`runId` 和接口
  路径在可见说明中统一使用 Markdown 行内代码样式。

## Docs 文档

- `/docs` 保留 Fumadocs MDX 的 Vite 编译能力，但展示组件统一由 Web 公共
  `src/components/mdx.tsx` 提供；不得直接使用 `fumadocs-ui/mdx` 默认映射、`fd-*` token 或由
  第三方 `prose` 规则控制视觉。
- 标题、正文、链接、列表、引用、代码、表格与图片统一使用项目语义 token。页面使用 `bg-input`
  底衬，Wiki 外壳使用 `bg-background`、0.5px `border-border`、圆角和低对比 `shadow-xs`；桌面端
  固定显示左侧菜单，移动端切换为横向菜单。菜单从 Docs 子路由元数据派生，激活项使用主色浅背景；
  链接的键盘焦点通过内部背景与文字变化表达，不使用 ring，站内 Markdown 链接使用 React Router
  导航且不刷新页面。正文和列表以 16px 为基础字号、32px 为行高；导航菜单项固定 32px 高，
  以 14px 为基础字号，
  各级标题与代码、表格文字按内容层级递减，避免文档页沿用业务面板的紧凑字号。文档品牌区复用
  Web 公共 `/logo.svg`，不得以 Lucide 图标替代项目 Logo。未激活菜单 Hover 时只切换背景，文字
  继续使用 `text-muted-foreground`，不得加深为正文色；激活项保持主色文字。
  MDX 代码高亮使用 Shiki 的 `catppuccin-latte`（亮色）与 `catppuccin-mocha`（暗色）主题，
  代码块外壳继续由 Web 的 MDX 映射控制。

## 应用调用日志表格

- 应用详情的 `/logs` 页面只负责标题与资源可用性编排；筛选区、数据状态和表格统一放在
  `features/app-logs`，不得复用知识库的 `DocumentTable` 或在页面内复制表格结构。
- 筛选区复用 UI `Select` 和 `Input`，提供运行状态、时间范围和用户/追踪 ID 搜索；默认查询过去
  7 天。日志只展示已发布版本产生的 API 与子工作流调用，不混入编辑器测试运行。
- `AppLogTable` 复用 UI `Table` 与 TanStack Virtual。表格容器最大高度为 560px，表头固定，主体
  在单一容器内滚动并在最后一个虚拟行可见时按 opaque cursor 自动续载；加载失败后停止自动续载，
  由表格内重试按钮恢复。
- 表格不使用外边框或卡片边框，仅保留数据行之间的细分隔线；表头使用 `bg-muted` 与正文区分。
  列固定为开始时间、状态、运行时间、用户和触发方式，用户显示 `UserAvatar` 与昵称，触发方式区分
  “API 调用”和“子工作流调用”。
- 状态使用 8px、`rounded-[3px]` 的语义色方形指示器，带语义色细边框、40% 语义色背景和项目标准 `shadow-xs`；
  指示器与文字使用 `gap-1.5`，后接 `text-xs font-semibold uppercase` 英文状态文字。Success 使用 success，Running 使用 primary，
  Queued 使用 warning，Failed / Timed out 使用 destructive，Cancelled 使用 muted 语义色。
- 日志详情浮层头部不使用下边线；“按此参数运行”入口紧跟标题，使用弱化文字色的 Ghost 线框
  Play 图标，不显示主色实心底板；关闭按钮保持在头部最右侧。

## 详情页布局

- 应用与知识库详情页复用 `components/detail-layout`，统一提供返回链接、左侧 `LayoutSidebar` 与右侧内容容器；页面通过 `backTo`/`backLabel` 设置返回目标，通过 `resourceIdentity` 插槽注入各 feature 的资源标识组件。
- 资源标识区使用 `components/resource-identity` 封装图标、标题、类型标签与右侧 `actions` 插槽；通用操作菜单触发器使用 `components/resource-action-menu`，各 feature 在 `AppDetailIdentity`、`KnowledgeBaseDetailIdentity` 等组件中组装业务操作项并注入插槽。
- 侧栏外壳固定 `w-60`，外层使用 `h-svh overflow-hidden p-1` 的满高 flex 容器，保证底部账户菜单在页面切换时坐标不偏移。
- 侧栏底部账户菜单的触发区域按头像与用户名内容宽度收缩，不占满侧栏；用户名使用 `pl-2` 与头像保持间距，Hover、Focus、Active 和展开态背景只覆盖该内容区域。
- 详情页导航从对应父路由子项的 `handle.meta` 派生，通过 `router/navigation` 的 `getNavigationItemsFromRoute` 生成，不得在侧栏复制另一份导航配置。
- 详情页侧栏导航项连续排列，不在导航项之间添加分割线。
- 详情页侧栏顶部使用 `w-fit self-start` 的返回按钮，显示 `< / {列表页名称}`；Hover 和 Focus 背景只覆盖内容区域，不铺满侧栏。
- `DetailLayout.sidebarFooter` 用于详情侧栏底部、账户菜单上方的业务信息区；知识库在这里展示真实
  文档数、去重后的关联应用数和 API 文档入口，不把该区域复制进通用账户菜单。
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
- 工作流操作栏的“发布”使用右对齐 Dropdown 展示当前发布状态和相对时间；尚未发布、加载中与
  发布中必须有明确文案和真实禁用态。发布操作使用当前画布快照，成功后更新顶部已发布状态，
  同时支持 `Command/Ctrl+Shift+P`，不得在弹窗内保留硬编码发布时间。弹窗状态标题使用 14px，
  发布时间或状态详情使用 16px。
- 工作流“版本历史”使用现有右侧辅助面板展示纵向时间线，面板副标题说明发布版本仅可查看、命名和
  恢复至草稿，历史版本不可回退，外部 API 始终接入当前最新发布版本；顶部固定为“当前草稿”，发布版本按
  版本号倒序显示名称、创建时间与创建人，首项标记“最新”。当前草稿或当前恢复到画布的版本使用
  主色浅背景表示选中；点击版本条目与 dot 菜单中的「恢复」等效，写回画布；dot 菜单只保留“恢复 /
  命名 / 删除”，删除与普通操作分组，当前选中版本的删除入口必须真实禁用，不展示升级、导出 DSL、复制
  ID 或其他操作。条目使用
  `rounded-lg p-2`，时间线圆点 `size-2 border-2` 置于 `h-5 w-[18px]` 容器，标题行 `h-5`、
  `text-[13px] font-semibold`，元数据 `text-xs text-muted-foreground`；“最新”徽章使用
  `h-5 border-primary/40 bg-primary/5 text-primary`。
- Web 内的紧凑操作提示统一复用 `components/tooltip.tsx` 的 `Tooltip`，且只在 Hover 时
  展示；按钮获得键盘焦点、被点击或保持选中状态时不单独展示提示。工作流右上操作栏直接
  使用通用 Tooltip 并显示在按钮下方；底部画布工具栏由 Feature 内的 `ToolbarTooltip`
  封装文字与快捷键键帽，提示显示在按钮上方。
- 节点卡片、添加节点面板和 MiniMap 的节点标识色通过
  `@ai-workflow/nodes-ui` 的 `getNodeThemeColor(type)` 获取，不在 Web 组件中复制
  `NODE_THEMES` 或固定使用主色。
- 画布 Header、节点选择器、配置面板、下一步、检查清单和运行追踪等 HTML 节点标识位统一使用
  `@ai-workflow/nodes-ui` 的 `NodeIconBadge`；插件图标应铺满 Badge，禁止手写主题色容器后再缩小嵌入插件图片。
  MiniMap 位于 SVG 上下文，插件图片必须使用 SVG `<image>`，不得把 `NodeIcon` 生成的 HTML `<img>` 放入 SVG。
- 测试运行的节点状态直接透传给 Nodes UI：`RUNNING` 在 Header 右侧显示蓝色 loading，并用
  primary 边框标记当前运行节点；`SUCCEEDED` / `FAILED` 分别使用 Nodes UI 的成功、失败图标
  和同色边框。Web 不复制图标、色值或按节点类型增加状态分支。
- 测试运行期间连线按两端节点运行态着色，颜色与节点边框一致：目标节点 `RUNNING` 时使用
  `primary` 流动虚线；两端均 `SUCCEEDED` 时使用 `--workflow-node-success`；目标
  `FAILED` 且上游已执行时使用 `--workflow-node-failed`。未执行到的分支保持默认边色；运行态
  优先于节点 Hover 高亮，动画遵循 reduced motion。
- 测试运行推进到完全位于视口外的节点时，画布保持当前缩放并以动画将该节点居中；节点已在
  视口内时不自动平移，避免打断用户正在查看的区域。
- 顶部“测试运行”按钮空闲时使用 Play 图标，通过 `activeAuxiliaryPanel='test-run'` 打开与系统变量、
  环境变量和检查清单共用外壳、位置、尺寸与切换状态的辅助面板，不直接发起请求，也不得复用
  节点配置面板。面板从 Start 的 `node.outputs` 生成输入表单，点击“开始运行”后才提交当前快照和
  输入。运行中取得 runId 后顶部按钮切换为 Pause 图标与“暂停运行”，暂停请求期间显示 loading
  与“暂停中”。创建请求尚未返回 runId、重复暂停或暂停请求处理中必须使用真实禁用态；`Alt+R`
  复用打开面板/暂停逻辑；画布右键「测试运行」切换到该辅助面板，节点右键「运行该节点」则打开
  配置面板内的单节点测试浮层，不切换到完整测试运行辅助面板。
- 测试运行辅助面板内容使用“输入 / 结果 / 详情 / 追踪”Tabs。详情只组合本次 Run 的输入、输出和当前
  持久化字段形成的元数据，不模拟 token 等尚未记录的数据；追踪使用浅灰底衬，不展示独立的整体
  运行状态卡，节点严格按后端 `traceNodeIds` 排列，不按画布拓扑补齐未执行节点，并在行尾分别展示
  耗时与状态。节点列表复用 Core 节点定义与 Nodes UI 图标/主题色，默认全部折叠，每个节点展开后
  固定展示“输入 / 输出”两块；`executionKey`、`attempt` 等服务端调度与重试字段不作为业务数据
  展示。展开按钮使用 `aria-expanded` / `aria-controls` 保留披露语义，内容通过 Motion 做高度与
  透明度动画，箭头同步旋转并遵循系统 reduced motion。追踪项保持背景色不变，默认使用
  `shadow-xs`，Hover 只通过 `shadow-md` 提升层级，并使用 ease-out 阴影过渡与 reduced motion。
  节点状态与耗时来自 Run 的 `nodeStates`、NodeRun 和 `traceNodeDurations`；`RUNNING` 节点只展示
  Loading 状态图标，不显示耗时或占位符，成功、失败、超时和暂停后的已追踪节点都必须显示固化
  耗时，Start/End 等本地控制节点也不例外。测试输入中的 JSON 字段，以及结果、详情和
  追踪中的 JSON 数据块统一复用 UI `CodeEditor` 并设置 `language="json"`；输入保持受控可编辑，
  运行快照使用只读模式，不回退为 Textarea 或 `<pre>`。面板内容保持与节点配置一致的紧凑密度：
  表单与 Tab 内容使用 12px 垂直间距和紧凑按钮；JSON 输入及只读快照使用固定紧凑高度并在内部
  滚动；追踪节点头使用 32px 高度、20px 图标，元数据与状态摘要使用 13px 正文，不使用大卡片
  字号或为短内容预留大面积空白。详情元数据使用无边框、无背景和无阴影的两列 `dl`，标题与
  字段名使用弱化文字色；标签列按内容收缩，优先保证追踪 ID 和运行 ID 在标准面板宽度内单行
  展示，只在面板被压缩时于值列内安全换行。结果页状态摘要使用语义色浅背景与同色实体边框：
  成功为 success、运行中为 primary、排队为 warning、失败和超时为 destructive、等待和取消为
  muted；状态文字与图标使用对应语义色，状态变化只过渡背景和边框。
- 运行历史与测试运行使用同一个画布辅助面板外壳。历史列表按运行时间倒序展示状态、触发方式、
  运行时刻、执行人与相对时间，条目整行支持鼠标和键盘进入详情；加载、失败重试、空状态和游标
  继续加载均在面板内完成。进入详情后提供明确返回入口，并复用 Feature 内 `WorkflowRunTabs`
  展示“结果 / 详情 / 追踪”，不复制运行结果组件，也不展示测试输入表单；追踪节点必须使用后端
  返回的运行版本 `definition`，不得使用当前草稿节点替代历史快照。
- 工作流面板内的下划线标签栏统一复用 Feature 内的 `WorkflowPanelTabsList` 和
  `WorkflowPanelTabsTrigger`，并继续由 UI `Tabs` / `TabsContent` 提供 Radix 交互语义；节点配置的
  “设置 / 上次运行”和测试运行的多标签使用同一组件，不分别手写静态下划线或覆盖胶囊式 Tabs。
- 工作流“检查清单”使用画布内浮动辅助面板，不使用 Sheet/Drawer 或全屏遮罩；打开和关闭时
  通过 Motion 做轻量的位移、缩放与透明度过渡，不播放从页面边缘滑入的抽屉动画。清单按节点
  分组展示 Core 校验、必填配置和运行前连线问题，节点图标和颜色继续复用 Nodes UI。问题项
  Hover 或键盘 Focus visible 时显示“前往修改”，点击后通过现有 `openNodeConfig` 打开对应节点
  配置面板，清单与配置面板允许同时显示。检查清单存在问题时禁止发布：点击发布或快捷键时用
  Toast 提示并打开检查清单，不在发布菜单内写静态拦截文案，也不因此禁用测试运行。
- 右侧节点配置面板放在 `features/workflow/components`，由工作流业务功能管理节点选择、
  面板开关和配置校验；配置字段列表使用
  `@ai-workflow/form/components/node-config-fields` 的 `NodeConfigFields` 渲染，不在 Web
  中复制字段类型分发逻辑。普通字段和平台复杂字段都由 Core `NodeType.form` 按 `field.ui`
  声明；字段 renderer 可以接收统一透传的上游变量和嵌套错误，依赖 Web 数据时通过字段
  `renderers` registry 注入。只有无法按顶层配置字段拆分的完整动态配置才通过 Core
  `NodeType.configRenderer` 声明，由
  `@ai-workflow/form/components/node-config-section` 的 `NodeConfigSection` 从注册表选择
  受控 renderer；Web 只透传 config、错误、上游变量和变更回调，不按节点类型分支。
  依赖 Web API 的业务 renderer 由 `features/workflow/node-config-renderers` 集中注册；字段级
  renderer 通过 `NodeConfigFields.renderers` 注入，完整表单通过 `NodeConfigSection.renderers`
  注入。完整表单 registry 由 `WorkflowEditor.configRenderers` 接收并透传，当前没有第一方完整
  表单时不保留空的 Web registry。LLM 已通过 `llmNodeForm` 拆为两个字段：模型选择器使用
  `LLM_MODEL` 并留在 Web，上下文使用 Form 内置的 `CONTEXT_MESSAGES`；模型 API 不下沉到 Form。
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
  Code 的执行器输出由 Core 从 `main` 直接返回的对象字面量 Key 派生；配置面板在代码变更时
  同步 `node.outputs`，并把这些输出作为禁用行传给 Form，禁止手动修改或删除。源码暂时存在
  语法错误时保留最后一次有效输出，Key 变化后再替换，Web 不运行代码或判断实际返回值类型。
  HTTP 已按字段级 form 组合 URL、Method、Headers、Params、Body 和连接超时，不再使用整节点
  renderer；Core 固定输出的完整响应变量 `response` 在输出区显示为不可修改、映射或删除的禁用行，
  普通附加输出仍可新增。Condition 也通过 `conditionNodeForm` 和 Form 内置的 `ConditionBranchesField` 编辑
  IF / ELIF / ELSE 分支，不再使用整节点 renderer；条件两侧复用 Form 的
  `VariableValueEditor`，支持直接值、完整上游变量引用、系统变量和环境变量引用，比较运算符和同一分支统一使用的
  AND/OR 逻辑关系都来自 Core 公共契约。合法字段值写回节点后，Web 通用 `applyNode` 链路
  负责清理失效端口 Edge 并刷新动态 Handle。
  当前节点可引用变量由 Web 合并 Core `SYSTEM_VARIABLE_DEFINITIONS`、工作流环境变量与根据执行 Edge 收集的所有可达
  上游节点 `node.outputs`，并将来源、变量名称和数据类型作为结构化候选传入；输出端口只用于
  连线与执行分支，不作为变量候选，也不与同名输出变量绑定。Core 固定输出通过通用配置面板
  透传给 Form 并显示为禁用行，普通输出仍可新增。Form 的变量选择器按节点分组，支持搜索并
  显示变量类型，普通节点输入区与 End 输出区
  共用该交互。系统变量以 `sys / <key>` 独立分组，持久化为 `scope: 'system' + key`；节点中
  自定义的同名输出仍以“节点名称 / 输出 Key”展示并保存 `scope: 'node'` 引用；环境变量以
  `env / <name>` 独立分组并保存稳定 `variableId`，当前不包含嵌套 Path 选择。环境变量辅助面板的
  新增按钮是受控 Popover 的稳定 Trigger，新增和编辑表单均从该按钮左侧展开；浮层顶部通过运行时
  计算的对齐偏移与辅助面板顶部保持一致，不写固定位置值；不得使用带全屏遮罩的 Dialog 代替，也不得
  让编辑入口生成另一套浮层表单。环境变量列表使用独立于系统变量的卡片组件：顶部展示紫色 ENV
  图标、变量名、类型与 Secret 锁标识，第二行展示值；仅在存在描述时增加分隔线与浅色描述区。
  Hover 时整张卡片统一切换浅色背景，描述区切换为透明以继承卡片背景，不得保留默认底色。
  编辑和删除使用 `icon-xs` Ghost 按钮与 14px（`size-3.5`）图标；编辑 Hover / Focus visible 使用
  `bg-button-secondary-bg-active`，删除 Hover / Focus visible 使用 destructive 背景与文字色。
  环境变量表单的 Number 值使用单行数字 Input，String 与 Secret 值使用 Textarea；Secret 在列表中
  固定显示为 `********`，从服务端读取的 `********` 是保留原值的占位符，编辑时只有输入其他值才会替换密钥。Secret 说明复用
  Web 自有的紧凑 Tooltip；该 Tooltip 通过 Portal 渲染，避免被表单 Popover 的滚动边界裁剪，
  并保持白底、细边框、无箭头的样式。
  Condition 画布摘要通过 Nodes UI 的 `resolveVariableReferenceDisplay` 消费 Web 根据当前
  React Flow 节点生成的来源名称与变量名，显示文案必须与 Config Form 的“来源名称 / 变量名”
  一致，不得直接展示持久化 `nodeId`；源节点实例名称变化时摘要同步更新。
  名称、描述、`config`、`inputs`、
  `outputs` 统一由 `useFormData` 管理，并通过对应 Zod schema 与 `validateFormByZod`
  校验后即时写回节点。配置面板初始化 `form.config` 时先使用当前节点 Core schema
  解析原配置，让 schema 默认值和历史数据迁移在字段 UI 中立即生效；解析失败时保留原始编辑值供
  用户修正。动态业务数据不得在 Web 重组节点字段配置；对应字段的
  `ui`、标签、默认说明与必填约束由 Core `NodeType.form` 声明，Web 通过
  `features/workflow/node-config-renderers` 中的字段 renderer 消费 Context 或 API 数据。
  RAG 的 `config.query` 位于知识库选择之前，通过 Form `VARIABLE_TEMPLATE` 字段复用 LLM
  上下文的 Tiptap 编辑卡片；Header 固定显示 `QUERY`，只保留变量按钮，不提供标题新增、角色切换
  或删除。知识库选择通过 Core `KNOWLEDGE_BASE` 字段契约进入通用分发，Web `KnowledgeBaseField` 从
  `WorkflowKnowledgeBaseCatalogProvider` 获取真实知识库目录，以“+”打开多选 Dialog；
  Dialog 点击整行切换选中态，底部显示选中数量，确认后整体写回。已选知识库按配置顺序
  显示紧凑卡片，卡片容器与 Start 输入变量条目统一使用 0.5px 低对比边框、`shadow-xs` 默认
  阴影和 `hover:shadow-md` 反馈；默认显示召回策略标签，Hover 或内部聚焦时使用
  `bg-background` 操作区覆盖标签位置，并切换为弱化色编辑和危险色删除操作，不给按钮增加常驻
  底板。阴影使用明确的 ease-out 过渡并遵循 reduced motion；卡片增删使用 Motion 的位置与
  透明度动画，Motion 外层不得使用 `overflow-hidden` 裁切卡片阴影。字段标题必须交给
  `Form.Field` 的 `label` 与 `required` 渲染，不手写必填星号；当前不可用引用继续保留。
  知识库标题操作区只保留新增按钮；Core `ragNodeForm.topK` 紧随知识库字段，以通用 SLIDER
  renderer 渲染独立的“召回设置”字段，界面组合进度滑条和右侧数字输入框，Web 不在知识库
  renderer 内维护 `topK` 输入。
  Core 与 Form 不依赖 Web 数据，`NodeConfigFields` 不增加控件专属参数。
- 节点配置面板头部直接复用 `@ai-workflow/nodes-ui` 公开导出的 `NodeHeader`，通过
  `className` 适配面板间距，通过 `actions` 依次组合 `icon-xs` 单节点运行/暂停按钮、语义色短竖线
  与 `icon-xs` 关闭按钮；空闲 Play 只打开配置面板内的单节点测试浮层，运行中显示 Pause，不在面板内
  发请求。配置 Tabs 为「设置 / 上次运行」；「上次运行」展示该节点最近一次 NodeRun 的状态摘要、
  输入/输出 JSON 与元数据，不模拟尚未持久化的 token。单节点浮层标题为「测试运行 {节点名}」，
  绝对覆盖整个配置面板，输入校验与「开始运行」按钮对齐完整测试运行表单密度。不在 Web 层复制
  节点标识色或图标。节点实例名称通过 `NodeHeader.label` 插槽渲染原生
  `Input`，描述也使用原生 `Input`；二者修改后即时进入编辑器状态和保存链路，画布节点同步
  展示实例名称。名称清空时回退到带实例编号的默认名称（首个为类型 label，后续为
  `label 2`、`label 3`），描述允许清空。两个内联输入均覆盖通用 Input 的边框、背景、圆角、
  阴影、内外边距和 Hover / Focus 容器状态，只通过文本光标表达正在编辑，使非编辑外观与
  普通文字一致；节点说明输入使用 `text-xs leading-4`，与下方标签栏保留 `mt-2`，避免在
  紧凑面板头部形成大块空白。
- 节点配置面板通过 Motion 的 `AnimatePresence` 管理开关动画：打开时从右侧滑入并淡入，
  关闭时向右滑出并淡出；面板使用稳定 key，切换节点只更新配置内容，不重复播放开场动画，
  退出动画结束后必须卸载配置面板及其中的编辑器；并通过
  `MotionConfig reducedMotion="user"` 遵循系统的减少动态效果设置。面板根容器必须同时使用
  React Flow 的 `nodrag`、`nowheel` 和 `nokey` 隔离标记，避免画布拖拽、滚轮和空格平移快捷键
  干扰面板内的表单与代码编辑器。
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
  `size-6` 图标区；dot 只在节点项 Hover 或菜单已打开时显示，隐藏时保留布局宽度。节点项整行
  只在 Hover 时切换背景，聚焦仅保留边框反馈。菜单复用 `ActionMenuContent`，提供更改节点、断开当前直连边和删除节点，
  不在整行按钮内嵌套另一个按钮。源节点外壳、连接项和添加入口统一为
  `36px` 高，节点主题图标容器与 `NodeHeader` 一致为 `24px`、内部 `NodeIcon` 为 `16px`；
  已连接节点名称使用 `text-sm`，添加入口文案使用低一级的 `text-xs`；颜色和图标仍从
  `@ai-workflow/nodes-ui` 获取，不在 Feature 中复制映射或放大画布节点规格。
  当 Core 解析出稳定 `error` 输出端口时，在普通下一步连接区下方增加语义 warning 的“异常时”
  分组，展示该端口已连接的多个下游节点；节点项和新增入口与普通下一步复用同一组件和样式，
  只有分组外层使用 warning 背景、边框与标题。已有异常下游时入口显示“添加并行节点”并继续
  允许新增；该分组只在异常分支模式存在，不为无或默认值模式保留占位。插件节点还必须在
  `NodeType.form` 中声明 `ERROR_HANDLING` 字段，单独声明名为 `error` 的静态端口不得触发该分组；
  插件完整自定义配置 renderer 通过 Catalog 提供的 `HostFieldProvider` 复用宿主异常处理字段。
  正常与异常入口继续复用同一个节点选择器，但必须把准确的
  `sourceHandle` 传入新增、更改和断开操作，不能回退为首个可用输出端口。
  选择节点后由 `useWorkflowEditor.addConnectedNode` 在同一个历史检查点中原子创建节点和连线：
  根节点放在当前节点右侧并纵向避开已有直接下游，Loop 子节点继续放在同一 Loop 作用域；
  连线使用当前节点首个仍可连接的输出端口和新增节点首个可用输入端口。当前节点没有可用输出
  端口时入口使用真实禁用态，目标节点没有输入端口或不允许出现在当前作用域时不得选择。
- 节点输入、输出 Handle 使用贴合节点左右边缘的主色短竖条，视觉尺寸为 `4px × 20px`；可在不放大可见图形的前提下扩展透明命中区。
- 普通边与连接预览线使用 `--workflow-edge`，宽度为 `2.5px`，路径使用 Bezier 曲线；选中边使用 `--primary`。
  鼠标悬停节点时，与该节点输入或输出端口相连的全部边使用 `--primary` 高亮；离开节点后恢复
  普通边颜色，不把该临时展示状态写入工作流数据或历史。测试运行中的连线执行态样式见上方
  运行态约定，由 `workflow-edge-execution` 派生 class，不写入边数据或历史。
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
