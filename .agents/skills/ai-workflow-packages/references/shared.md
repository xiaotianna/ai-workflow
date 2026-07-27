# `@ai-workflow/shared`

## 职责

承载前端、后端或多个 package 共同使用的类型、可序列化协议、常量和通用工具，并提供项目统一
的前端表单状态 Hook 与 Zod 校验工具。

## 当前状态

- 包使用 ESM，不提供根聚合入口，通过 `package.json#exports` 暴露 `./hooks/*` 和
  `./utils/*` 子路径。
- `src/hooks/use-form-data.ts` 提供 `useFormData`，使用 React 与 Immer 管理受控表单值。
- `src/utils/validate-form-by-zod.ts` 提供 `validateFormByZod`、`ZodFormErrors` 和
  `ZodFormValidationResult`，通过 Zod `safeParse` 返回解析数据或字段错误。

公开导入：

```ts
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import {
  validateFormByZod,
  type ZodFormErrors,
  type ZodFormValidationResult,
} from '@ai-workflow/shared/utils/validate-form-by-zod'
```

不要从 `@ai-workflow/shared` 根入口或 `packages/shared/src/*` 物理路径导入。

## 统一表单规范

- 所有前端表单都必须声明 Zod schema，并通过 `validateFormByZod` 校验；不使用手写条件、
  UI 组件规则或其他表单库维护第二套数据规则。
- 表单编辑态类型使用 `z.input<typeof schema>`，校验成功的数据使用
  `z.output<typeof schema>`。Zod schema 是字段结构、默认约束和输入输出转换的唯一事实来源。
- 所有表单值、动态字段集合与待提交数据必须使用 `useFormData<z.input<typeof schema>>`
  管理；禁止为各字段分别建立 `useState`，也不要在应用或其他 package 重复封装等价 Hook。
- 单字段变更使用 `updateFormField`，多个相关字段或动态字段使用 `updateForm` 批量更新，重置
  使用 `resetForm`。需要直接替换整个对象时才使用 `setForm`。
- `useFormData` 的 `onChange` 可用于实时调用 `validateFormByZod`；提交时必须重新校验。失败
  时消费 `errors` 和 `message` 并停止提交，成功时只把返回的 `data` 交给业务逻辑。
- `errors` 的 key 是 Zod issue path 使用 `.` 连接后的字段路径；无字段路径的错误使用
  `form`。表单 UI 应把对应错误传给 `Form.Field error`。
- 修改仍使用字段级 `useState`、手写校验或第三方表单库的已有表单时，必须在当前任务中整体
  迁移该表单，不让新旧方案并存。
- Dialog 开关、请求状态等非表单值 UI 状态不要求放入 `useFormData`。字段超过 20 个或更新
  频率极高时，如需改用其他状态方案必须先获得用户明确同意，但 Zod schema 和
  `validateFormByZod` 仍为强制要求。

示例：

```tsx
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, '名称不能为空'),
  description: z.string().trim().optional(),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

function ExampleForm() {
  const { form, updateFormField, updateForm, resetForm } = useFormData<FormInput>(
    {
      name: '',
      description: '',
    },
    {
      onChange: (values) => {
        const result = validateFormByZod(schema, values)
        if (!result.success) {
          // 使用 result.errors 更新实时错误反馈
        }
      },
    },
  )

  function handleSubmit() {
    const result = validateFormByZod(schema, form)
    if (!result.success) return

    const values: FormOutput = result.data
    // 仅提交 values
  }

  // 使用 form、updateFormField、updateForm、resetForm 和 handleSubmit 渲染表单
}
```

## 适合放入

- 前后端共同使用的请求、响应和事件协议。
- 不依赖 DOM、React、NestJS、Prisma 或 Node 专属 API 的类型。
- 稳定、无环境状态、无副作用的小型常量和工具。
- 无业务语义、可被多个前端应用或 package 复用的表单状态 Hook。
- 基于 Zod 的通用表单校验与错误映射工具。

## 不适合放入

- 工作流节点、端口和校验模型：放入 `@ai-workflow/core`。
- React 展示组件：放入 `@ai-workflow/ui` 或应用业务功能。
- 除统一表单状态外的业务 Hook：放入对应应用业务功能；通用 UI Hook 放入
  `@ai-workflow/ui`。
- Prisma model、Nest DTO class、Redis client 或环境变量读取。
- 只有一个调用方使用、尚未形成共享契约的便利类型。

## 使用与维护

- 从 `package.json#exports` 声明的公开子路径导入，不深层引用源码。
- 新增正式 API 时按 `hooks`、`utils` 等领域建立文件，并确认 exports 通配路径能够覆盖。
- React、Immer、Zod 等运行时导入必须由 Shared 在自己的 `package.json` 声明直接依赖，
  不依赖根目录提升。
- 协议字段使用可序列化值，不传递 class instance、函数或浏览器对象。
- 跨版本数据使用明确的判别字段或版本字段。
