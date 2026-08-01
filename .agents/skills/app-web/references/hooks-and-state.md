# Hooks 与状态管理规范

## 当前状态

- Web 暂无全局状态库，页面和业务功能主要使用 React 局部状态。
- 通用 UI Hook 目前只有 `@ai-workflow/ui/hooks/use-mobile` 的 `useIsMobile`。
- 不为未来需求预先引入状态库、请求缓存库或通用 Hook 层。

## 放置规则

| Hook 类型                | 放置位置                                                       |
| ------------------------ | -------------------------------------------------------------- |
| 只服务一个组件           | 与组件同文件或同目录私有文件                                   |
| 服务一个业务功能         | `features/<feature>/hooks`，只在外部需要时从业务功能根入口导出 |
| 跨两个以上 Web 业务域    | `apps/web/src/hooks`，确认真实复用后再创建                     |
| 无业务语义且可跨应用复用 | `packages/ui/src/hooks` 或职责更合适的 package                 |

## 编写规则

- 使用 `use` 前缀，让返回值表达单一、稳定的职责。
- 让状态靠近消费方，只有多个分支共同读写时才提升到共同父级。
- 不用 Effect 同步可以由 props 或现有 state 直接推导的值。
- Effect 必须完整声明依赖，并清理订阅、定时器和事件监听。
- 使用浏览器 API 时处理不可用场景；媒体查询可参考 `useIsMobile`。
- React Compiler 已启用，不要无依据地添加 `useMemo`、`useCallback` 或组件 memo。
- 表单有效性优先由当前字段值推导，不额外维护重复的 `isValid` 状态。
- 受控浮层关闭时统一重置临时状态，避免不同关闭路径产生残留。

## 表单状态与校验

- 前端表单值必须由 `@ai-workflow/shared/hooks/use-form-data` 的 `useFormData` 管理，表单
  schema 和校验必须使用 Zod 与
  `@ai-workflow/shared/utils/validate-form-by-zod` 的 `validateFormByZod`。新增或修改表单时，
  同时读取 `$ai-workflow-packages` 的 Shared 引用。
- schema 是表单数据结构的唯一事实来源。编辑态使用 `z.input<typeof schema>`，通过
  `validateFormByZod` 后使用 `z.output<typeof schema>`；不要重复声明字段 interface，也不要
  使用类型断言跳过解析。
- 业务表单的 schema、编辑态/提交类型和初始值放在对应 feature 根目录的 `schema.ts`；
  对外需要的 `z.output` 类型从 feature `index.ts` 导出，不在 `types.ts` 复制一份接口。
- 使用 `updateFormField` 更新单个字段，使用 `updateForm` 原子更新多个相关字段或动态字段，
  使用 `resetForm` 恢复初始值。禁止把一个表单拆成多个字段级 `useState`，也禁止另建功能相同
  的业务 Hook。
- 需要实时校验时，在 `useFormData` 的 `onChange` 中调用 `validateFormByZod`；无论是否实时
  校验，提交入口都必须重新调用一次。校验失败时停止提交并消费 `errors`/`message`，校验成功
  时只使用结果中的 `data`。
- 字段错误直接来自 Zod issue 映射，不额外维护重复的 `isValid` 或另一套手写规则。是否已经
  触碰、是否展示错误等交互状态可以独立管理，但不得复制表单值。
- 表单错误状态只保存前端 Zod 校验结果。后端接口返回的错误、后端校验错误和网络失败不得
  写入字段错误或表单级错误状态，统一通过 `@ai-workflow/ui/lib/toast` 的
  `showToast('error', message)` 展示。
- 修改尚未使用统一方案的已有表单时，当前表单必须整体迁移，不只迁移本次新增字段，也不得
  暂时并存 `useFormData`、字段级 `useState` 或第三方表单库。
- Dialog 开关、加载、网络请求和分页等纯 UI 状态不属于表单数据，可以继续使用局部状态。
- 普通表单不得引入 TanStack Form、Formik 或 React Hook Form。字段数量超过 20 个或输入更新
  频率极高时，如确需替换 `useFormData`，必须先取得用户明确同意；Zod schema 和统一校验工具
  仍为强制要求。

基础模式：

```tsx
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { z } from 'zod'

const formSchema = z.object({
  name: z.string().trim().min(1, '名称不能为空'),
  description: z.string().trim().optional(),
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

function ExampleForm() {
  const { form, updateFormField, updateForm, resetForm } = useFormData<FormInput>(
    {
      name: '',
      description: '',
    },
    {
      onChange: (values) => {
        const result = validateFormByZod(formSchema, values)
        if (!result.success) {
          // 使用 result.errors 更新实时错误反馈
        }
      },
    },
  )

  function handleSubmit() {
    const result = validateFormByZod(formSchema, form)
    if (!result.success) return

    const values: FormOutput = result.data
    // 仅提交 values
  }

  // 使用 form、updateFormField、updateForm、resetForm 和 handleSubmit 渲染表单
}
```

## 状态升级顺序

1. 先使用组件局部状态。
2. 兄弟组件共享时提升到最近共同父级。
3. 同一业务功能多处共享时建立业务 Hook 或 Context。
4. 只有跨业务、生命周期和缓存需求明确时，再评估应用级状态方案。

## 详情资源可用性

- 应用、知识库等详情页不在前端预校验路由 ID 格式，始终由父页面请求详情接口，以后端响应
  作为资源是否可用的唯一依据。
- 详情接口非 `200` 时保留 API Client 的具体错误 Toast，不重定向、不重复提示；父页面将
  当前资源标记为不可用，并通过 `DetailLayout` 的 Outlet context 传给所有详情子路由。
- 详情请求加载中或失败时，资源相关操作一律禁用；只有当前路由 ID 的详情请求成功后才能
  启用。应用详情的工作流、API、日志以及后续知识库详情子页面接入功能时都必须消费该状态，
  禁止因为页面尚未完成而默认保持按钮可用。
- 工作流不可用时必须整体禁用编辑能力，包括顶部操作栏、底部画布工具栏、视图与快捷键按钮、
  节点拖拽/选择/连线、节点配置、Loop 内添加与缩放以及画布编辑快捷键；不得只禁用发请求的
  最终按钮而保留前置编辑入口。

## Studio 游标列表

- `features/studio/hooks/use-studio-apps.ts` 负责 Studio 列表的搜索防抖、排序、opaque cursor、
  首屏与续载状态；页面只编排工具栏、弹窗和操作反馈。
- Studio 当前排序值继续由 `useStudioApps` 持有并传入 Grid；排序选项、卡片时间字段与“编辑于”
  /“创建于”文案由 Feature 内的排序策略表解析，不复制成额外状态。
- 搜索、排序或主动重试时取消旧请求、清空旧游标并加载第一页；续载请求用查询版本隔离过期
  响应，合并时按应用 ID 去重。
- 列表虚拟化只负责可见行与触底信号，不持有请求数据；加载失败后停止自动续载，由页面提供
  明确的重试入口，避免虚拟列表在失败位置循环请求。

## 知识库列表与工作流目录

- `features/knowledge-base/hooks/use-knowledge-bases.ts` 负责知识库列表的 300ms 搜索防抖、排序、
  加载、失败重试与主动刷新；页面只编排工具栏、创建弹窗和成功反馈。当前接口返回全部知识库，
  不在前端模拟分页或截断。
- 知识库列表编辑或删除成功后刷新当前搜索与排序；详情页编辑成功后直接使用接口响应更新父级
  资源状态，删除成功后返回知识库列表。删除失败保留确认弹窗，错误继续由统一 API 客户端提示。
- 工作流编辑器通过 `WorkflowKnowledgeBaseCatalogProvider` 独立加载当前用户的知识库目录，
  `KnowledgeBaseField` 消费目录生成多选项，RAG 画布摘要通过同一上下文的
  `resolveKnowledgeBaseReferenceDisplay` 获取人类可读名称和图标，不再请求第二份目录。
  多选 Dialog 的临时选择使用 `useFormData`
  管理，并只通过 Core `ragKnowledgeBaseIdsSchema` 校验其负责的知识库 ID 数组，不读取或复制
  同节点的 `topK` 等其他配置；点击“添加”后才整体写回 `knowledgeBaseIds`。已保存但目录中不存在的
  知识库 ID 必须保留为不可用选项并提示重新选择，不得在目录刷新时静默清空节点配置。

## 工作流编辑器

- 工作流自动保存由 `WorkflowEditor` 组件层编排：`useWorkflowEditor` 只维护编辑状态、历史与
  `dirty`，`useWorkflowSave` 只负责 Core 保存校验、800ms 防抖、请求串行和保存状态，
  页面提供草稿读取与写入函数，并将草稿 `updatedAt` 作为初始保存时间传入编辑器，使首次加载
  也展示最近一次自动保存时间。不得把接口请求重新耦合进 `useWorkflowEditor`。
- 只有持久化节点/连线变化才触发自动保存：React Flow 变更继续统一复用
  `hasNodeMutation`、`hasEdgeMutation` 判断，节点增删替换、拖动位置、主动缩放尺寸和连线
  增删替换会置脏；选择、Hover、面板开关以及画布平移/缩放不得置脏或发请求。自动保存期间
  的新变化必须等待当前请求结束后串行保存最新快照，不允许并发覆盖。
- 自动保存处于防抖等待、请求中或失败未落库状态时，React Router 页面跳转必须弹出确认
  Dialog；浏览器刷新、关闭标签页使用 `beforeunload` 原生确认。保存完成后若跳转仍在等待，
  自动继续原跳转。
- 根画布和 Loop 容器内新增节点都通过 `createCanvasNodes` 创建；新增 Loop 必须在同一次
  状态更新中原子生成 Loop 容器、Loop Start 和 Loop Exit。根画布新增节点通过预设尺寸
  一次计算初始位置，Loop 使用默认容器尺寸；不得在渲染测量后再次修正坐标造成视觉跳动。
- 普通节点的 `config`、`inputs`、`outputs` 统一由节点类型的 `createInitialConfig`、
  `createInitialInputs`、`createInitialOutputs` 工厂初始化；配置工厂接收同一批初始变量，
  Web 不按节点类型复制默认变量或配置模板。
- 新增节点按整个工作流内的节点类型生成实例名称：首个实例沿用类型默认 label，后续实例写入
  `默认 label 2`、`默认 label 3`。编号同时参考同类型实例数量和已存在的最大标准编号，
  避免节点删除或改成自定义名称后生成重复名称；根画布与 Loop 内新增必须共用该规则。
- 名称输入清空并确认时恢复该节点的实例默认名称，而不是一律恢复裸的类型 label；已生成
  标准编号的节点保留原编号，旧数据没有编号时按工作流内同类型节点顺序推导 `label 2`、
  `label 3`，并通过现有节点更新入口写回实例 label。
- 新增节点只更新画布节点与脏状态，不修改 `selectedNodeId`：配置面板关闭时不得因新增而
  自动打开，正在配置其他节点时也不得自动切换；只有用户点击节点时才切换面板目标。
- 配置面板“下一步”入口由 `useWorkflowNodePicker` 的 `connect-next` 模式管理，继续复用同一个
  节点选择浮层；`useWorkflowEditor.addConnectedNode` 必须在一次历史检查点中同时写入新增节点
  和当前节点到新增节点的连线，不修改 `selectedNodeId`。根节点添加在当前节点右侧，Loop 子节点
  继承当前节点的 `parentId` 并使用 Loop 子节点定位规则，禁止产生跨 Loop 作用域连线。配置面板
  的 `WorkflowNextStep` 直接订阅 React Flow 当前 nodes 与 edges，并按目标节点去重派生下一步
  节点，不经过面板 props 复制连接状态；点击已连接节点继续复用 `openNodeConfig` 切换配置目标。
  已连接节点菜单的更改操作复用 `useWorkflowNodePicker` 的 `replace` 模式，并通过可选的来源
  节点 ID 区分普通更换。`replaceConnectedNode` 更换目标节点类型时保留原 Edge 与
  `sourceHandle`，只为新节点映射兼容的 `targetHandle`；无法重连时整次操作不得写入状态。删除
  复用 `deleteNode`；断开连接由 `disconnectNodes` 删除当前源节点到目标节点的全部直连 Edge，
  并与其他图编辑操作一样建立历史检查点、同步选择态和脏状态。
- 从连线 Hover 添加节点属于原子插入操作：新节点必须同时具有输入和输出端口，原边替换为
  “原上游 → 新节点 → 原下游”两条边，节点与边共用一次历史检查点。插入完成后使用更新后的
  节点和边执行局部排列：保持当前视口不变，新节点纵向沿用原贝塞尔连线中点，横向与上游
  保持标准层间距；空间不足时只把原下游及其可达后续根节点整体向右推动所需距离，以保留
  后续节点之间已有的连线形态，其他分支不得移动。普通工具栏和右键新增不触发自动排列。
  判断节点类型是否可插入时，`createInitialConfig()` 抛错或生成无效配置都视为不可插入并在
  选择器中禁用，不得让节点工厂异常中断编辑器初始化。
- 画布交互选择与配置面板目标分开维护：`selectedNodeIds`、`selectedEdgeIds` 承载
  React Flow 的单选、多选和快捷键选择，只影响展示与编辑操作，不进入保存或撤销历史；
  `selectedNodeId` 只表示当前配置面板目标。普通点击节点打开或切换配置面板，修饰键多选
  不强制切换配置目标；关闭配置、点击空白处或按 Esc 清除选择时同步关闭配置面板。
- 工作流快捷键集中在 `features/workflow/hooks/use-workflow-shortcuts.ts` 注册，帮助文案由
  `workflow-shortcut-definitions.ts` 统一维护；焦点位于输入、选择器、代码编辑器或可编辑文本
  时不拦截文字编辑快捷键。连续方向键移动合并为一次历史操作，并在按键释放或窗口失焦时
  结束该次操作。顶部操作栏通过 `WorkflowEditor` 持有的辅助面板类型与右侧面板通信；辅助面板
  与节点配置面板使用独立状态并允许同时显示，同一入口再次点击关闭，其他入口点击后原位切换。
  Esc 按当前最上层状态依次关闭快捷键帮助、添加节点面板、右侧辅助面板、取消正在进行的连线，
  再清除画布选择和配置面板。
- 画布/节点右键操作分别封装为独立策略，通过
  `WorkflowContextMenuActionRegistry.register()` 动态注册；注册表支持订阅，新增操作只增加
  策略，不修改菜单渲染分支。`useWorkflowContextMenu` 管理右键目标和策略解析，
  `useWorkflowNodePicker` 管理添加/更换模式，运行、导入和导出由
  `useWorkflowOperations` 统一编排。
- 节点更换必须保留被更换根节点的 ID、位置和父容器关系，同时使用新类型的工厂重新初始化
  `config`、`inputs`、`outputs`；Loop 与普通节点互换时原子新增或清理系统子节点。既有边只在
  新节点仍存在同名输入/输出端口时保留，失效端口和被删除后代节点关联的边必须同步清理；
  更换后关闭旧配置面板，避免复用旧表单状态；更换前后保持当前 React Flow 视口不变，不因
  节点类型重建或浮层焦点回收自动平移、缩放画布。
- 右键画布“粘贴到这里”以右键位置作为粘贴根节点组的新锚点；键盘粘贴和快速复制继续使用
  递增偏移。导入应用先解析并校验应用 DSL，再以一次历史检查点替换节点、连线和布局，使
  用户仍可通过撤销恢复原画布。
- 应用工作流子页从父详情页的 Outlet context 消费已加载的应用元数据，用真实应用 ID、标题、
  描述和图标生成导出 DSL；文件名与导出定义名称使用当前应用标题，不得使用路由占位 ID 或
  从工作流名称反推应用信息。
- Loop Start 与 Loop Exit 是自动维护的系统节点，初始化和新建时均设置为不可单独删除；
  删除 Loop 时通过 React Flow 的删除拦截器递归删除全部后代节点及关联边。复制 Loop 时
  连同系统节点和内部连线整体复制，系统节点本身不可作为复制或剪切根节点。
- 节点实例名称、描述和配置共用 `useWorkflowEditor` 的节点更新入口；修改后同步更新画布节点
  数据并设置脏状态，保存时统一转换回 Core `WorkflowNode`，不得维护只存在于配置面板的副本。
- Loop 容器相关行为（子节点添加、缩放边界同步、删除拦截）集中在
  `features/workflow/hooks/use-workflow-loop-editor.ts`；`useWorkflowEditor` 只组合该
  Hook 并通过 `WorkflowLoopEditorProvider` 向节点组件注入能力。
