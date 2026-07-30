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

## Studio 游标列表

- `features/studio/hooks/use-studio-apps.ts` 负责 Studio 列表的搜索防抖、排序、opaque cursor、
  首屏与续载状态；页面只编排工具栏、弹窗和操作反馈。
- 搜索、排序或主动重试时取消旧请求、清空旧游标并加载第一页；续载请求用查询版本隔离过期
  响应，合并时按应用 ID 去重。
- 列表虚拟化只负责可见行与触底信号，不持有请求数据；加载失败后停止自动续载，由页面提供
  明确的重试入口，避免虚拟列表在失败位置循环请求。

## 工作流编辑器

- 根画布和 Loop 容器内新增节点都通过 `createCanvasNodes` 创建；新增 Loop 必须在同一次
  状态更新中原子生成 Loop 容器、Loop Start 和 Loop Exit。根画布新增节点通过预设尺寸
  一次计算初始位置，Loop 使用默认容器尺寸；不得在渲染测量后再次修正坐标造成视觉跳动。
- 新增节点按整个工作流内的节点类型生成实例名称：首个实例沿用类型默认 label，后续实例写入
  `默认 label 2`、`默认 label 3`。编号同时参考同类型实例数量和已存在的最大标准编号，
  避免节点删除或改成自定义名称后生成重复名称；根画布与 Loop 内新增必须共用该规则。
- 名称输入清空并确认时恢复该节点的实例默认名称，而不是一律恢复裸的类型 label；已生成
  标准编号的节点保留原编号，旧数据没有编号时按工作流内同类型节点顺序推导 `label 2`、
  `label 3`，并通过现有节点更新入口写回实例 label。
- 新增节点只更新画布节点与脏状态，不修改 `selectedNodeId`：配置面板关闭时不得因新增而
  自动打开，正在配置其他节点时也不得自动切换；只有用户点击节点时才切换面板目标。
- `selectedNodeId` 是节点配置面板目标与画布节点选中效果的唯一状态源：点击节点时打开或
  切换配置面板，关闭面板时同步清除选中效果；React Flow 产生的节点选择变更不写入编辑器
  状态，拖动节点不得将其设为选中。
- Loop Start 与 Loop Exit 是自动维护的系统节点，初始化和新建时均设置为不可单独删除；
  删除 Loop 时通过 React Flow 的删除拦截器递归删除全部后代节点及关联边。
- 节点实例名称、描述和配置共用 `useWorkflowEditor` 的节点更新入口；修改后同步更新画布节点
  数据并设置脏状态，保存时统一转换回 Core `WorkflowNode`，不得维护只存在于配置面板的副本。
- Loop 容器相关行为（子节点添加、缩放边界同步、删除拦截）集中在
  `features/workflow/hooks/use-workflow-loop-editor.ts`；`useWorkflowEditor` 只组合该
  Hook 并通过 `WorkflowLoopEditorProvider` 向节点组件注入能力。
