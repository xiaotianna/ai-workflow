# 工作流节点变量设置最小改造方案

> 状态：实施方案。
>
> 本次以 Start、End、Code 验证配置能力；所有节点默认拥有输入、输出变量区，不调整端口模型，不实现 Runtime。

## 1. 目标

在现有右侧节点配置面板中补充变量设置：

- Start 只显示“输入变量”。
- End 只显示“输出变量”。
- Code 同时显示“输入变量”和“输出变量”。
- 节点不配置时默认显示输入、输出变量区；需要自定义时，只声明实际要显示的区域。
- `variableForm` 中未声明的 `input` 或 `output` 不渲染，不使用 `null` 占位。
- Start、End 能选择与普通节点不同的变量 renderer。
- 继续使用现有 `node.inputs`、`node.outputs`、画布转换和保存链路。

## 2. 最终分层

变量区的声明配置进入 `@ai-workflow/core`，React 组件不进入 Core。

| 层级                    | 职责                                                      |
| ----------------------- | --------------------------------------------------------- |
| `@ai-workflow/core`     | 声明节点有哪些变量区、标题和 renderer 类型                |
| `@ai-workflow/form`     | 提供变量区 renderer、通用变量编辑组件和 renderer 注册映射 |
| `apps/web`              | 计算上游可引用变量、管理表单状态、校验并写回节点          |
| `@ai-workflow/nodes-ui` | 展示画布节点摘要，不参与右侧表单状态                      |

这样节点能力由节点类型自身描述，Web 不维护 Start、End、Code 类型判断或第二份节点配置表。

## 3. 当前数据语义

现有节点实例结构保持不变：

```ts
interface WorkflowNode {
  id: string
  type: string
  inputs: Record<string, VariableValue>
  outputs: NodeOutputDefinition[]
  config: Record<string, unknown>
}
```

工作流输入/输出与节点执行方向不同，首期映射如下：

| 节点  | 配置面板区域 | 实际字段       | 原因                                        |
| ----- | ------------ | -------------- | ------------------------------------------- |
| Start | 输入变量     | `node.outputs` | 工作流输入会成为 Start 提供给下游的输出变量 |
| End   | 输出变量     | `node.inputs`  | End 的最终值来自直接值或上游变量绑定        |
| Code  | 输入变量     | `node.inputs`  | Code 消费输入值                             |
| Code  | 输出变量     | `node.outputs` | Code 声明可供下游引用的结果字段             |

本次不接入 `Workflow.outputs`。正式发布输出契约和 Runtime 解析后续单独处理，避免同时维护两份输出来源。

## 4. Core 配置

### 4.1 新增契约

在 Core 的 form 领域增加：

```ts
export const NODE_VARIABLE_RENDERER_TYPES = {
  INPUT_BINDINGS: 'input_bindings',
  OUTPUT_DEFINITIONS: 'output_definitions',
  START_INPUT_VARIABLES: 'start_input_variables',
} as const

export interface NodeVariableFormSection {
  label: string
  description?: string
  renderer: string
}

export interface NodeVariableForm {
  input?: NodeVariableFormSection
  output?: NodeVariableFormSection
}

export const DEFAULT_NODE_VARIABLE_FORM = {
  input: {
    label: '输入变量',
    renderer: NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS,
  },
  output: {
    label: '输出变量',
    renderer: NODE_VARIABLE_RENDERER_TYPES.OUTPUT_DEFINITIONS,
  },
} satisfies NodeVariableForm

export function resolveNodeVariableForm(variableForm?: NodeVariableForm): NodeVariableForm {
  return variableForm ?? DEFAULT_NODE_VARIABLE_FORM
}
```

`renderer` 是无 React 依赖的稳定字符串，由 Form 包解析。内置 renderer 使用常量，后续需要专属组件时可以注册新的 renderer。

默认与覆盖规则：

| `variableForm` 状态     | 结果                               |
| ----------------------- | ---------------------------------- |
| 未配置                  | 默认同时显示输入绑定区和输出定义区 |
| 已配置但未声明 `input`  | 不渲染输入变量区                   |
| 已配置但未声明 `output` | 不渲染输出变量区                   |
| 方向设置为 section      | 使用该 section 的标题和 renderer   |

`resolveNodeVariableForm()` 是默认值语义的唯一解析入口。它只在整个 `variableForm` 未配置时
返回默认双区；配置对象存在时直接使用该对象，Web 不自行补全缺少的方向。

### 4.2 扩展 NodeType

给 `NodeType` 增加一个可选同级属性：

```ts
export interface NodeType<TSchema extends z.ZodType = z.ZodType<any, any>> {
  schema: TSchema
  definition: NodeDefinition
  form?: NodeFormSchema<TSchema>
  variableForm?: NodeVariableForm
  createInitialConfig: () => z.input<TSchema>
  resolvePorts?: (config: z.output<TSchema>) => NodeDefinition['ports']
}
```

不改变现有 `form`：

- `form` 继续只描述 `node.config`。
- `variableForm` 只描述 `node.inputs`、`node.outputs` 的编辑区域。
- 未配置 `variableForm` 的节点默认同时拥有输入、输出变量区。
- 配置了 `variableForm` 后，缺少 `input` 或 `output` 表示不渲染对应区域。
- 节点只声明实际要显示的非默认区域，不写 `null` 占位。

### 4.3 三个节点配置

Start：

```ts
variableForm: {
  input: {
    label: '输入变量',
    renderer: NODE_VARIABLE_RENDERER_TYPES.START_INPUT_VARIABLES,
  },
}
```

Start 使用专属输入变量 renderer：配置面板显示紧凑变量列表，右上角 `+` 打开新增 Dialog，
点击已有变量可以打开编辑 Dialog，删除按钮直接移除变量。数据结构仍是
`NodeOutputDefinition[]`，最终写入 `node.outputs`。

End：

```ts
variableForm: {
  output: {
    label: '输出变量',
    renderer: NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS,
  },
}
```

End 使用输入绑定 renderer，但产品标题为“输出变量”，数据写入 `node.inputs`。

Code 不声明 `variableForm`，直接继承默认输入绑定区和输出定义区。这也是普通节点的默认行为。

## 5. Form 变量 renderer

### 5.1 统一入口

`@ai-workflow/form` 新增 `NodeVariableSection`：

```ts
interface NodeVariableSectionProps {
  section: NodeVariableFormSection
  inputs: NodeInputBindings
  outputs: NodeOutputDefinition[]
  availableVariables: readonly AvailableVariableOption[]
  errors?: Readonly<Record<string, string | undefined>>
  disabled?: boolean
  onInputsChange: (inputs: NodeInputBindings) => void
  onOutputsChange: (outputs: NodeOutputDefinition[]) => void
}
```

组件根据 `section.renderer` 从 renderer map 中取出实际组件。

首期内置映射：

```ts
const builtinNodeVariableRenderers = {
  [NODE_VARIABLE_RENDERER_TYPES.INPUT_BINDINGS]: NodeInputBindingsEditor,
  [NODE_VARIABLE_RENDERER_TYPES.OUTPUT_DEFINITIONS]: NodeOutputDefinitionsEditor,
  [NODE_VARIABLE_RENDERER_TYPES.START_INPUT_VARIABLES]: StartInputVariablesEditor,
}
```

未知 renderer 显示可诊断提示，不让整个配置面板崩溃。

### 5.2 输入绑定 renderer

`NodeInputBindingsEditor` 编辑：

```ts
Record<string, VariableValue>
```

每项包含：

- 变量 Key。
- 取值方式：直接值或变量引用。
- 直接值输入框，或上游变量选择器。
- 删除按钮。

首期变量引用只支持：

- 当前节点执行路径上可达的上游节点。
- 上游节点的动态输出定义和静态输出端口。
- `path: []`，即引用完整输出变量。

首期不实现系统变量、环境变量和嵌套 Path 选择。

### 5.3 输出定义 renderer

`NodeOutputDefinitionsEditor` 编辑：

```ts
NodeOutputDefinition[]
```

字段严格复用 Core schema：

- `key`
- `label`
- `dataType`
- `description`
- `defaultValue`（可选元数据，默认编辑器不展示）
- `required`（可选元数据，默认编辑器不展示）

不创建第二套输出数据结构或手写校验规则。

### 5.4 Start 输入变量 renderer

`StartInputVariablesEditor` 同样编辑 `NodeOutputDefinition[]`，但使用 Start 专属交互：

- 输入变量区使用 UI `Form.Field` 统一标题、说明和内容间距，右侧新增按钮通过 `actions`
  插槽传入，不在 renderer 中重复实现标题行样式。
- 列表项为 32px 高的紧凑卡片，默认展示变量 Key、显示名称、必填状态和复用
  `DataTypeIcon` 的数据类型图标；Hover 或键盘聚焦列表项时隐藏右侧元数据并显示编辑、
  删除按钮。列表项内容本身不可点击，只有对应操作按钮可以编辑或删除变量。
- 点击右上角 `+` 打开“新增变量” Dialog。
- 点击编辑按钮打开同一套“编辑变量” Dialog。
- Dialog 编辑 `dataType`、`key`、`label`、`defaultValue` 和 `required`。
- 默认值使用随数据类型变化的控件和转换规则，保存后必须与 `dataType` 匹配。
- dataType 使用 Form 包公开的 `DataTypeSelect`，统一展示类型图标、中文名称、类型徽标和
  选中态；Core `json` 的徽标文案显示为 `object`，其他变量编辑场景直接复用，不重复维护
  选项 UI。
- 历史 `description` 数据继续保留，但不在 Start 专属 Dialog 中展示。
- 新增和编辑都通过 `nodeOutputDefinitionsSchema` 校验，重复 Key 或非法字段不会写回。
- Dialog 表单使用 `useFormData` 管理；关闭、取消和提交后重置临时状态。

参考界面中的最大长度和隐藏预填不提供；`defaultValue` 与 `required` 作为
`NodeOutputDefinition` 的可选持久化字段，保持旧工作流兼容。

## 6. Web 接入

### 6.1 配置面板表单

扩展当前表单 schema：

```ts
const workflowConfigPanelFormSchema = z.object({
  label: z.string().trim().min(1, '节点名称不能为空'),
  description: z.string().trim(),
  inputs: nodeInputBindingsSchema,
  outputs: nodeOutputDefinitionsSchema,
  config: z.record(z.string(), z.unknown()),
})
```

名称、描述、`config`、`inputs`、`outputs` 继续由同一个 `useFormData` 管理。

写回规则：

- `config` 通过对应节点 schema 后写回。
- `inputs` 通过 `nodeInputBindingsSchema` 后写回。
- `outputs` 通过 `nodeOutputDefinitionsSchema` 后写回。
- 非法编辑态保留在表单中并显示错误，不覆盖画布中的合法节点数据。
- 最终继续调用现有 `onApply(nextNode)`，不新增保存 Hook。

### 6.2 渲染顺序

配置面板先统一解析 `nodeType.variableForm`：

```ts
const variableForm = resolveNodeVariableForm(nodeType.variableForm)
```

然后按以下顺序渲染：

```text
variableForm.input
nodeType.form
variableForm.output
```

对应 Code：

```text
输入变量
代码配置
输出变量
```

只有三部分都不存在时才显示“当前节点暂无可配置项”。

Web 不出现：

```ts
if (node.type === 'start') {
}
if (node.type === 'end') {
}
if (node.type === 'code') {
}
```

### 6.3 上游变量候选

Web 新增纯函数：

```ts
getAvailableNodeVariables({
  nodeId,
  nodes,
  edges,
})
```

规则：

1. 根据 Edge 收集当前节点所有可达上游节点。
2. 读取上游节点的 `node.outputs`。
3. 通过 `getNodePorts()` 读取上游节点静态输出端口。
4. 按 `nodeId + outputKey` 去重。
5. 生成 Form 包需要的 `AvailableVariableOption`。

Form 包不遍历工作流，Core 不依赖画布数据。

## 7. 画布摘要

### Start

沿用 `StartNodeContent`，把产品文案从“输出变量”改成“输入变量”，数据仍读取 `node.outputs`。

### End

新增 `EndNodeContent` 并通过现有 `NodeUIRegistry` 注册。只展示：

- 输出变量数量。
- 输出 Key。

不展示直接值或引用详情。

### Code

保留现有代码预览，不增加变量列表，避免卡片信息过多。

画布 `NodeUIRegistry` 和配置表单 variable renderer map 职责不同，不合并。

## 8. 文件改动

### 新增

| 文件                                                                      | 作用                                  |
| ------------------------------------------------------------------------- | ------------------------------------- |
| `packages/workflow-core/src/form/node-variable-form.ts`                   | `variableForm` 契约、默认值和解析函数 |
| `packages/workflow-form/src/components/node-variable-section.tsx`         | 变量区公共入口和 renderer 契约        |
| `packages/workflow-form/src/components/data-type-select.tsx`              | 通用 DataType 受控选择器              |
| `packages/workflow-form/src/components/variable-section-header.tsx`       | 默认变量编辑器复用的区块标题          |
| `packages/workflow-form/src/variables/node-input-bindings-editor.tsx`     | 默认输入绑定编辑器                    |
| `packages/workflow-form/src/variables/node-output-definitions-editor.tsx` | 默认输出定义编辑器                    |
| `packages/workflow-form/src/variables/start-input-variables-editor.tsx`   | Start 输入变量列表和新增/编辑 Dialog  |
| `packages/workflow-form/src/variables/node-variable-renderer-registry.ts` | 内置变量 renderer 注册表              |
| `apps/web/src/features/workflow/utils/get-available-node-variables.ts`    | 计算上游变量候选                      |
| `packages/workflow-nodes-ui/src/nodes/end/index.tsx`                      | End 画布摘要                          |

### 修改

| 文件                                                                  | 改动                                  |
| --------------------------------------------------------------------- | ------------------------------------- |
| `packages/workflow-core/src/node/node-definition.ts`                  | 给 `NodeType` 增加可选 `variableForm` |
| `packages/workflow-core/src/node/workflow-node-schema.ts`             | 输出定义增加默认值与必填元数据        |
| `packages/workflow-core/src/nodes/start/index.ts`                     | 声明 Start 输入变量区                 |
| `packages/workflow-core/src/nodes/end/index.ts`                       | 声明 End 输出变量区                   |
| `packages/workflow-core/src/nodes/code/index.ts`                      | 使用默认变量区，不保留重复配置        |
| `packages/workflow-core/src/index.ts`                                 | 导出变量表单契约和 End 节点           |
| `apps/web/src/features/workflow/components/workflow-config-panel.tsx` | 接入变量表单状态、校验和 renderer     |
| `apps/web/src/features/workflow/components/workflow-panel.tsx`        | 透传变量候选                          |
| `apps/web/src/features/workflow/components/workflow-editor.tsx`       | 传递编辑器变量候选                    |
| `apps/web/src/features/workflow/hooks/use-workflow-editor.ts`         | 派生当前节点上游变量候选              |
| `packages/workflow-nodes-ui/src/nodes/start/index.tsx`                | 调整 Start 摘要文案                   |
| `packages/workflow-nodes-ui/src/nodes/builtin-node-ui.ts`             | 注册 End 内容组件                     |
| 对应技能引用文件                                                      | 同步正式职责和用法                    |

## 9. 明确不做

- 不修改 `WorkflowNode` 顶层结构；只扩展 `node.outputs` 元数据。
- 不修改 Start、End、Code 端口。
- 不修改 Runtime。
- 不接入 `Workflow.outputs`。
- 不自动级联重写下游已有引用。
- 不支持系统变量、环境变量和嵌套 Path。
- 不新增测试文件。

Start 或 Code 输出 Key 被重命名、删除后，下游旧引用由现有工作流校验在保存时报告，首期不自动修复。

## 10. 验收标准

### Start

- 只显示“输入变量”。
- 右上角 `+` 打开新增变量 Dialog。
- 已有变量可以通过同一 Dialog 编辑，也可以直接删除。
- Dialog 使用字段类型、变量名称、显示名称、默认值和必填字段。
- Dialog 不提供最大长度、隐藏预填和说明字段。
- 编辑数据写入 `node.outputs`。
- 画布显示输入变量数量和名称。

### End

- 只显示“输出变量”。
- 直接值或上游引用写入 `node.inputs`。
- 画布显示输出 Key，不显示具体值。

### Code

- 按“输入变量 -> 代码配置 -> 输出变量”展示。
- 输入写入 `node.inputs`，输出写入 `node.outputs`。
- 原有代码编辑器和画布代码预览不变。

### 通用

- 是否渲染完全由 Core `variableForm` 决定。
- 未配置 `variableForm` 时默认显示输入、输出变量区。
- 配置 `variableForm` 后只渲染对象中实际声明的方向，不写 `null` 占位。
- Web 不维护节点类型映射。
- 非法 Key、重复输出 Key或非法变量值不写回节点。
- 保存后重新打开，`inputs`、`outputs` 完整恢复。
