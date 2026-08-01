# `@ai-workflow/form`

## 职责

基于 Core 字段 schema 提供基础与复杂字段 renderer，并为无法按顶层字段拆分的配置保留整节点
renderer。
Form 负责组合
`@ai-workflow/ui` 基础控件与字段标签、说明、错误、禁用态和值转换，不把字段表单语义下沉到
UI 包。

## 公开入口

字段 renderer 与契约从根入口导入：

```ts
import {
  FIELD_UI_TYPES,
  builtinFields,
  CodeField,
  ConditionBranchesField,
  ConditionRulesEditor,
  ConditionRulesField,
  ContextMessagesField,
  NumberField,
  SelectField,
  SliderField,
  SwitchField,
  TextField,
  TextareaField,
  EditableTableField,
  KeyValueTable,
  KeyValueTableField,
  RequestBodyField,
  type AnyFieldRenderer,
  type ConditionBranchesFieldValue,
  type ConditionRulesFieldValue,
  type ContextMessagesFieldValue,
  type EditableTableColumn,
  type FieldRenderer,
  type FieldRendererProps,
  type KeyValueTableEntry,
  type RequestBodyType,
} from '@ai-workflow/form'
```

组件通过 `./components/*` 通配子路径公开：

```ts
import {
  NodeConfigFields,
  type NodeConfigFieldErrors,
  type NodeConfigFieldMap,
  type NodeConfigFieldRendererMap,
  type NodeConfigFieldValues,
} from '@ai-workflow/form/components/node-config-fields'

import {
  NodeConfigSection,
  builtinNodeConfigRenderers,
  type NodeConfigRendererMap,
} from '@ai-workflow/form/components/node-config-section'

import {
  NodeVariableSection,
  NodeVariablePicker,
  builtinNodeVariableRenderers,
  type AvailableVariableOption,
  type NodeVariableRendererMap,
} from '@ai-workflow/form/components/node-variable-section'

import {
  DataTypeIcon,
  DataTypeSelect,
  getDataTypeTag,
  type DataTypeIconProps,
  type DataTypeSelectProps,
} from '@ai-workflow/form/components/data-type-select'

import {
  VariableValueEditor,
  type VariableValueEditorProps,
} from '@ai-workflow/form/components/variable-value-editor'
```

`src/config` 维护整节点 renderer 注册表，`src/variables` 维护包内置的变量编辑器和 renderer
注册表；两者不提供独立公开入口。不要从这些内部目录或 `packages/workflow-form/src/*` 深层导入。

## 目录结构

```text
src/contracts/
├── available-variable-option.ts
└── field-renderer.ts
src/components/
├── data-type-select.tsx
├── node-config-fields.tsx
├── node-config-section.tsx
├── node-variable-section.tsx
└── variable-value-editor.tsx
src/config/
└── node-config-renderer-registry.ts
src/fields/
├── code-field/
├── condition-branches-field/
├── condition-rules-field/
├── context-messages-field/
├── editable-table-field/
├── key-value-table-field/
├── number-field/
├── request-body-field/
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
├── node-variable-picker.tsx
└── start-input-variables-editor.tsx
```

每种字段 renderer 独立维护。Text 与 Number 虽然都复用 UI `Input`，但不合并为一个字段
renderer；带字段语义的组合组件也不移动到 `@ai-workflow/ui`。

## 字段组合

`NodeConfigFields` 遍历 Core form 字段映射，根据 `field.ui` 从调用方 `renderers` 或
`builtinFields` 选择 renderer，并把字段当前值、字段错误、完整错误映射、可用变量候选、
禁用态和变更回调传给对应组件。它不读取节点注册表，
不管理配置校验、提交或工作流状态；这些内容由使用方按统一表单规范负责。
传入的 `fields` 必须已经是调用方解析后的完整字段配置；动态选项或其他业务数据由应用层
Resolver 在渲染前合并。Form 不提供 Select、树选择等控件专属的动态数据入口，也不请求或
持有业务数据。

`NodeConfigSection` 读取 Core `NodeType.configRenderer` 声明的名称，从整节点配置 renderer
注册表选择受控组件，并统一透传当前 `config`、Zod 错误、可用变量候选和完整配置变更回调。
当前内置节点均已使用字段级 form；该能力继续为无法按顶层字段拆分的完整表单和第三方插件
保留。HTTP、Condition 与 LLM 不再通过整节点 renderer 重复组合配置字段。
内置映射集中维护在 `src/config/node-config-renderer-registry.ts`；
通过可选 `renderers` 注入扩展时，名称必须与 Core 声明一致。需要 API、路由或其他应用
业务数据的 renderer 必须使用该注入入口留在应用层，Form 不请求数据或反向依赖应用。

`NodeVariableSection` 读取 Core `NodeVariableFormSection.renderer`，从变量 renderer map
中选择受控组件。内置 `INPUT_BINDINGS` 编辑 `node.inputs`，支持直接值、上游节点变量和系统变量引用；
内置 `OUTPUT_DEFINITIONS` 编辑 `node.outputs` 的 key 和 dataType，并让 label 与 key
同步；description 通过数据类型组合控件左侧的说明入口打开 Dialog 编辑；
内置 `START_INPUT_VARIABLES` 复用相同的 `node.outputs` 数据结构，但显示紧凑列表，并通过
Dialog 新增或编辑 Start 输入变量的 key、label、dataType、defaultValue 和 required；不提供
最大长度或隐藏预填字段。三种变量编辑器在集合为空时只显示区域标题和新增按钮，不渲染空状态
占位。调用方负责提供当前节点可引用的
`AvailableVariableOption`、Zod 错误、当前值和写回回调，Form 不遍历工作流、Edge 或
React Flow。候选项同时提供 `sourceId`、`sourceLabel`、`variableName` 和 `dataType`，
供内置选择器按来源分组、搜索并展示类型；`label` 保留完整的“来源 / 变量”文本，不在 Form
中拆分拼接字符串。`variableName` 必须来自输出变量的 `key` / `outputKey`，不得使用变量的
显示名称 `label` 替代。通过可选 `renderers` 注入自定义 renderer 时，renderer 名称必须与
Core 节点声明一致。内置 renderer 的映射集中维护在
`src/variables/node-variable-renderer-registry.ts`，容器组件和公共契约维护在
`src/components/node-variable-section.tsx`，通用变量区 Header 也放在 `src/components`。
Core `DataType` 的受控选择统一复用公开组件 `DataTypeSelect`；组件展示图标、中文名称、
类型徽标和当前选中态，其中 Core `json` 的徽标文案显示为 `object`；组件通过
`onValueChange` 返回校验后的 `DataType`。菜单默认与自身 Trigger 等宽并左对齐；组合控件
可以通过 `contentAlign` 和 `contentClassName` 调整菜单对齐与宽度。仅需展示类型图标时复用
同入口公开的 `DataTypeIcon`；需要复用类型徽标文案时使用 `getDataTypeTag`。不要在 renderer
或 Web 中重复维护类型名称、图标和 Select 结构。

## 表单状态与校验

- 使用 `@ai-workflow/form` 的调用方必须以对应 Core Zod schema 作为表单数据唯一事实来源，
  通过 `@ai-workflow/shared/hooks/use-form-data` 管理配置值，通过
  `@ai-workflow/shared/utils/validate-form-by-zod` 执行实时校验和提交校验。
- 表单编辑态类型使用 `z.input<typeof schema>`，校验成功后的配置使用
  `z.output<typeof schema>`。传给 `NodeConfigFields` 的 `values` 来自 `useFormData.form`，
  字段变更通过 `updateFormField` 或 `updateForm` 回写。
- `validateFormByZod` 返回的字段错误映射为 `NodeConfigFieldErrors` 再传入
  `NodeConfigFields`；提交或写回节点配置前必须重新校验，只能使用成功结果中的 `data`。
- 字段 renderer 保持受控和无状态，只接收当前值、字段描述、错误、通用字段上下文与
  `onChange`，不得各自引入表单库、复制 Zod schema 或维护另一份已提交值。纯 UI 临时状态
  （例如 Dialog 开关）可以留在
  renderer 内；一旦内部组合多个待提交字段或承担数据校验，必须改用 `useFormData` 和
  `validateFormByZod`。
- Dialog 或 Popover 中的字段在浮层打开后不得自动聚焦；禁止使用 `autoFocus` 或代码调用
  `focus()`，并在非 `DialogContent` 的 Radix 浮层上通过 `onOpenAutoFocus` 阻止默认聚焦。
- 新增或修改配置表单时必须同时读取 Shared 引用中的完整统一表单规范。

## 内置映射

`src/fields/builtin-fields.ts` 直接复用 Core 的 `FIELD_UI_TYPES`，不重复声明枚举或维护
`FieldValueByUI`。映射允许缺少必须由应用注入的字段类型：

```ts
export const builtinFields: Readonly<Partial<Record<FieldUIType, AnyFieldRenderer>>> = {
  [FIELD_UI_TYPES.TEXT]: TextField,
  [FIELD_UI_TYPES.NUMBER]: NumberField,
  [FIELD_UI_TYPES.TEXTAREA]: TextareaField,
  [FIELD_UI_TYPES.SELECT]: SelectField,
  [FIELD_UI_TYPES.SWITCH]: SwitchField,
  [FIELD_UI_TYPES.SLIDER]: SliderField,
  [FIELD_UI_TYPES.CODE_EDITOR]: CodeField,
  [FIELD_UI_TYPES.KEY_VALUE_TABLE]: KeyValueTableField,
  [FIELD_UI_TYPES.REQUEST_BODY]: RequestBodyField,
  [FIELD_UI_TYPES.CONDITION_RULES]: ConditionRulesField,
  [FIELD_UI_TYPES.CONDITION_BRANCHES]: ConditionBranchesField,
  [FIELD_UI_TYPES.CONTEXT_MESSAGES]: ContextMessagesField,
}
```

- 平台无业务依赖的字段由 `builtinFields` 提供；`LLM_MODEL` 依赖 Web 模型目录，必须通过
  `NodeConfigFields.renderers` 注入，不在 Form 中提供占位实现。
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
- `SliderField` 使用 schema 的 `min`、`max`、`step`，以同一受控值组合 Slider 与右侧数字
  Input；拖动与输入均通过字段回调即时写回，Input 支持临时清空并承接 required、disabled 和
  `aria-invalid` 状态，Slider 值在展示时限制到声明范围，越界输入仍保留给 Zod 展示错误。
- `CodeField` 按需加载代码字段内容，只在代码字段实际挂载时下载 UI 包的 Monaco
  `CodeEditor` 分块；空值回退到 schema 的 `content`，默认语言为 JavaScript，也可通过
  可选 `language` props 复用其他 Monaco 语言。字段目录自行组合语言顶栏、边框、尺寸与
  放大入口；`code-field-dialog.tsx` 独立承载大尺寸 Dialog，确认后回写字段值，取消或关闭
  时丢弃弹窗草稿。
- `NodeInputBindingsEditor` 以紧凑列表编辑变量 Key、直接值或上游引用；变量引用使用内置
  Popover 选择器，选中态按 `Box 节点图标 + 来源 / VariableIcon 变量名` 展示，两个图标
  统一为 14px，图标与对应文字间距统一为 4px，不在末尾显示数据类型；文字统一使用 12px。
  浮层继续提供搜索、来源分组、类型展示与选中高亮。普通节点的输入区和 End 的输出区共用该
  renderer，交互必须保持一致。Form 只消费调用方提供的候选，不自行生成变量；调用方可以同时
  传入系统变量和执行连线可达的上游节点变量，当前不提供环境变量或嵌套 Path 选择。
- `VariableValueEditor` 是直接值/变量引用的公共受控组合控件，普通输入变量和 Condition
  规则必须复用它；组件只消费调用方提供的 `AvailableVariableOption`，不遍历工作流。变量
  选择浮层默认与组合控件等宽；组件右侧存在额外固定区域时，通过可选
  `variablePickerEndOffset`（像素）同步扩展浮层宽度和末端对齐位置。
- `EditableTableField` 是 Form 内可编辑表格的公共受控骨架，基于 UI `Table` 组合并通过
  `EditableTableColumn` 完整声明表头、列宽、单元格样式和渲染内容；组件不持有行数据，新增行
  只调用 `onAddRow`。底部新增命中区默认不绘制额外线条或图标，Hover 或键盘聚焦时只把表格
  自身底边切换为主色，并在底边中点显示与画布一致的圆形 Plus，避免线条伸出圆角两侧。行本身
  不切换背景，只有当前 Hover 或 Focus 的 Input、Select 等具体单元格控件切换为背景色。
- `KeyValueTableField` 复用 `EditableTableField` 统一承载 Headers、Params 等键值集合；Key 和
  Value 都使用 `VariableValueEditor` 的 `table-cell` 模式，普通输入保存直接值，输入 `/` 打开
  变量选择器，行 Hover 或内部聚焦时显示删除入口。作为字段 renderer 使用时从完整错误
  映射派生行级错误，并消费统一透传的变量候选；只需要表格内容、不需要 `Form.Field` 标题时使用同一
  入口导出的 `KeyValueTable`，不要重复键值列和删除交互。表格单元格错误态使用轻量状态背景与
  字段错误文案，不在单元格内部绘制会贴住表格圆角的完整红色输入边框。HTTP 配置通过 Core
  默认值提供首条空行，表格组件本身不根据空数组补行，因此删除唯一一行后可以保持为空。
- `RequestBodyField` 是 `FIELD_UI_TYPES.REQUEST_BODY` 对应的字段 renderer，统一编辑完整
  `HttpRequestBodyInput` 并渲染 none、form-data、x-www-form-urlencoded、JSON、raw、binary
  类型；form-data 通过
  `EditableTableField` 组合 Key、text/file 类型、Value 三列，x-www-form-urlencoded 复用
  `KeyValueTable`，JSON、raw、binary 使用 `VariableValueEditor`。类型常量复用 Core
  `HTTP_BODY_TYPES`，组件不复制 HTTP schema，只通过标准字段回调写回 Body。
- HTTP 的 URL、Method、Headers、Params、Body 与连接超时全部由 `httpNodeForm` 声明；
  `NodeConfigFields` 根据声明顺序组合基础字段、`KeyValueTableField` 与 `RequestBodyField`。
  Headers、Params 和切换后的表格 Body 默认各显示一条空行；显式空数组原样保留，删除最后一行
  后不会自动补回。
- `NodeVariablePicker` 通过 `node-variable-section` 公开，可继续使用默认的完整变量值触发器，
  也可传入 `trigger` 组合图标按钮等业务入口；自定义触发器场景使用 `matchTriggerWidth={false}`
  获得标准紧凑浮层宽度。搜索、来源分组、数据类型和选中回调继续由同一组件维护，不在 Web
  renderer 中复制变量列表。
- `ConditionBranchesField` 是 `FIELD_UI_TYPES.CONDITION_BRANCHES` 对应的字段 renderer，只接收
  和回写 `conditions` 数组。组件维护稳定 `portId` 的分支和稳定 `id` 的规则；新增 ELIF 插在唯一
  ELSE 前，删除分支后重新编号 CASE 标签；同一分支内多条规则使用 Core 公共逻辑关系统一
  选择 AND 或 OR，规则数大于一时显示关系按钮，点击直接在两种关系间切换，不打开下拉菜单。
  每条规则使用一个圆角背景容器组合左值、运算符和可选右值，第一行内部与上下两行之间使用
  细分割线，不把同一规则拆成多个独立圆角输入块；Hover 与 Focus 只改变当前具体控件的背景，
  不改变整个规则背景，也不在分割线外叠加控件边框。`为空`和`不为空`切换时删除右值，其余
  运算符确保右值存在；所有值都通过 `VariableValueEditor` 支持直接值、上游节点引用和系统变量引用。节点配置
  写回、动态端口解析、失效 Edge 清理与 Handle 刷新仍由 Web 和 Core 的通用链路负责。
- `ConditionRulesField` 是 `FIELD_UI_TYPES.CONDITION_RULES` 对应的单组判断规则 renderer，
  直接编辑 Core `ConditionRules` 的 `logicalOperator` 与 `rules`，允许规则数组为空。Loop 的
  循环终止条件使用该字段；`ConditionBranchesField` 复用同目录公开的 `ConditionRulesEditor`
  组合每个 IF / ELIF 分支，判断值、运算符、AND / OR 切换及增删交互不得再复制实现。单组规则
  字段的新增操作使用 `Form.Field.actions` 中的 Ghost 图标按钮；规则为空时标题下只显示字段
  说明，存在规则时直接展示规则列表，不在内容区渲染独立的次级新增按钮；空状态、规则列表及
  规则增删使用 Motion 做轻量透明度与位移过渡。
- `ContextMessagesField` 是 `FIELD_UI_TYPES.CONTEXT_MESSAGES` 对应的字段 renderer，只接收和
  回写 `messages` 数组。组件通过 `Form.Field.actions` 新增带稳定 ID 的消息，继续复用
  `NodeVariablePicker` 与 UI `TiptapEditor` 插入序列化变量 token，并按字段名从完整错误映射派生
  每条消息的内容错误；角色、删除、禁用态、至少保留一条消息以及 Motion 过渡行为保持在同一
  受控字段内。系统变量 token 使用 Core `SYSTEM_VARIABLE_NAMESPACE` 生成 `sys.<key>`，不在
  Form 中维护另一份系统变量清单。消息内容错误只在对应消息项下展示，外层 `Form.Field` 只展示数组级或其他结构
  错误，避免同一 Zod 错误重复出现。LLM 模型目录、模型 API 与供应商展示策略不进入该组件。
- `NodeOutputDefinitionsEditor` 直接编辑 Core `NodeOutputDefinition`，数据类型选项复用
  `DataTypeSelect`，不复制类型名称、图标或输出 schema；切换类型时清除可能不再匹配的
  默认值元数据。默认输入与默认输出变量区都使用 UI `Form.Field` 统一标题、说明、内容间距
  和纯图标新增操作；输出项使用“变量名与说明入口、紧凑数据类型、删除按钮”的单行 32px
  三列布局，不展示独立 label 输入框。变量名列与输入变量区一样使用 96–120px，第二列占据
  剩余宽度；修改变量名时同步更新 `key` 与 `label`。说明按钮和数据类型下拉组成同一个
  控件，说明按钮打开 Dialog 编辑 description，有说明时图标使用主色提示；数据类型菜单
  右对齐并在 Trigger 宽度上增加说明按钮的 36px，与外部组合控件保持等宽。
- `StartInputVariablesEditor` 使用 `useFormData` 管理 Dialog 临时表单，通过
  Core 字段 schema 派生的本地草稿 schema 转换各类型默认值，再通过
  `nodeOutputDefinitionsSchema` 校验新增或编辑后的完整数组；Dialog 关闭、取消和提交后均
  重置草稿。界面编辑 key、label、dataType、defaultValue 和 required，已有 description
  保留但不在 Start 专属 Dialog 中展示；dataType 复用 `DataTypeSelect`，不添加 Start 私有
  数据字段。输入变量区使用 UI `Form.Field` 统一标题、说明和内容间距，新增按钮通过
  `actions` 插槽传入，不手写字段标题布局。变量项使用 32px 高的语义背景、细边框和轻量
  阴影，默认展示 Key、显示名称、必填状态与 `DataTypeIcon`；Hover 或键盘聚焦项时切换为
  编辑、删除按钮。条目前导变量标识复用 UI 包的 `VariableIcon` 并使用 `text-primary`，
  不使用 JSON 数据类型图标。变量项内容本身不触发编辑，只允许对应操作按钮修改或删除变量。
- 所有普通字段 renderer 使用 UI `Form.Field` 展示 label、description、required 和 error，
  实际控件提供 `aria-label`、`aria-invalid` 与 disabled 状态。

## 边界与注意事项

- Form 依赖 Core 契约和 UI primitives，不承载路由、请求、持久化或节点执行。
- 专属配置 renderer 只编辑 Core `config`，不自行维护节点、Edge 或端口；动态端口与失效
  Edge 仍由 Core `resolvePorts` 和 Web 编辑器统一处理。
- 节点变量区由 Core `resolveNodeVariableForm` 解析；整个配置缺省时使用 Core 默认输入、
  输出区，配置对象存在但缺少某方向时调用方不渲染该方向。Form 不合并缺失的变量区配置，
  也不在 Form 或 Web 中维护节点类型白名单。
- 节点配置最终合法性始终由对应 Core Zod schema 和 `validateFormByZod` 判断，renderer
  只负责输入值转换。
- 新增字段 UI 类型时，在 Form 增加独立字段目录，并更新 `builtinFields`；不要复制
  Core 的 `FIELD_UI_TYPES`。
