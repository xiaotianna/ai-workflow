# Node 表单面板最小设计方案

> 状态：历史设计提案。节点配置字段契约、renderer registry、内置基础字段、
> `NodeConfigForm` 和 `validateNodeConfig` 已经实现；输入变量、输出变量与 Web 面板接入仍未实施。
>
> 本文后续代码用于保留原始设计背景，不再作为当前 API 示例。当前 Core/Form API 与用法以
> `.agents/skills/ai-workflow-packages/references/workflow-core.md` 和
> `.agents/skills/ai-workflow-packages/references/workflow-form.md` 为准。

## 1. 目标

在节点配置面板中统一完成：

- 填写节点输入变量。
- 选择上游变量引用。
- 填写节点专属配置。
- 声明节点输出变量。
- 提交后更新完整的 `WorkflowNode`。

保持最小设计：

- `NodeType.form` 只描述 `node.config`。
- `node.inputs` 使用通用输入变量编辑器。
- `node.outputs` 使用通用输出变量编辑器。
- 不给每个节点重复声明输入、输出面板布局。
- 不引入 `sections`、`source`、`mode` 等暂时不需要的配置。

## 2. 当前模型能实现的范围

当前文件：

```text
packages/workflow-core/src/node/workflow-node-schema.ts
```

当前 `WorkflowNode` 已经包含以下三部分数据：

```ts
interface WorkflowNode {
  id: string
  type: string

  // 输入变量名 -> 直接值或变量引用
  inputs: Record<string, VariableValue>

  // 节点公开的输出变量声明
  outputs: NodeOutputDefinition[]

  // 节点业务配置
  config: Record<string, unknown>
}
```

因此当前模型能够支持：

| 面板能力                       | 当前能否实现     | 数据来源                           |
| ------------------------------ | ---------------- | ---------------------------------- |
| 添加输入变量                   | 可以             | `node.inputs`                      |
| 填写输入值                     | 可以             | `VariableValue.type = "value"`     |
| 引用上游变量                   | 可以             | `VariableValue.type = "reference"` |
| 配置节点业务参数               | 可以             | `node.config`                      |
| 添加输出变量                   | 可以             | `node.outputs`                     |
| 配置输出名称和类型             | 可以             | `NodeOutputDefinition`             |
| 配置输入字段类型、必填和默认值 | 一般节点暂不完整 | `node.inputs` 没有这些元数据       |

截图中的“输入字段”包含类型和必填信息，它更接近工作流入口字段定义，而不是普通节点的输入绑定。

目前 Start 节点同时存在：

```text
start.config.variables
start.outputs
```

这两处表达了相似信息。正式实现 Start 输入字段面板前，应先确定唯一数据源，否则修改字段时需要同步两份数据。

## 3. 数据流

```text
NodeType.form
    │
    └──渲染──> node.config

WorkflowNode.inputs
    │
    └──渲染──> 输入变量编辑器
                  ├──直接填写
                  └──引用上游变量

WorkflowNode.outputs
    │
    └──渲染──> 输出变量编辑器

三个区域提交
    │
    └──> WorkflowNode
             │
             └──> useWorkflowEditor.applyNodeConfig()
```

## 4. 建议文件路径

| 文件路径                                                        | 作用                              |
| --------------------------------------------------------------- | --------------------------------- |
| `packages/workflow-core/src/node/node-definition.ts`            | 在 `NodeType` 中增加必选的 `form` |
| `packages/workflow-core/src/nodes/<node>/index.ts`              | 声明各节点的 config 表单映射      |
| `packages/workflow-form/src/node-form.tsx`                      | 组合输入变量、节点配置和输出变量  |
| `packages/workflow-form/src/index.ts`                           | 暴露表单公共 API                  |
| `apps/web/src/components/workflow/workflow-config-panel.tsx`    | 将通用表单放进 Web 右侧面板       |
| `apps/web/src/features/workflow/components/workflow-panel.tsx`  | 把选中节点和更新回调传给面板      |
| `apps/web/src/features/workflow/components/workflow-editor.tsx` | 连接编辑器状态和配置面板          |

## 5. Core 表单契约

### 文件路径

```text
packages/workflow-core/src/node/node-definition.ts
```

### 作用

- `schema` 负责配置数据校验。
- `form` 负责描述配置字段应使用什么控件。
- `form` 设置为必选。
- 没有配置字段的节点显式声明 `form: {}`。
- `form` 不重复描述 `node.inputs` 和 `node.outputs`。

### 完整代码示例

```ts
import type { z } from 'zod'

import type { FieldSchemaMap } from '../form/field-schema-types'
import type { PortMap } from '../port/port-types'

export interface NodeDefinition {
  type: string
  label: string
  description?: string
  icon?: string

  ports: {
    inputs: PortMap
    outputs: PortMap
  }
}

export type NodeFormSchema<TSchema extends z.ZodType> =
  z.output<TSchema> extends object ? FieldSchemaMap<z.output<TSchema>> : never

export interface NodeType<TSchema extends z.ZodType = z.ZodType<any, any>> {
  /**
   * 节点业务配置的数据结构和校验规则。
   * 只校验 WorkflowNode.config。
   */
  schema: TSchema

  /**
   * 节点名称、说明、图标和端口等静态信息。
   */
  definition: NodeDefinition

  /**
   * WorkflowNode.config 的表单映射。
   *
   * 该属性不描述 node.inputs 和 node.outputs，
   * 因为它们由通用变量编辑器负责。
   *
   * 没有业务配置的节点显式声明 form: {}。
   */
  form: NodeFormSchema<TSchema>

  /**
   * 创建节点实例时产生独立的初始配置。
   */
  createInitialConfig: () => z.input<TSchema>

  /**
   * 根据已校验的 config 生成动态端口。
   */
  resolvePorts?: (config: z.output<TSchema>) => NodeDefinition['ports']
}

export type InferNodeConfig<TNode extends NodeType> = z.output<TNode['schema']>
```

## 6. 节点表单配置

### LLM 节点

文件路径：

```text
packages/workflow-core/src/nodes/llm/index.ts
```

作用：定义 LLM 节点的 `prompt` 应使用多行文本框渲染。

完整代码示例：

```ts
import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { llmNodeDefinition } from './definition'
import { llmNodeSchema } from './schema'

export const llmNode = {
  schema: llmNodeSchema,

  definition: llmNodeDefinition,

  form: {
    prompt: {
      type: 'string',
      ui: FIELD_UI_TYPES.TEXTAREA,
      label: 'Prompt',
      description: '发送给大语言模型的提示词',
      required: true,
    },
  },

  createInitialConfig: () => createInitialConfig(llmNodeSchema),
} satisfies NodeType<typeof llmNodeSchema>

export type { LlmNodeConfig } from './schema'
```

### 无业务配置的节点

没有业务配置的节点仍然必须显式声明 `form`：

```ts
export const endNode = {
  schema: endNodeSchema,
  definition: endNodeDefinition,

  form: {},

  createInitialConfig: () => createInitialConfig(endNodeSchema),
} satisfies NodeType<typeof endNodeSchema>
```

### HTTP 节点

文件路径：

```text
packages/workflow-core/src/nodes/http/index.ts
```

完整代码示例：

```ts
import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { HTTP_METHODS } from './constant'
import { httpNodeDefinition } from './definition'
import { httpNodeSchema } from './schema'

export const httpNode = {
  schema: httpNodeSchema,

  definition: httpNodeDefinition,

  form: {
    url: {
      type: 'string',
      ui: FIELD_UI_TYPES.INPUT,
      label: '请求地址',
      required: true,
    },

    method: {
      type: 'select',
      ui: FIELD_UI_TYPES.SELECT,
      label: '请求方法',
      required: true,
      options: HTTP_METHODS.map((method) => ({
        label: method,
        value: method,
      })),
    },
  },

  createInitialConfig: () => createInitialConfig(httpNodeSchema),
} satisfies NodeType<typeof httpNodeSchema>

export type { HttpNodeConfig } from './schema'
export * from './constant'
```

### 其他内置节点数据清单

以下内容只补充当前内置节点的 `config` 数据和表单映射状态，不增加新的字段类型、组件或特殊处理。

| 节点           | `config` 数据              | 当前建议   | 说明                                                                                                                |
| -------------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `start`        | `variables`                | 暂不处理   | `variables` 是数组，当前没有数组字段 renderer；同时还需要先解决 `config.variables` 与 `node.outputs` 的重复数据来源 |
| `end`          | 空对象                     | `form: {}` | 没有节点专属配置                                                                                                    |
| `llm`          | `prompt`                   | 已映射     | 使用 `TEXTAREA`，当前已有对应基础组件                                                                               |
| `rag`          | `knowledgeBaseIds`、`topK` | 已映射     | 知识库使用 `KNOWLEDGE_BASE` renderer 提供多选 Dialog，`topK` 使用 SLIDER 渲染滑条和数字输入                         |
| `code`         | `code`                     | 暂不处理   | Core 已有 `CODE_EDITOR` 字段类型，但 `@ai-workflow/form` 中的 Code Editor renderer 和组件尚未实现                   |
| `http`         | `url`、`method`            | 可直接映射 | `url` 使用 `INPUT`，`method` 使用静态 `SELECT`                                                                      |
| `loop`         | `maxIterations`            | 可直接映射 | 使用数字 `INPUT`，现有字段类型和组件可以覆盖                                                                        |
| `loop_start`   | 空对象                     | `form: {}` | Loop 自动维护的系统节点，没有节点专属配置                                                                           |
| `loop_exit`    | 空对象                     | `form: {}` | Loop 自动维护的系统节点，没有节点专属配置                                                                           |
| `condition`    | `conditions`               | 专属映射   | 使用 `NodeType.configRenderer` 与 Condition 专属 renderer，保留动态端口规则                                         |
| `sub_workflow` | `workflowId`               | 暂不处理   | 需要从外部工作流列表生成动态选项，当前静态 `options` 无法完整表达                                                   |

### Loop 节点

文件路径：

```text
packages/workflow-core/src/nodes/loop/form.ts
```

作用：将最大循环次数映射为数字输入框，不引入额外组件。

完整代码示例：

```ts
import type { FieldSchemaMap } from '../../form/field-schema-types'
import { FIELD_UI_TYPES } from '../../form/field-ui-constants'
import type { LoopNodeConfig } from './schema'

export const loopNodeForm = {
  maxIterations: {
    type: 'number',
    ui: FIELD_UI_TYPES.INPUT,
    label: '最大循环次数',
    description: '允许执行的最大循环次数，范围为 1 到 10000',
    required: true,
    min: 1,
    max: 10_000,
    step: 1,
  },
} satisfies FieldSchemaMap<LoopNodeConfig>
```

对应节点入口：

```text
packages/workflow-core/src/nodes/loop/index.ts
```

完整代码示例：

```ts
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { loopNodeDefinition } from './definition'
import { loopNodeForm } from './form'
import { loopNodeSchema } from './schema'

export const loopNode = {
  schema: loopNodeSchema,
  definition: loopNodeDefinition,
  form: loopNodeForm,
  createInitialConfig: () => createInitialConfig(loopNodeSchema),
} satisfies NodeType<typeof loopNodeSchema>

export type { LoopNodeConfig } from './schema'
```

### 空配置节点

以下节点的 schema 都是空对象，不需要创建独立字段配置：

```text
end
loop_start
loop_exit
```

它们只需要在各自的 `NodeType` 中显式声明：

```ts
form: {},
```

示例：

```ts
export const endNode = {
  schema: endNodeSchema,
  definition: endNodeDefinition,
  form: {},
  createInitialConfig: () => createInitialConfig(endNodeSchema),
} satisfies NodeType<typeof endNodeSchema>
```

### 暂不处理的节点

以下节点本次只记录现状，不补充表单映射：

#### Start

```ts
interface StartNodeConfig {
  variables: Array<{
    key: string
    label: string
    dataType: DataType
    required: boolean
    defaultValue?: unknown
  }>
}
```

暂不处理原因：

- 当前字段契约没有数组或可增删列表类型。
- 当前没有 Start 变量列表 renderer。
- `config.variables` 与 `node.outputs` 的数据职责尚未统一。

#### RAG

```ts
interface RagNodeConfig {
  knowledgeBaseIds: string[]
  topK: number
}
```

当前通过 Core `KNOWLEDGE_BASE` 字段类型和 Web `KnowledgeBaseField` 注入真实目录；
已选 ID 数组按顺序保存，历史 `knowledgeBaseId` 由 Core schema 自动迁移；`topK` 范围为 1 到
20、默认 `5`，使用通用 SLIDER renderer 在知识库下方显示独立的“召回设置”滑条和数字输入框。

#### Code

```ts
interface CodeNodeConfig {
  code: string
}
```

暂不处理原因：

- Core 已经定义 `FIELD_UI_TYPES.CODE_EDITOR`。
- `packages/workflow-form/src/fields/code-field.tsx` 当前没有实现。
- 不使用普通 `Textarea` 静默替代代码编辑器。

#### Condition

```ts
interface ConditionNodeConfig {
  conditions: Array<{
    portId: string
    conditionLabel: string
    rules: Array<{
      id: string
      left: VariableValue
      operator: ConditionOperator
      right?: VariableValue
    }>
    isFallback: boolean
  }>
}
```

当前通过 `NodeType.configRenderer` 声明专属配置 renderer，不把动态数组加入普通字段映射。
每个普通分支的规则固定使用 AND，最后一个分支是唯一 ELSE；`portId` 继续作为动态输出端口的
稳定标识。规则两侧使用公共 `VariableValue`，运算符使用 Core 公共枚举。

#### Sub Workflow

```ts
interface SubWorkflowNodeConfig {
  workflowId: string
}
```

暂不处理原因：

- `workflowId` 应从外部工作流列表选择。
- 当前尚未定义动态选项加载和注入方式。

## 7. 通用节点表单

### 文件路径

```text
packages/workflow-form/src/node-form.tsx
```

### 作用

统一组合：

1. 输入变量编辑器。
2. 节点业务配置表单。
3. 输出变量编辑器。
4. Zod 校验和提交。

### 完整代码示例

```tsx
import {
  DATA_TYPE_VALUES,
  FIELD_UI_TYPES,
  workflowNodeSchema,
  type DataType,
  type FieldSchema,
  type FieldUIType,
  type NodeInputBindings,
  type NodeOutputDefinition,
  type NodeType,
  type VariableReference,
  type VariableValue,
  type WorkflowNode,
} from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Slider } from '@ai-workflow/ui/components/slider'
import { Switch } from '@ai-workflow/ui/components/switch'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { useState, type FormEvent, type ReactNode } from 'react'

export interface AvailableVariableOption {
  id: string
  label: string
  reference: VariableReference
}

export interface NodeFormProps {
  node: WorkflowNode
  nodeType: NodeType
  availableVariables?: readonly AvailableVariableOption[]
  onApply: (node: WorkflowNode) => void
}

interface ConfigFieldsProps {
  fields: Readonly<Record<string, FieldSchema | undefined>>
  value: WorkflowNode['config']
  errors: Readonly<Record<string, string>>
  onChange: (value: WorkflowNode['config']) => void
}

interface InputEditorProps {
  value: NodeInputBindings
  availableVariables: readonly AvailableVariableOption[]
  onChange: (value: NodeInputBindings) => void
}

interface OutputEditorProps {
  value: readonly NodeOutputDefinition[]
  onChange: (value: NodeOutputDefinition[]) => void
}

interface FieldRendererProps {
  field: FieldSchema
  fieldKey: string
  invalid: boolean
  value: unknown
  onChange: (value: unknown) => void
}

type FieldRenderer = (props: FieldRendererProps) => ReactNode

const stringifyDirectValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''

  return JSON.stringify(value) ?? ''
}

const serializeSelectValue = (value: string | number | boolean): string => JSON.stringify(value)

const referencesEqual = (left: VariableReference, right: VariableReference): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const fieldRenderers = {
  [FIELD_UI_TYPES.INPUT]: ({ field, fieldKey, invalid, value, onChange }) => (
    <Input
      aria-label={field.label}
      aria-invalid={invalid}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value === undefined ? '' : String(value)}
      min={field.type === 'number' ? field.min : undefined}
      max={field.type === 'number' ? field.max : undefined}
      step={field.type === 'number' ? field.step : undefined}
      onChange={(event) => {
        if (field.type === 'number') {
          const nextValue = event.target.value

          onChange(nextValue === '' ? '' : Number(nextValue))
          return
        }

        onChange(event.target.value)
      }}
      name={fieldKey}
    />
  ),

  [FIELD_UI_TYPES.TEXTAREA]: ({ field, fieldKey, invalid, value, onChange }) => (
    <Textarea
      aria-label={field.label}
      aria-invalid={invalid}
      name={fieldKey}
      value={value === undefined ? '' : String(value)}
      onChange={(event) => onChange(event.target.value)}
    />
  ),

  [FIELD_UI_TYPES.SELECT]: ({ field, invalid, value, onChange }) => {
    if (field.type !== 'select') {
      return <p className="text-destructive text-xs">字段类型与 Select 控件不匹配</p>
    }

    const selectedValue =
      value === undefined ? undefined : serializeSelectValue(value as string | number | boolean)

    return (
      <Select
        value={selectedValue}
        onValueChange={(serializedValue) => {
          const option = field.options.find(
            (item) => serializeSelectValue(item.value) === serializedValue,
          )

          if (option) onChange(option.value)
        }}
      >
        <SelectTrigger aria-label={field.label} aria-invalid={invalid} className="w-full">
          <SelectValue placeholder={`请选择${field.label}`} />
        </SelectTrigger>

        <SelectContent>
          {field.options.map((option) => {
            const serializedValue = serializeSelectValue(option.value)

            return (
              <SelectItem key={serializedValue} value={serializedValue}>
                {option.label}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    )
  },

  [FIELD_UI_TYPES.SWITCH]: ({ field, invalid, value, onChange }) => {
    if (field.type !== 'boolean') {
      return <p className="text-destructive text-xs">字段类型与 Switch 控件不匹配</p>
    }

    return (
      <Switch
        aria-label={field.label}
        aria-invalid={invalid}
        checked={Boolean(value)}
        onCheckedChange={onChange}
      />
    )
  },

  [FIELD_UI_TYPES.SLIDER]: ({ field, invalid, value, onChange }) => {
    if (field.type !== 'number') {
      return <p className="text-destructive text-xs">字段类型与 Slider 控件不匹配</p>
    }

    return (
      <Slider
        aria-label={field.label}
        aria-invalid={invalid}
        min={field.min}
        max={field.max}
        step={field.step}
        value={[typeof value === 'number' ? value : (field.min ?? 0)]}
        onValueChange={(values) => onChange(values[0])}
      />
    )
  },

  [FIELD_UI_TYPES.CODE_EDITOR]: ({ field }) => (
    <p className="text-destructive text-xs">
      字段“{field.label}”需要代码编辑器，当前尚未提供对应 renderer。
    </p>
  ),
} satisfies Record<FieldUIType, FieldRenderer>

function ConfigFields({ fields, value, errors, onChange }: ConfigFieldsProps) {
  const entries = Object.entries(fields).filter(
    (entry): entry is [string, FieldSchema] => entry[1] !== undefined,
  )

  if (entries.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">节点配置</h3>

      {entries.map(([fieldKey, field]) => {
        const renderer = fieldRenderers[field.ui]

        return (
          <Form.Field
            key={fieldKey}
            label={field.label}
            required={field.required}
            description={field.description}
            error={errors[fieldKey]}
          >
            {renderer({
              field,
              fieldKey,
              invalid: Boolean(errors[fieldKey]),
              value: value[fieldKey],
              onChange: (nextValue) =>
                onChange({
                  ...value,
                  [fieldKey]: nextValue,
                }),
            })}
          </Form.Field>
        )
      })}
    </section>
  )
}

function InputEditor({ value, availableVariables, onChange }: InputEditorProps) {
  const entries = Object.entries(value)

  function addInput() {
    let index = entries.length + 1
    let key = `input${index}`

    while (key in value) {
      index += 1
      key = `input${index}`
    }

    onChange({
      ...value,
      [key]: {
        type: 'value',
        value: '',
      },
    })
  }

  function renameInput(previousKey: string, nextKey: string) {
    if (previousKey === nextKey || !nextKey || nextKey in value) {
      return
    }

    onChange(
      Object.fromEntries(
        entries.map(([key, binding]) =>
          key === previousKey ? [nextKey, binding] : [key, binding],
        ),
      ),
    )
  }

  function updateInput(key: string, binding: VariableValue) {
    onChange({
      ...value,
      [key]: binding,
    })
  }

  function removeInput(key: string) {
    onChange(Object.fromEntries(entries.filter(([currentKey]) => currentKey !== key)))
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">输入变量</h3>

        <Button type="button" size="xs" variant="ghost" onClick={addInput}>
          添加输入
        </Button>
      </div>

      {entries.map(([key, binding]) => {
        const selectedReference =
          binding.type === 'reference'
            ? availableVariables.find((option) =>
                referencesEqual(option.reference, binding.reference),
              )
            : undefined

        return (
          <div key={key} className="border-border space-y-2 rounded-lg border p-3">
            <Input
              aria-label="输入变量名"
              defaultValue={key}
              onBlur={(event) => renameInput(key, event.target.value.trim())}
            />

            <Select
              value={binding.type}
              onValueChange={(type) => {
                if (type === 'value') {
                  updateInput(key, {
                    type: 'value',
                    value: '',
                  })
                  return
                }

                const firstVariable = availableVariables[0]

                if (!firstVariable) return

                updateInput(key, {
                  type: 'reference',
                  reference: firstVariable.reference,
                })
              }}
            >
              <SelectTrigger aria-label={`${key}的取值方式`} className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="value">直接填写</SelectItem>

                <SelectItem value="reference" disabled={availableVariables.length === 0}>
                  引用变量
                </SelectItem>
              </SelectContent>
            </Select>

            {binding.type === 'value' ? (
              <Input
                aria-label={`${key}的值`}
                value={stringifyDirectValue(binding.value)}
                onChange={(event) =>
                  updateInput(key, {
                    type: 'value',
                    value: event.target.value,
                  })
                }
              />
            ) : (
              <Select
                value={selectedReference?.id}
                onValueChange={(optionId) => {
                  const option = availableVariables.find((item) => item.id === optionId)

                  if (!option) return

                  updateInput(key, {
                    type: 'reference',
                    reference: option.reference,
                  })
                }}
              >
                <SelectTrigger aria-label={`${key}引用的变量`} className="w-full">
                  <SelectValue placeholder="请选择上游变量" />
                </SelectTrigger>

                <SelectContent>
                  {availableVariables.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button type="button" size="xs" variant="destructive" onClick={() => removeInput(key)}>
              删除输入
            </Button>
          </div>
        )
      })}
    </section>
  )
}

function OutputEditor({ value, onChange }: OutputEditorProps) {
  function addOutput() {
    let index = value.length + 1
    let key = `output${index}`

    while (value.some((output) => output.key === key)) {
      index += 1
      key = `output${index}`
    }

    onChange([
      ...value,
      {
        key,
        label: `输出 ${index}`,
        dataType: 'string',
      },
    ])
  }

  function updateOutput(index: number, patch: Partial<NodeOutputDefinition>) {
    onChange(
      value.map((output, currentIndex) =>
        currentIndex === index ? { ...output, ...patch } : output,
      ),
    )
  }

  function removeOutput(index: number) {
    onChange(value.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">输出变量</h3>

        <Button type="button" size="xs" variant="ghost" onClick={addOutput}>
          添加输出
        </Button>
      </div>

      {value.map((output, index) => (
        <div
          key={`${output.key}-${index}`}
          className="border-border space-y-2 rounded-lg border p-3"
        >
          <Input
            aria-label={`输出 ${index + 1} 的变量名`}
            value={output.key}
            onChange={(event) =>
              updateOutput(index, {
                key: event.target.value,
              })
            }
          />

          <Input
            aria-label={`输出 ${index + 1} 的显示名称`}
            value={output.label}
            onChange={(event) =>
              updateOutput(index, {
                label: event.target.value,
              })
            }
          />

          <Select
            value={output.dataType}
            onValueChange={(dataType) =>
              updateOutput(index, {
                dataType: dataType as DataType,
              })
            }
          >
            <SelectTrigger aria-label={`输出 ${index + 1} 的数据类型`} className="w-full">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {DATA_TYPE_VALUES.map((dataType) => (
                <SelectItem key={dataType} value={dataType}>
                  {dataType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            aria-label={`输出 ${index + 1} 的说明`}
            placeholder="输出说明（可选）"
            value={output.description ?? ''}
            onChange={(event) =>
              updateOutput(index, {
                description: event.target.value || undefined,
              })
            }
          />

          <Button type="button" size="xs" variant="destructive" onClick={() => removeOutput(index)}>
            删除输出
          </Button>
        </div>
      ))}
    </section>
  )
}

export function NodeForm({ node, nodeType, availableVariables = [], onApply }: NodeFormProps) {
  const [draft, setDraft] = useState<WorkflowNode>(() => node)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedNode = workflowNodeSchema.safeParse(draft)

    if (!parsedNode.success) {
      setFormError(
        parsedNode.error.issues
          .map((issue) => `${issue.path.join('.')}：${issue.message}`)
          .join('；'),
      )
      return
    }

    const parsedConfig = nodeType.schema.safeParse(parsedNode.data.config)

    if (!parsedConfig.success) {
      const nextErrors: Record<string, string> = {}

      for (const issue of parsedConfig.error.issues) {
        const fieldKey = String(issue.path[0] ?? 'config')

        nextErrors[fieldKey] ??= issue.message
      }

      setFieldErrors(nextErrors)
      setFormError('请检查节点配置')
      return
    }

    const nextNode: WorkflowNode = {
      ...parsedNode.data,
      config: parsedConfig.data as WorkflowNode['config'],
    }

    setFieldErrors({})
    setFormError(undefined)
    setDraft(nextNode)
    onApply(nextNode)
  }

  return (
    <Form className="space-y-5" onSubmit={handleSubmit}>
      <InputEditor
        value={draft.inputs}
        availableVariables={availableVariables}
        onChange={(inputs) =>
          setDraft((current) => ({
            ...current,
            inputs,
          }))
        }
      />

      <ConfigFields
        fields={nodeType.form as Readonly<Record<string, FieldSchema | undefined>>}
        value={draft.config}
        errors={fieldErrors}
        onChange={(config) =>
          setDraft((current) => ({
            ...current,
            config,
          }))
        }
      />

      <OutputEditor
        value={draft.outputs}
        onChange={(outputs) =>
          setDraft((current) => ({
            ...current,
            outputs,
          }))
        }
      />

      {formError ? <p className="text-destructive text-xs">{formError}</p> : null}

      <Button type="submit" size="sm" variant="confirm">
        应用配置
      </Button>
    </Form>
  )
}
```

## 8. Form 包公共入口

### 文件路径

```text
packages/workflow-form/src/index.ts
```

### 作用

Web 只能通过包的公开入口使用节点表单，不深层引用 `src`。

### 完整代码示例

```ts
export { NodeForm, type AvailableVariableOption, type NodeFormProps } from './node-form'
```

由于新增了 React 组件，`packages/workflow-form/package.json` 需要直接声明 React 依赖：

```json
{
  "name": "@ai-workflow/form",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {},
  "dependencies": {
    "@ai-workflow/core": "workspace:*",
    "@ai-workflow/shared": "workspace:*",
    "@ai-workflow/ui": "workspace:*",
    "react": "^19.2.4"
  }
}
```

## 9. Web 配置面板接入

### 文件路径

```text
apps/web/src/components/workflow/workflow-config-panel.tsx
```

### 作用

- 根据选中节点取得 `NodeType`。
- 将节点和变量候选传给 `@ai-workflow/form`。
- 不在 Web 中复制字段渲染规则。
- 使用 `key={node.id}` 在切换节点时重建草稿状态。

### 完整代码示例

```tsx
import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import { NodeForm, type AvailableVariableOption } from '@ai-workflow/form'

interface WorkflowConfigPanelProps {
  node?: WorkflowNode
  availableVariables?: readonly AvailableVariableOption[]
  onApply: (node: WorkflowNode) => void
}

export function WorkflowConfigPanel({
  node,
  availableVariables = [],
  onApply,
}: WorkflowConfigPanelProps) {
  if (!node) return null

  const nodeType = nodeRegistry.get(node.type)

  if (!nodeType) {
    return (
      <aside className="border-border bg-background w-96 rounded-xl border p-4 shadow-sm">
        <p className="text-destructive text-sm">未知节点类型：{node.type}</p>
      </aside>
    )
  }

  return (
    <aside className="border-border bg-background max-h-[calc(100vh-2rem)] w-96 overflow-y-auto rounded-xl border p-4 shadow-sm">
      <header className="mb-5">
        <h2 className="text-base font-semibold">{nodeType.definition.label}</h2>

        {nodeType.definition.description ? (
          <p className="text-muted-foreground mt-1 text-xs">{nodeType.definition.description}</p>
        ) : null}
      </header>

      <NodeForm
        key={node.id}
        node={node}
        nodeType={nodeType}
        availableVariables={availableVariables}
        onApply={onApply}
      />
    </aside>
  )
}
```

## 10. 编辑器连接方式

当前文件：

```text
apps/web/src/features/workflow/hooks/use-workflow-editor.ts
```

当前 `useWorkflowEditor` 已经提供：

```ts
selectedNode
applyNodeConfig
selectNode
```

因此可以将这些数据传入 `WorkflowPanel`：

```tsx
<WorkflowPanel
  nodeTypes={editor.availableNodeTypes}
  selectedNode={editor.selectedNode}
  onAddNode={editor.addNode}
  onApplyNode={editor.applyNodeConfig}
/>
```

同时启用节点选择：

```tsx
<ReactFlow
  // 其他已有属性
  onSelectionChange={({ nodes }) => editor.selectNode(nodes.at(-1)?.id)}
/>
```

`WorkflowPanel` 的右侧面板调用：

```tsx
<Panel position="center-right">
  <WorkflowConfigPanel
    node={selectedNode}
    availableVariables={availableVariables}
    onApply={onApplyNode}
  />
</Panel>
```

上游变量候选需要根据当前节点的入边计算，并最终转换为：

```ts
const availableVariables = [
  {
    id: 'code-1:result',
    label: '代码节点 / result',
    reference: {
      scope: 'node',
      nodeId: 'code-1',
      outputKey: 'result',
      path: [],
    },
  },
] satisfies AvailableVariableOption[]
```

表单包只消费候选列表，不负责遍历工作流和连线。

## 11. Start 节点的特殊问题

Start 节点面板中的“输入字段”存在两个观察角度：

```text
用户视角：工作流输入
节点视角：Start 节点向下游提供的输出
```

当前 Start 节点有两份相关数据：

```ts
node.config.variables
node.outputs
```

不建议通用表单同时更新两份。后续可以选择以下一种方案：

1. 将 `node.outputs` 扩展出 `required` 和 `defaultValue`，作为唯一来源。
2. 将工作流输入提升为 `Workflow.inputs`，Start 节点只展示它们。
3. 暂时保留 `config.variables`，但通过 Core 派生可引用的 Start 输出，不再重复持久化。

在这个问题解决之前，通用面板可以完整配置普通节点的输入绑定、业务配置和输出声明，但还不能无重复地实现 Start 输入字段的全部信息。

## 12. 实施顺序

建议按以下顺序落地：

1. 给 `NodeType` 增加必选的 `form`。
2. 给简单节点补充 `form`，无配置节点填写 `form: {}`。
3. 在 `@ai-workflow/form` 实现 config 字段 renderer。
4. 实现通用 `InputEditor` 和 `OutputEditor`。
5. 在 Web 中接入选中节点和 `applyNodeConfig`。
6. 计算并注入当前节点可引用的上游变量。
7. 单独确定 Start 工作流输入的唯一数据源。
8. 最后处理 Condition、Start 等数组型或动态配置。

## 13. 最终结论

首期只需要采用以下结构：

```ts
NodeType.form
WorkflowNode.inputs
WorkflowNode.config
WorkflowNode.outputs
```

右侧面板统一组合：

```tsx
<InputEditor />
<ConfigFields />
<OutputEditor />
```

这样既能实现节点输入、输出在 Form 面板中填写，也不会让每个节点重复维护面板布局配置。

当前唯一需要在实施前进一步确定的是 Start 节点输入字段的重复数据来源。
