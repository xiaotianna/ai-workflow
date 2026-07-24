# 0000工作流节点端口与变量设计提案

> 状态：设计提案，尚未在业务代码中实现。
>
> 本文用于约束后续 `@ai-workflow/core`、`@ai-workflow/form` 和
> `@ai-workflow/runtime` 的实现方向。文中的文件路径均为建议路径，真正实现时需要同步更新
> `.agents/skills/ai-workflow-packages/references/workflow-core.md` 等对应技能文档。

## 1. 设计目标

本方案解决以下问题：

1. 普通节点不需要重复手写 `ports.inputs` 和 `ports.outputs`。
2. 工厂函数默认给普通节点生成一个输入端口和一个输出端口。
3. Start、End、Condition 等特殊节点可以关闭或动态生成端口。
4. 一个输出端口可以传递包含多个变量的完整对象。
5. 节点输入值可以来自：
   - 输入框直接填写；
   - 上游节点输出；
   - 系统变量；
   - Env 环境变量。
6. `Workflow.outputs` 同时保存稳定的输出字段描述和每个字段的实际取值来源。
7. End 只表示当前执行路径结束，不重复保存 Workflow 输出配置。
8. 子工作流节点复用被调用 Workflow 的公开输出字段，不依赖其内部节点和 End 实现。
9. 保留现有项目中的核心命名：
   - `NodeType`
   - `NodeDefinition`
   - `schema`
   - `definition`
   - `config`
   - `ports.inputs`
   - `ports.outputs`
   - `createInitialConfig`
   - `resolvePorts`
   - `PortDefinition`
   - `PortMap`

## 2. 核心概念

### 2.1 Port 是连接端点

Port 决定画布上有多少个 Handle，以及 Edge 应连接哪个 Handle。

例如普通节点：

```text
input → Node → result
```

对应：

```ts
{
  ports: {
    inputs: {
      input: {},
    },
    outputs: {
      result: {},
    },
  },
}
```

### 2.2 变量是 Port 携带对象中的字段

`result` 端口可以一次输出整个对象：

```ts
{
  res: {
    name: '张三',
    age: 18,
  },
}
```

画布上仍然只有一个 `result` Handle，不会因为存在 `res.name` 和 `res.age`
而生成两个输出端口。

变量引用通过三段信息定位：

```text
nodeId → portId → path
```

引用 `res.name`：

```ts
{
  scope: 'node',
  nodeId: 'node-1',
  portId: 'result',
  path: ['res', 'name'],
}
```

引用整个 `res`：

```ts
{
  scope: 'node',
  nodeId: 'node-1',
  portId: 'result',
  path: ['res'],
}
```

引用整个 `result` 端口：

```ts
{
  scope: 'node',
  nodeId: 'node-1',
  portId: 'result',
  path: [],
}
```

### 2.3 Config 只保存节点实例配置

用户在编辑器中填写或选择的值保存在 `WorkflowNode.config`。

例如：

```ts
{
  id: 'end-1',
  type: 'end',
  config: {},
}
```

Workflow 的稳定输出字段及其取值来源保存在 `Workflow.outputs`。End 只表示流程结束，
不在 `WorkflowNode.config` 中重复保存最终输出配置。固定端口属于 `NodeDefinition`，
运行时产生的真实值属于 Runtime。

## 3. 建议文件结构

```text
packages/workflow-core/src/
├── workflow/
│   ├── workflow-schema.ts
│   └── workflow-output-schema.ts
├── node/
│   ├── create-node-definition.ts
│   ├── node-definition.ts
│   └── index.ts
├── port/
│   ├── port-presets.ts
│   ├── port-types.ts
│   └── index.ts
├── variable/
│   ├── variable-reference-schema.ts
│   ├── variable-value-schema.ts
│   └── index.ts
└── nodes/
    └── end/
        ├── definition.ts
        ├── schema.ts
        └── index.ts

packages/workflow-runtime/src/
├── variable/
│   ├── resolve-variable-value.ts
│   └── index.ts
└── workflow/
    ├── resolve-workflow-output.ts
    └── index.ts
```

### 文件职责一览

| 建议文件路径                                                        | 文件作用                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `packages/workflow-core/src/workflow/workflow-output-schema.ts`     | 定义 Workflow 输出字段及其实际取值来源                            |
| `packages/workflow-core/src/workflow/workflow-schema.ts`            | 保存节点、边和 Workflow 输出配置                                  |
| `packages/workflow-core/src/port/port-presets.ts`                   | 定义默认输入、输出端口 ID 和默认端口配置                          |
| `packages/workflow-core/src/node/create-node-definition.ts`         | 根据普通、源节点、终点、分支等模式自动生成 `NodeDefinition.ports` |
| `packages/workflow-core/src/variable/variable-reference-schema.ts`  | 定义节点、系统、Env 三类变量引用                                  |
| `packages/workflow-core/src/variable/variable-value-schema.ts`      | 定义直接值和变量引用两种取值方式                                  |
| `packages/workflow-core/src/nodes/end/definition.ts`                | 定义 End 节点静态元信息及其单输入、无输出端口                     |
| `packages/workflow-core/src/nodes/end/schema.ts`                    | 定义 End 的空配置结构                                             |
| `packages/workflow-core/src/nodes/end/index.ts`                     | 组合 End 的 schema、definition 和初始配置工厂                     |
| `packages/workflow-runtime/src/variable/resolve-variable-value.ts`  | 在运行时解析直接值和引用值                                        |
| `packages/workflow-runtime/src/workflow/resolve-workflow-output.ts` | 解析 `Workflow.outputs[].value` 并组装最终输出对象                |

## 4. 默认端口配置

### 文件路径

```text
packages/workflow-core/src/port/port-presets.ts
```

### 文件作用

统一普通节点的默认端口配置，避免不同节点重复定义或出现不一致的端口 ID。

### 示例代码

```ts
import { DATA_TYPE_KINDS } from './data-types'
import type { PortDefinition } from './port-types'

export const DEFAULT_INPUT_PORT_ID = 'input'
export const DEFAULT_OUTPUT_PORT_ID = 'result'

export const DEFAULT_INPUT_PORT = {
  label: '输入',
  dataType: DATA_TYPE_KINDS.JSON,
  required: true,
} satisfies PortDefinition

export const DEFAULT_OUTPUT_PORT = {
  label: '结果',
  dataType: DATA_TYPE_KINDS.JSON,
  multiple: true,
} satisfies PortDefinition
```

### 导出内容作用

| 导出内容                 | 作用                       |
| ------------------------ | -------------------------- |
| `DEFAULT_INPUT_PORT_ID`  | 普通节点默认输入 Handle ID |
| `DEFAULT_OUTPUT_PORT_ID` | 普通节点默认输出 Handle ID |
| `DEFAULT_INPUT_PORT`     | 普通节点默认输入端口配置   |
| `DEFAULT_OUTPUT_PORT`    | 普通节点默认输出端口配置   |

默认使用 `result` 而不是 `output`，是为了让引用表达更符合节点执行结果的语义：

```text
llm-1.result.text
```

节点可以覆盖默认端口 ID，例如 HTTP 节点可以使用 `response`。

## 5. NodeDefinition 工厂

### 文件路径

```text
packages/workflow-core/src/node/create-node-definition.ts
```

### 文件作用

为普通节点自动生成一进一出的 `ports`，并为 Start、End、Condition 和自定义多端口节点
提供轻量例外配置。

开发者不需要手写：

```ts
ports: {
  inputs: {
    input: {},
  },
  outputs: {
    result: {},
  },
}
```

### 示例代码

```ts
import type { DataType } from '../port/data-types'
import {
  DEFAULT_INPUT_PORT,
  DEFAULT_INPUT_PORT_ID,
  DEFAULT_OUTPUT_PORT,
  DEFAULT_OUTPUT_PORT_ID,
} from '../port/port-presets'
import type { PortDefinition, PortMap } from '../port/port-types'
import type { NodeDefinition } from './node-definition'

interface PortOptions extends Omit<PortDefinition, 'dataType'> {
  id?: string
  dataType?: DataType
}

interface CreateNodeDefinitionOptions extends Omit<NodeDefinition, 'ports'> {
  inputPort?: string | PortOptions | false
  outputPort?: string | PortOptions | false
}

type NormalizedPort = PortDefinition & {
  id: string
}

const normalizePort = (
  port: string | PortOptions | false | undefined,
  defaultId: string,
  defaultDefinition: PortDefinition,
): false | NormalizedPort => {
  if (port === false) {
    return false
  }

  if (typeof port === 'string') {
    return {
      id: port,
      ...defaultDefinition,
    }
  }

  return {
    id: port?.id ?? defaultId,
    ...defaultDefinition,
    ...port,
  }
}

const createPortMap = (port: false | NormalizedPort): PortMap => {
  if (port === false) {
    return {}
  }

  const { id, dataType, ...definition } = port

  return {
    [id]: {
      dataType,
      ...definition,
    },
  }
}

export const createNodeDefinition = (options: CreateNodeDefinitionOptions): NodeDefinition => {
  const { inputPort, outputPort, ...definition } = options

  const normalizedInput = normalizePort(inputPort, DEFAULT_INPUT_PORT_ID, DEFAULT_INPUT_PORT)

  const normalizedOutput = normalizePort(outputPort, DEFAULT_OUTPUT_PORT_ID, DEFAULT_OUTPUT_PORT)

  return {
    ...definition,
    ports: {
      inputs: createPortMap(normalizedInput),
      outputs: createPortMap(normalizedOutput),
    },
  }
}
```

### 方法作用

#### `normalizePort()`

把开发者传入的简写形式转换成完整端口配置：

```ts
outputPort: 'response'
```

转换为：

```ts
{
  id: 'response',
  label: '结果',
  dataType: 'json',
  multiple: true,
}
```

传入 `false` 表示该方向没有端口。

#### `createPortMap()`

把一个规范化端口转换成当前项目使用的 `PortMap`：

```ts
{
  result: {
    label: '结果',
    dataType: 'json',
  },
}
```

#### `createNodeDefinition()`

组合节点静态元信息和自动生成的输入输出端口，最终返回现有的
`NodeDefinition`，不改变 `NodeType.definition` 的类型。

### 使用示例

普通 LLM 节点：

```ts
export const llmNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.LLM,
  label: 'LLM',
  description: '调用大语言模型',
  icon: BuiltinNodeType.LLM,
})
```

自动生成：

```ts
{
  ports: {
    inputs: {
      input: {
        label: '输入',
        dataType: 'json',
        required: true,
      },
    },
    outputs: {
      result: {
        label: '结果',
        dataType: 'json',
        multiple: true,
      },
    },
  },
}
```

HTTP 节点覆盖输出端口名称：

```ts
export const httpNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.HTTP,
  label: 'HTTP 请求',
  outputPort: {
    id: 'response',
    label: '响应',
  },
})
```

Start 节点关闭输入端口：

```ts
export const startNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.START,
  label: '开始',
  inputPort: false,
  outputPort: 'variables',
})
```

End 节点关闭输出端口：

```ts
export const endNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.END,
  label: '输出',
  outputPort: false,
})
```

Condition 节点先关闭固定输出端口，继续使用现有 `resolvePorts()` 根据
`config.conditions` 动态生成分支端口：

```ts
export const conditionNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.CONDITION,
  label: '条件分支',
  outputPort: false,
})
```

## 6. 变量引用 Schema

### 文件路径

```text
packages/workflow-core/src/variable/variable-reference-schema.ts
```

### 文件作用

统一描述变量来自哪个作用域，并提供可被所有节点复用的 Zod Schema。

### 示例代码

```ts
import { z } from 'zod'

const variablePathSchema = z.array(z.string().trim().min(1)).default([])

const nodeVariableReferenceSchema = z.object({
  scope: z.literal('node'),
  nodeId: z.string().trim().min(1),
  portId: z.string().trim().min(1),
  path: variablePathSchema,
})

const systemVariableReferenceSchema = z.object({
  scope: z.literal('system'),
  key: z.string().trim().min(1),
  path: variablePathSchema,
})

const envVariableReferenceSchema = z.object({
  scope: z.literal('env'),
  variableId: z.string().trim().min(1),
  path: variablePathSchema,
})

export const variableReferenceSchema = z.discriminatedUnion('scope', [
  nodeVariableReferenceSchema,
  systemVariableReferenceSchema,
  envVariableReferenceSchema,
])

export type VariableReference = z.output<typeof variableReferenceSchema>
```

### 字段作用

| 字段         | 作用                                        |
| ------------ | ------------------------------------------- |
| `scope`      | 区分节点、系统和 Env 三类变量来源           |
| `nodeId`     | 节点变量来源的节点实例 ID                   |
| `portId`     | 节点变量来源的输出端口 ID，例如 `result`    |
| `key`        | 系统变量的稳定 Key，例如 `user_id`          |
| `variableId` | Env 变量的稳定 ID，避免保存真实值或可变名称 |
| `path`       | 从端口或变量值中读取嵌套字段                |

## 7. 变量值 Schema

### 文件路径

```text
packages/workflow-core/src/variable/variable-value-schema.ts
```

### 文件作用

统一描述一个配置值如何产生，支持：

1. 用户直接输入；
2. 引用节点、系统或 Env 变量；

该结构既可以用于节点输入，也可以用于 `Workflow.outputs[].value`。

节点引用使用 `nodeId + portId` 定位端口值，再通过 `path` 读取端口值中的嵌套字段。
`path: []` 返回整个端口值，`path: ['name']` 返回端口值中的 `name` 字段。

### 示例代码

```ts
import { z } from 'zod'
import { variableReferenceSchema } from './variable-reference-schema'

export const variableValueSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('value'),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('reference'),
    reference: variableReferenceSchema,
  }),
])

export type VariableValue = z.output<typeof variableValueSchema>
```

### 两种类型作用

#### `type: 'value'`

保存输入框直接填写的值：

```ts
{
  type: 'value',
  value: '张三',
}
```

#### `type: 'reference'`

保存变量引用：

```ts
{
  type: 'reference',
  reference: {
    scope: 'node',
    nodeId: 'user-1',
    portId: 'result',
    path: ['name'],
  },
}
```

该引用会读取 `user-1` 节点 `result` 端口值中的 `name` 字段。将 `path` 设置为 `[]`
则会返回整个 `result` 端口值。

## 8. Workflow 输出 Schema

### 文件路径

```text
packages/workflow-core/src/workflow/workflow-output-schema.ts
```

### 文件作用

定义 Workflow 的最终输出字段。每个字段同时包含：

1. `key`、`label`、`dataType`、`description`：对外公开的稳定字段描述；
2. `value`：仅供当前 Workflow 内部使用的实际取值来源。

调用工作流、发布工作流接口或创建子工作流节点时，只暴露字段描述，不暴露 `value`
中的内部节点 ID、端口 ID 或环境变量引用。

### 示例代码

```ts
import { z } from 'zod'
import { DATA_TYPE_VALUES } from '../port/data-types'
import { variableValueSchema } from '../variable/variable-value-schema'

export const workflowOutputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, '变量名不能为空')
    .regex(/^[a-zA-Z_]\w*$/, '变量名格式不正确'),
  label: z.string().trim().min(1, '显示名称不能为空'),
  dataType: z.enum(DATA_TYPE_VALUES),
  description: z.string().trim().optional(),
  value: variableValueSchema,
})

export const workflowOutputsSchema = z
  .array(workflowOutputSchema)
  .superRefine((outputs, context) => {
    const keys = new Set<string>()

    outputs.forEach((output, index) => {
      if (keys.has(output.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: `工作流输出字段不能重复：${output.key}`,
        })
      }

      keys.add(output.key)
    })
  })

export type WorkflowOutput = z.output<typeof workflowOutputSchema>
export type WorkflowOutputs = z.output<typeof workflowOutputsSchema>
export type WorkflowOutputContract = Omit<WorkflowOutput, 'value'>
```

### 字段作用

| 字段          | 作用                               |
| ------------- | ---------------------------------- |
| `key`         | 最终输出对象中的稳定字段名         |
| `label`       | 编辑器和调用方界面中展示的名称     |
| `dataType`    | 最终字段对外声明的数据类型         |
| `description` | 可选的字段说明                     |
| `value`       | 该字段在当前 Workflow 中的取值来源 |

### Workflow Schema 接入

```ts
import { z } from 'zod'
import { workflowEdgeSchema } from '../edge/workflow-edge-schema'
import { workflowNodeSchema } from '../node/workflow-node-schema'
import { workflowOutputsSchema } from './workflow-output-schema'

export const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  outputs: workflowOutputsSchema.default([]),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
})
```

Workflow 可以声明：

```ts
outputs: [
  {
    key: 'name',
    label: '用户名',
    dataType: 'string',
    value: {
      type: 'reference',
      reference: {
        scope: 'node',
        nodeId: 'user-1',
        portId: 'result',
        path: ['name'],
      },
    },
  },
  {
    key: 'age',
    label: '年龄',
    dataType: 'number',
    value: {
      type: 'value',
      value: 18,
    },
  },
]
```

Runtime 解析 `value` 后得到：

```ts
{
  name: '张三',
  age: 18,
}
```

对子工作流或外部调用方公开时，只使用：

```ts
;[
  {
    key: 'name',
    label: '用户名',
    dataType: 'string',
  },
  {
    key: 'age',
    label: '年龄',
    dataType: 'number',
  },
]
```

`outputs` 在编辑和保存阶段允许为空，执行或发布前再根据产品规则判断是否必须声明输出。

## 9. End 节点示例

### 9.1 Definition

#### 文件路径

```text
packages/workflow-core/src/nodes/end/definition.ts
```

#### 文件作用

声明 End 节点的静态元信息。End 是终点节点，因此只接收上游结果，不再生成下游输出端口。
End 不拥有 Workflow 的输出格式和取值来源。输入 Edge 用于确定执行路径已经到达该 End，
最终字段值统一由 Runtime 解析 `Workflow.outputs[].value`。

#### 示例代码

```ts
import { createNodeDefinition } from '../../node/create-node-definition'
import { DATA_TYPE_KINDS } from '../../port/data-types'
import { BuiltinNodeType } from '../builtin-node-types'

export const endNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.END,
  label: '输出',
  description: '接收上游结果并结束工作流',
  icon: BuiltinNodeType.END,
  inputPort: {
    id: 'result',
    label: '最终结果',
    description: '工作流最终返回的结果',
    dataType: DATA_TYPE_KINDS.JSON,
    required: true,
    multiple: true,
  },
  outputPort: false,
})
```

自动生成：

```ts
{
  ports: {
    inputs: {
      result: {
        label: '最终结果',
        dataType: 'json',
        description: '工作流最终返回的结果',
        required: true,
        multiple: true,
      },
    },
    outputs: {},
  },
}
```

### 9.2 Schema

#### 文件路径

```text
packages/workflow-core/src/nodes/end/schema.ts
```

#### 文件作用

End 不保存最终输出字段或取值来源，因此配置 Schema 为空对象。

#### 示例代码

```ts
import { z } from 'zod'

export const endNodeSchema = z.object({})

export type EndNodeConfig = z.output<typeof endNodeSchema>
```

如果 Workflow 存在多个 End，它们共享同一份 `Workflow.outputs`。执行前需要校验每个
`output.value` 引用的节点是否会在相应的结束路径上产生结果。

### 9.3 Index

#### 文件路径

```text
packages/workflow-core/src/nodes/end/index.ts
```

#### 文件作用

组合 End 节点的配置 Schema、静态 Definition 和初始配置工厂，形成完整的 `NodeType`。

#### 示例代码

```ts
import { createInitialConfig } from '../../node/create-initial-config'
import type { NodeType } from '../../node/node-definition'
import { endNodeDefinition } from './definition'
import { endNodeSchema } from './schema'

export const endNode = {
  schema: endNodeSchema,
  definition: endNodeDefinition,
  createInitialConfig: () => createInitialConfig(endNodeSchema),
} satisfies NodeType<typeof endNodeSchema>

export type { EndNodeConfig } from './schema'
```

初始配置：

```ts
{
}
```

## 10. Runtime 变量解析

### 10.1 解析单个变量值

#### 文件路径

```text
packages/workflow-runtime/src/variable/resolve-variable-value.ts
```

#### 文件作用

统一解析直接值和变量引用，让具体节点执行器不需要分别判断
`node`、`system`、`env`。

#### 示例运行上下文

```ts
interface WorkflowRuntimeContext {
  nodeOutputs: Readonly<Record<string, Readonly<Record<string, unknown>>>>

  system: Readonly<Record<string, unknown>>

  environment: {
    get(variableId: string): unknown
  }
}
```

#### 示例代码

```ts
import type { VariableReference } from '@ai-workflow/core'
import type { VariableValue } from '@ai-workflow/core'

const getValueByPath = (value: unknown, path: readonly string[]): unknown => {
  return path.reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }

    return Reflect.get(current, key)
  }, value)
}

const resolveVariableReference = (
  reference: VariableReference,
  context: WorkflowRuntimeContext,
): unknown => {
  switch (reference.scope) {
    case 'node': {
      const portValue = context.nodeOutputs[reference.nodeId]?.[reference.portId]

      return getValueByPath(portValue, reference.path)
    }

    case 'system': {
      return getValueByPath(context.system[reference.key], reference.path)
    }

    case 'env': {
      return getValueByPath(context.environment.get(reference.variableId), reference.path)
    }
  }
}

export const resolveVariableValue = (
  variableValue: VariableValue,
  context: WorkflowRuntimeContext,
): unknown => {
  switch (variableValue.type) {
    case 'value':
      return variableValue.value

    case 'reference':
      return resolveVariableReference(variableValue.reference, context)
  }
}
```

### 方法作用

| 方法                         | 作用                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `getValueByPath()`           | 根据 `path` 从对象中安全读取嵌套字段                          |
| `resolveVariableReference()` | 根据 `scope` 从节点输出、系统上下文或 Env Provider 中读取变量 |
| `resolveVariableValue()`     | 解析直接值或引用值                                            |

Runtime 不应在 Core 或节点 Schema 中直接调用 `process.env`。Env 的真实值应通过服务端注入的
`environment.get()` 获取，工作流 JSON 只保存 `variableId`。

### 10.2 组装 Workflow 最终输出

#### 文件路径

```text
packages/workflow-runtime/src/workflow/resolve-workflow-output.ts
```

#### 文件作用

按照 `Workflow.outputs` 的字段顺序解析每个 `output.value`，并组装成最终输出对象。
End 只提供“当前执行路径已经结束”的信号，不参与输出字段解析。

#### 示例代码

```ts
import type { WorkflowOutput } from '@ai-workflow/core'
import { resolveVariableValue } from '../variable/resolve-variable-value'

export const resolveWorkflowOutput = (
  outputs: readonly WorkflowOutput[],
  context: WorkflowRuntimeContext,
): Record<string, unknown> => {
  return Object.fromEntries(
    outputs.map((output) => [output.key, resolveVariableValue(output.value, context)]),
  )
}
```

### 方法作用

`resolveWorkflowOutput()` 负责：

1. 遍历 Workflow 声明的输出字段；
2. 使用 `resolveVariableValue()` 解析 `output.value`；
3. 使用 `output.key` 组装最终返回对象。

例如 Workflow 输出配置：

```ts
outputs: [
  {
    key: 'name',
    label: '用户名',
    dataType: 'string',
    value: {
      type: 'reference',
      reference: {
        scope: 'node',
        nodeId: 'user-1',
        portId: 'result',
        path: ['name'],
      },
    },
  },
  {
    key: 'age',
    label: '年龄',
    dataType: 'number',
    value: {
      type: 'value',
      value: 18,
    },
  },
]
```

最终解析为：

```ts
{
  name: '张三',
  age: 18,
}
```

`key`、`label`、`dataType`、`description` 构成对外字段描述，`value` 只负责在当前 Workflow
内部生成该字段的实际结果。

## 11. 单端口对象输出与子工作流

如果一个普通节点拥有一个名为 `result` 的输出端口，Runtime 应以端口 ID 为第一层保存：

```ts
context.nodeOutputs[node.id] = {
  result: {
    name: '张三',
    age: 18,
  },
}
```

对应结构：

```text
nodeOutputs
└── node.id
    └── result        # Port
        ├── name      # 嵌套变量
        └── age       # 嵌套变量
```

Edge 只连接 `result`：

```ts
{
  source: 'node-1',
  sourceHandle: 'result',
  target: 'node-2',
  targetHandle: 'input',
}
```

变量选择器通过 `path` 选择具体字段：

```ts
{
  scope: 'node',
  nodeId: 'node-1',
  portId: 'result',
  path: ['name'],
}
```

因此，添加、删除 `result.name` 或 `result.age` 不会影响画布端口数量，也不会改变现有 Edge
的 `sourceHandle`。

### 11.1 子工作流输出

子工作流节点引用另一个 Workflow 时，应从被调用 Workflow 的 `outputs` 中投影出公开字段，
不向调用方暴露内部 `value`：

```ts
const outputContract = calledWorkflow.outputs.map(({ value: _value, ...output }) => output)
```

得到：

```ts
;[
  {
    key: 'name',
    label: '用户名',
    dataType: 'string',
  },
  {
    key: 'age',
    label: '年龄',
    dataType: 'number',
  },
]
```

子工作流节点在画布上仍可以只提供一个 `result` 输出端口：

```ts
ports: {
  outputs: {
    result: {
      label: '工作流结果',
      dataType: DATA_TYPE_KINDS.JSON,
    },
  },
}
```

执行后保存：

```ts
context.nodeOutputs['subworkflow-1'] = {
  result: {
    name: '张三',
    age: 18,
  },
}
```

调用方使用：

```ts
{
  type: 'reference',
  reference: {
    scope: 'node',
    nodeId: 'subworkflow-1',
    portId: 'result',
    path: ['name'],
  },
}
```

子工作流节点的变量选择器可以根据被调用 Workflow 的 `outputs` 展示 `name` 和 `age`，
但不能使用其中的 `value`。`value` 内部引用的节点、端口和环境变量只属于被调用 Workflow。
内部实现变化时，只要公开字段描述不变，调用方就不需要修改。

## 12. 表单层职责

建议后续由 `@ai-workflow/form` 提供统一的变量值编辑器，但不在 Core 中包含 React 代码。

表单需要分别处理：

1. Workflow 输出编辑器：维护 `Workflow.outputs` 的 key、label、dataType、description 和 value；
2. 子工作流节点编辑器：选择目标 Workflow，并读取其公开输入输出字段；
3. 通用变量值编辑器：根据 `VariableValue.type` 渲染直接值或引用值配置。

通用变量值编辑器的渲染方式：

| `type`      | UI                                        |
| ----------- | ----------------------------------------- |
| `value`     | 普通输入框、数字框、Switch 或 JSON 编辑器 |
| `reference` | 节点、系统变量、Env 变量选择器            |

Workflow 输出编辑器更新 `Workflow.outputs`。End 没有最终输出配置，表单不负责解析真实运行值。

## 13. 校验职责

### Zod 结构校验

负责：

- Workflow 输出字段 `key` 格式；
- Workflow 输出字段名是否重复；
- `scope` 枚举；
- `nodeId`、`portId`、`variableId` 非空；
- `Workflow.outputs[].value` 和 `VariableValue` 的基础结构。

### 工作流语义校验

`validateWorkflow()` 或后续公共变量校验器负责：

- 引用节点是否存在；
- 引用端口是否存在；
- Workflow 输出引用的节点是否能够到达 End；
- `path` 指向的字段是否存在；
- 来源数据类型是否兼容 Workflow 输出字段声明的类型；
- Env 变量是否存在；
- 系统变量是否已经注册；
- 是否出现自引用或循环引用；
- 子工作流引用的目标 Workflow 是否存在。

### 执行前校验

`validateExecutorWorkflow()` 负责：

- 必填输入是否已经配置；
- Workflow 是否已经声明可执行所需的输出字段；
- 每个 `Workflow.outputs[].value` 是否能在本次到达的 End 路径上解析；
- 敏感 Env 是否可以在当前执行上下文中读取；
- 所有引用是否可以在当前执行路径上解析；
- 子工作流的公开输出契约是否与调用节点期望一致。

## 14. 实施顺序

建议按以下顺序落地，避免一次性扩大改动范围：

1. 新增 `variable-reference-schema.ts`。
2. 新增 `variable-value-schema.ts`。
3. 在 `workflow/workflow-output-schema.ts` 中定义 Workflow 输出字段及其取值来源。
4. 将 `Workflow.outputs` 接入 `workflow-schema.ts`。
5. 新增 `port-presets.ts` 和 `create-node-definition.ts`。
6. 保持 End 配置为空，只承担结束路径语义。
7. 在 Core 中补充 Workflow 输出字段、取值来源和变量引用语义校验。
8. 在 Runtime 中实现变量值解析与 `resolve-workflow-output.ts`。
9. 实现 Form 的 Workflow 输出编辑器和变量值编辑器。
10. 子工作流节点通过目标 Workflow 的公开契约生成输入输出配置。
11. 再逐步迁移 Start、LLM、HTTP 和其他节点。

在真正实施前，不应删除现有 `resolvePorts()`。Condition 等动态端口节点仍然需要通过
`resolvePorts(parsedConfig)` 生成稳定的动态 Handle。
