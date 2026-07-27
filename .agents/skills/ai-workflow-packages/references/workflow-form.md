# `@ai-workflow/form`

## 职责

基于 Core 字段契约提供节点配置表单渲染、强类型 renderer 注册、字段错误展示和 Zod
错误映射。Form 只管理受控的配置草稿，不保存工作流、不请求接口，也不执行节点。

## 公开入口

包只暴露根入口：

```ts
import {
  NodeConfigForm,
  FieldRendererRegistry,
  builtinFieldRegistry,
  createBuiltinFieldRegistry,
  validateNodeConfig,
  type FieldRenderer,
  type FieldRendererProps,
  type NodeConfigDraft,
} from '@ai-workflow/form'
```

不要从 `packages/workflow-form/src/*` 深层导入。

## 字段类型与 renderer

- Core 的 `FieldSchemaByUI` 负责 `ui -> field schema` 类型映射。
- Form 的 `FieldValueByUI` 负责 `ui -> renderer value` 类型映射。
- `FieldRendererProps<TUI>` 同时收窄 `field`、`value` 和 `onChange`；例如
  `FieldRendererProps<'slider'>` 的字段是 `SliderFieldSchema`，值和回调参数是 `number`。
- `FieldRendererRegistry.register(ui, renderer)` 会按 `ui` 推导 renderer props，重复注册会抛错。
- `builtinFieldRegistry` 已注册 `text`、`number`、`textarea`、`select`、`switch`、`slider`
  和 `code_editor`。
- `NumberInputField` 不接收 `min`、`max` 或 `step`；这些 UI 参数只属于 `SliderField`。
- 当前 `CodeEditorField` 是明确命名并公开的基础代码输入 renderer，使用等宽多行输入，
  支持 `language` 元数据，但尚无语法高亮、自动补全或格式化能力。

自定义 renderer 可以从空 registry 开始注册，避免修改全局内置实例：

```ts
import { FIELD_UI_TYPES } from '@ai-workflow/core'
import { FieldRendererRegistry, type FieldRendererProps } from '@ai-workflow/form'

function CustomTextField(props: FieldRendererProps<typeof FIELD_UI_TYPES.TEXT>) {
  // 自定义实现
}

const registry = new FieldRendererRegistry().register(FIELD_UI_TYPES.TEXT, CustomTextField)
```

## 节点配置表单

`NodeConfigForm` 接收 `nodeType`、受控配置草稿和 `onChange`：

```tsx
<NodeConfigForm
  nodeType={httpNode}
  value={draft}
  errors={validation.success ? undefined : validation.fieldErrors}
  onChange={setDraft}
/>
```

- `NodeConfigDraft<TNode>` 从 `InferNodeConfig<TNode>` 推导，并使用 `Partial` 允许输入过程中的
  暂时缺失值。
- 表单只渲染 `NodeType.form`；没有 form 的节点返回 `null`。
- 可通过 `registry` 注入独立 renderer registry，默认使用 `builtinFieldRegistry`。
- renderer 缺失时显示明确错误，不替换成其他控件。
- `errors` 按配置字段名展示；是否允许提交由消费层决定。

## 校验

`validateNodeConfig(nodeType, draft)` 调用节点 Zod schema，并返回可判别联合：

```ts
const validation = validateNodeConfig(httpNode, draft)

if (validation.success) {
  save(validation.data)
} else {
  setErrors(validation.fieldErrors)
  showFormErrors(validation.formErrors)
}
```

- 字段路径的第一段会映射到 `fieldErrors`，每个字段保留第一条错误。
- 根级错误或没有字符串字段名的错误进入 `formErrors`。
- 校验成功后的 `data` 是 Zod 解析后的 `InferNodeConfig<TNode>`，包括默认值和转换结果。

## 边界与注意事项

- Form 依赖 Core 契约和 UI primitives，不承载路由、请求、持久化或执行逻辑。
- `required`、字段说明和 Slider 范围属于展示信息，最终值合法性始终以节点 Zod schema 为准。
- Select 使用 option 索引作为 Radix Select 的内部字符串值，避免字符串、数字和布尔值序列化冲突；
  `onChange` 返回原始 option value。
- Start 变量列表、Condition 条件列表、动态远程选项和完整代码编辑器属于专用复杂字段，
  需要真实需求出现后再扩展 Core UI 类型和 Form renderer。
