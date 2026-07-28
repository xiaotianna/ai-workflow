# `@ai-workflow/form`

## 职责

基于 Core 字段 schema 提供节点配置字段 renderer 和内置字段映射。Form 负责组合
`@ai-workflow/ui` 基础控件与字段标签、说明、错误、禁用态和值转换，不把字段表单语义下沉到
UI 包。

## 公开入口

字段 renderer 与契约从根入口导入：

```ts
import {
  FIELD_UI_TYPES,
  builtinFields,
  CodeField,
  NumberField,
  SelectField,
  SliderField,
  SwitchField,
  TextField,
  TextareaField,
  type AnyFieldRenderer,
  type FieldRenderer,
  type FieldRendererProps,
} from '@ai-workflow/form'
```

组件通过 `./components/*` 通配子路径公开：

```ts
import {
  NodeConfigFields,
  type NodeConfigFieldErrors,
  type NodeConfigFieldMap,
  type NodeConfigFieldValues,
} from '@ai-workflow/form/components/node-config-fields'

import {
  NodeVariableSection,
  builtinNodeVariableRenderers,
  type AvailableVariableOption,
  type NodeVariableRendererMap,
} from '@ai-workflow/form/components/node-variable-section'
```

`src/variables` 只维护包内置的变量编辑器和 renderer 注册表，不提供独立公开入口。
不要从 `variables` 内部文件或 `packages/workflow-form/src/*` 深层导入。

## 目录结构

```text
src/components/
├── node-config-fields.tsx
├── node-variable-section.tsx
└── variable-section-header.tsx
src/fields/
├── code-field/
├── number-field/
├── select-field/
├── slider-field/
├── switch-field/
├── text-field/
├── textarea-field/
├── builtin-fields.ts
└── index.ts
src/utils/
├── create-unique-key.ts
└── get-field-error.ts
src/variables/
├── node-input-bindings-editor.tsx
├── node-output-definitions-editor.tsx
├── node-variable-renderer-registry.ts # 内置 renderer 注册表
└── start-input-variables-editor.tsx
```

每种字段 renderer 独立维护。Text 与 Number 虽然都复用 UI `Input`，但不合并为一个字段
renderer；带字段语义的组合组件也不移动到 `@ai-workflow/ui`。

## 字段组合

`NodeConfigFields` 遍历 Core form 字段映射，根据 `field.ui` 从 `builtinFields` 选择
renderer，并把字段当前值、错误、禁用态和变更回调传给对应组件。它不读取节点注册表，
不管理配置校验、提交或工作流状态；这些内容由使用方按统一表单规范负责。
传入的 `fields` 必须已经是调用方解析后的完整字段配置；动态选项或其他业务数据由应用层
Resolver 在渲染前合并。Form 不提供 Select、树选择等控件专属的动态数据入口，也不请求或
持有业务数据。

`NodeVariableSection` 读取 Core `NodeVariableFormSection.renderer`，从变量 renderer map
中选择受控组件。内置 `INPUT_BINDINGS` 编辑 `node.inputs`，支持直接值和上游变量引用；
内置 `OUTPUT_DEFINITIONS` 编辑 `node.outputs` 的 key、label、dataType 和 description；
内置 `START_INPUT_VARIABLES` 复用相同的 `node.outputs` 数据结构，但显示紧凑列表，并通过
Dialog 新增或编辑 Start 输入变量。调用方负责提供当前节点可引用的
`AvailableVariableOption`、Zod 错误、当前值和写回回调，Form 不遍历工作流、Edge 或
React Flow。通过可选 `renderers` 注入自定义 renderer 时，renderer 名称必须与 Core 节点
声明一致。内置 renderer 的映射集中维护在
`src/variables/node-variable-renderer-registry.ts`，容器组件和公共契约维护在
`src/components/node-variable-section.tsx`，通用变量区 Header 也放在 `src/components`。

## 表单状态与校验

- 使用 `@ai-workflow/form` 的调用方必须以对应 Core Zod schema 作为表单数据唯一事实来源，
  通过 `@ai-workflow/shared/hooks/use-form-data` 管理配置值，通过
  `@ai-workflow/shared/utils/validate-form-by-zod` 执行实时校验和提交校验。
- 表单编辑态类型使用 `z.input<typeof schema>`，校验成功后的配置使用
  `z.output<typeof schema>`。传给 `NodeConfigFields` 的 `values` 来自 `useFormData.form`，
  字段变更通过 `updateFormField` 或 `updateForm` 回写。
- `validateFormByZod` 返回的字段错误映射为 `NodeConfigFieldErrors` 再传入
  `NodeConfigFields`；提交或写回节点配置前必须重新校验，只能使用成功结果中的 `data`。
- 字段 renderer 保持受控和无状态，只接收当前值、错误与 `onChange`，不得各自引入表单库、
  复制 Zod schema 或维护另一份已提交值。纯 UI 临时状态（例如 Dialog 开关）可以留在
  renderer 内；一旦内部组合多个待提交字段或承担数据校验，必须改用 `useFormData` 和
  `validateFormByZod`。
- 新增或修改配置表单时必须同时读取 Shared 引用中的完整统一表单规范。

## 内置映射

`src/fields/builtin-fields.ts` 直接复用 Core 的 `FIELD_UI_TYPES`，不重复声明枚举或维护
`FieldValueByUI`：

```ts
export const builtinFields = {
  [FIELD_UI_TYPES.TEXT]: TextField,
  [FIELD_UI_TYPES.NUMBER]: NumberField,
  [FIELD_UI_TYPES.TEXTAREA]: TextareaField,
  [FIELD_UI_TYPES.SELECT]: SelectField,
  [FIELD_UI_TYPES.SWITCH]: SwitchField,
  [FIELD_UI_TYPES.SLIDER]: SliderField,
  [FIELD_UI_TYPES.CODE_EDITOR]: CodeField,
} satisfies Record<FieldUIType, AnyFieldRenderer>
```

- `Record<FieldUIType, AnyFieldRenderer>` 保证 Core 每个字段 UI 枚举都有 renderer。
- `AnyFieldRenderer` 只用于异构组件 map 的动态边界。
- 每个组件通过 `FieldRendererProps<TField, TValue>` 保留具体 schema 和值类型，例如
  `NumberField` 使用 `FieldRendererProps<NumberFieldSchema, number>`。

## 字段行为

- `TextField`、`NumberField` 分别处理字符串和数字输入。
- `TextareaField` 处理多行字符串。
- `SelectField` 使用 option 索引作为 Radix Select 内部字符串值，回调返回原始
  string、number 或 boolean option value；菜单使用 Popper 从 Trigger 下方左对齐展开，
  保持 4px 间距并匹配 Trigger 宽度。
- `SwitchField` 使用 boolean 受控值。
- `SliderField` 使用 schema 的 `min`、`max`、`step`，并展示当前值。
- `CodeField` 按需加载代码字段内容，只在代码字段实际挂载时下载 UI 包的 Monaco
  `CodeEditor` 分块；空值回退到 schema 的 `content`，默认语言为 JavaScript，也可通过
  可选 `language` props 复用其他 Monaco 语言。字段目录自行组合语言顶栏、边框、尺寸与
  放大入口；`code-field-dialog.tsx` 独立承载大尺寸 Dialog，确认后回写字段值，取消或关闭
  时丢弃弹窗草稿。
- `NodeInputBindingsEditor` 以紧凑列表编辑变量 Key、直接值或上游引用；首期只消费调用方
  提供的候选，不自行生成系统变量、环境变量或嵌套 Path。
- `NodeOutputDefinitionsEditor` 直接编辑 Core `NodeOutputDefinition`，数据类型选项复用
  `DATA_TYPE_VALUES`，不复制输出 schema。
- `StartInputVariablesEditor` 使用 `useFormData` 管理 Dialog 临时表单，通过
  `nodeOutputDefinitionsSchema` 校验新增或编辑后的完整数组；Dialog 关闭、取消和提交后均
  重置草稿。表单只使用现有 key、label、dataType、description，不添加 Start 私有数据字段。
- 所有 renderer 使用 UI `Form.Field` 展示 label、description、required 和 error，
  实际控件提供 `aria-label`、`aria-invalid` 与 disabled 状态。

## 边界与注意事项

- Form 依赖 Core 契约和 UI primitives，不承载路由、请求、持久化或节点执行。
- 节点变量区由 Core `resolveNodeVariableForm` 解析；整个配置缺省时使用 Core 默认输入、
  输出区，配置对象存在但缺少某方向时调用方不渲染该方向。Form 不合并默认值，也不在 Form
  或 Web 中维护节点类型白名单。
- 节点配置最终合法性始终由对应 Core Zod schema 和 `validateFormByZod` 判断，renderer
  只负责输入值转换。
- 新增字段 UI 类型时，在 Form 增加独立字段目录，并更新 `builtinFields`；不要复制
  Core 的 `FIELD_UI_TYPES`。
