# 工作流节点端口与变量设计提案

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
6. 支持用户组装嵌套对象，例如：

   ```ts
   {
     res: {
       name: '张三',
       age: 18,
     },
   }
   ```

7. 保留现有项目中的核心命名：
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
  config: {
    outputs: [],
  },
}
```

固定端口属于 `NodeDefinition`，运行时产生的真实值属于 Runtime，不应重复保存到
`WorkflowNode.config`。

## 3. 建议文件结构

```text
packages/workflow-core/src/
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
│   ├── output-variable-schema.ts
│   └── index.ts
└── nodes/
    └── end/
        ├── definition.ts
        ├── schema.ts
        └── index.ts

packages/workflow-runtime/src/
└── variable/
    ├── resolve-variable-value.ts
    ├── resolve-output-variables.ts
    └── index.ts
```

### 文件职责一览

| 建议文件路径                                                         | 文件作用                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `packages/workflow-core/src/port/port-presets.ts`                    | 定义默认输入、输出端口 ID 和默认端口配置                          |
| `packages/workflow-core/src/node/create-node-definition.ts`          | 根据普通、源节点、终点、分支等模式自动生成 `NodeDefinition.ports` |
| `packages/workflow-core/src/variable/variable-reference-schema.ts`   | 定义节点、系统、Env 三类变量引用                                  |
| `packages/workflow-core/src/variable/variable-value-schema.ts`       | 定义直接值、变量引用和对象字段映射三种取值方式                    |
| `packages/workflow-core/src/variable/output-variable-schema.ts`      | 定义用户配置的输出变量结构                                        |
| `packages/workflow-core/src/nodes/end/definition.ts`                 | 定义 End 节点静态元信息及其单输入、无输出端口                     |
| `packages/workflow-core/src/nodes/end/schema.ts`                     | 定义 End 节点实例的最终输出变量配置                               |
| `packages/workflow-core/src/nodes/end/index.ts`                      | 组合 End 的 schema、definition 和初始配置工厂                     |
| `packages/workflow-runtime/src/variable/resolve-variable-value.ts`   | 在运行时解析直接值、引用值，并按字段生成对象                      |
| `packages/workflow-runtime/src/variable/resolve-output-variables.ts` | 将输出变量配置组装成最终输出对象                                  |

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
3. 给对象的每个字段分别配置数据来源。

该结构既可以用于节点输入，也可以用于 End 等节点的输出变量配置。

第 3 种取值方式在本文中统一称为“对象字段映射”。它表示一个输出变量本身是 JSON
对象，并且对象里的不同字段可以来自不同位置。例如：

```text
res
├── name ← 节点 A 的 result.name
├── age  ← 节点 B 的 result.age
├── userId ← 系统变量 sys.user_id
└── enabled ← 输入框直接填写 true
```

解析后得到一个完整对象：

```ts
{
  res: {
    name: '张三',
    age: 18,
    userId: 'user-1',
    enabled: true,
  },
}
```

如果整个 `res` 都是输入框填写的固定 JSON，或者整个 `res` 直接引用某一个上游对象，
则不需要对象字段映射，分别使用 `type: 'value'` 或 `type: 'reference'` 即可。

### 示例代码

```ts
import { z } from 'zod'
import { variableReferenceSchema } from './variable-reference-schema'

export type VariableValue =
  | {
      type: 'value'
      value: unknown
    }
  | {
      type: 'reference'
      reference: z.output<typeof variableReferenceSchema>
    }
  | {
      type: 'object'
      properties: Record<string, VariableValue>
    }

export const variableValueSchema: z.ZodType<VariableValue> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('value'),
      value: z.unknown(),
    }),
    z.object({
      type: z.literal('reference'),
      reference: variableReferenceSchema,
    }),
    z.object({
      type: z.literal('object'),
      properties: z.record(z.string(), variableValueSchema),
    }),
  ]),
)
```

### 三种类型作用

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
    scope: 'system',
    key: 'user_id',
    path: [],
  },
}
```

#### 对象字段映射：`type: 'object'`

为对象的每个字段分别配置值来源。下面示例中，`name` 来自上游节点，`age`
来自输入框固定值：

```ts
{
  type: 'object',
  properties: {
    name: {
      type: 'reference',
      reference: {
        scope: 'node',
        nodeId: 'user-1',
        portId: 'result',
        path: ['name'],
      },
    },
    age: {
      type: 'value',
      value: 18,
    },
  },
}
```

解析结果：

```ts
{
  name: '张三',
  age: 18,
}
```

## 8. 输出变量 Schema

### 文件路径

```text
packages/workflow-core/src/variable/output-variable-schema.ts
```

### 文件作用

定义用户可配置的输出变量。适用于 End、变量聚合、对象构造等需要由用户决定输出字段的节点。

普通 LLM、HTTP 等节点的固定运行结果不需要保存为 `config.outputs`。

### 示例代码

```ts
import { z } from 'zod'
import { DATA_TYPE_VALUES } from '../port/data-types'
import { variableValueSchema } from './variable-value-schema'

export const outputVariableSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, '变量名不能为空')
    .regex(/^[a-zA-Z_]\w*$/, '变量名格式不正确'),
  label: z.string().trim().min(1, '显示名称不能为空'),
  dataType: z.enum(DATA_TYPE_VALUES),
  value: variableValueSchema,
})

export type OutputVariable = z.output<typeof outputVariableSchema>
```

### 字段作用

| 字段       | 作用                                                 |
| ---------- | ---------------------------------------------------- |
| `key`      | 最终输出对象中的字段名                               |
| `label`    | 编辑器中展示的名称                                   |
| `dataType` | 最终字段对外声明的数据类型                           |
| `value`    | 字段的取值配置，可以是直接值、变量引用或对象字段映射 |

### `res.name`、`res.age` 配置示例

```ts
{
  key: 'res',
  label: '用户结果',
  dataType: 'json',
  value: {
    type: 'object',
    properties: {
      name: {
        type: 'reference',
        reference: {
          scope: 'node',
          nodeId: 'user-1',
          portId: 'result',
          path: ['name'],
        },
      },
      age: {
        type: 'reference',
        reference: {
          scope: 'node',
          nodeId: 'user-1',
          portId: 'result',
          path: ['age'],
        },
      },
    },
  },
}
```

解析后的字段：

```ts
{
  res: {
    name: '张三',
    age: 18,
  },
}
```

## 9. End 节点示例

### 9.1 Definition

#### 文件路径

```text
packages/workflow-core/src/nodes/end/definition.ts
```

#### 文件作用

声明 End 节点的静态元信息。End 是终点节点，因此工厂生成一个输入端口，不生成输出端口。

#### 示例代码

```ts
import { createNodeDefinition } from '../../node/create-node-definition'
import { BuiltinNodeType } from '../builtin-node-types'

export const endNodeDefinition = createNodeDefinition({
  type: BuiltinNodeType.END,
  label: '输出',
  description: '声明工作流输出变量并结束工作流',
  icon: BuiltinNodeType.END,
  theme: '#f79009',
  outputPort: false,
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

校验 End 节点实例的 `config.outputs`，并确保同一个 End 节点内不存在重复输出变量名。

#### 示例代码

```ts
import { z } from 'zod'
import { outputVariableSchema } from '../../variable/output-variable-schema'

export const endNodeSchema = z
  .object({
    outputs: z.array(outputVariableSchema).default([]),
  })
  .superRefine(({ outputs }, context) => {
    const keys = new Set<string>()

    outputs.forEach((output, index) => {
      if (keys.has(output.key)) {
        context.addIssue({
          code: 'custom',
          path: ['outputs', index, 'key'],
          message: `输出变量名不能重复：${output.key}`,
        })
      }

      keys.add(output.key)
    })
  })

export type EndNodeConfig = z.output<typeof endNodeSchema>
```

`outputs` 默认允许为空，是为了保证节点刚创建、尚未完成配置时仍能生成合法初始配置。
执行前应由 `validateExecutorWorkflow()` 对 End 至少存在一个输出变量进行语义校验。

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
  outputs: [],
}
```

## 10. Runtime 变量解析

### 10.1 解析单个变量值

#### 文件路径

```text
packages/workflow-runtime/src/variable/resolve-variable-value.ts
```

#### 文件作用

统一解析直接值和变量引用；遇到对象字段映射时，逐个解析对象字段并生成完整对象。
这样具体节点执行器不需要分别判断 `node`、`system`、`env`。

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

    case 'object':
      return Object.fromEntries(
        Object.entries(variableValue.properties).map(([key, value]) => [
          key,
          resolveVariableValue(value, context),
        ]),
      )
  }
}
```

### 方法作用

| 方法                         | 作用                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| `getValueByPath()`           | 根据 `path` 从对象中安全读取嵌套字段                          |
| `resolveVariableReference()` | 根据 `scope` 从节点输出、系统上下文或 Env Provider 中读取变量 |
| `resolveVariableValue()`     | 解析直接值、引用值；遇到对象字段映射时递归生成完整对象        |

Runtime 不应在 Core 或节点 Schema 中直接调用 `process.env`。Env 的真实值应通过服务端注入的
`environment.get()` 获取，工作流 JSON 只保存 `variableId`。

### 10.2 组装输出变量

#### 文件路径

```text
packages/workflow-runtime/src/variable/resolve-output-variables.ts
```

#### 文件作用

将节点 `config.outputs` 中的变量配置解析成最终的完整输出对象。

#### 示例代码

```ts
import type { OutputVariable } from '@ai-workflow/core'
import { resolveVariableValue } from './resolve-variable-value'

export const resolveOutputVariables = (
  outputs: readonly OutputVariable[],
  context: WorkflowRuntimeContext,
): Record<string, unknown> => {
  return Object.fromEntries(
    outputs.map((output) => [output.key, resolveVariableValue(output.value, context)]),
  )
}
```

### 方法作用

`resolveOutputVariables()` 负责：

1. 遍历输出变量配置；
2. 使用 `resolveVariableValue()` 解析每个变量的真实值；
3. 使用 `output.key` 组装最终返回对象。

例如配置：

```ts
;[
  {
    key: 'res',
    value: {
      type: 'object',
      properties: {
        name: {
          type: 'value',
          value: '张三',
        },
        age: {
          type: 'value',
          value: 18,
        },
      },
    },
  },
]
```

最终解析为：

```ts
{
  res: {
    name: '张三',
    age: 18,
  },
}
```

## 11. 单端口对象输出

如果一个普通节点拥有一个名为 `result` 的输出端口，Runtime 应以端口 ID 为第一层保存：

```ts
context.nodeOutputs[node.id] = {
  result: {
    res: {
      name: '张三',
      age: 18,
    },
  },
}
```

对应结构：

```text
nodeOutputs
└── node.id
    └── result             # Port
        └── res            # 自定义变量
            ├── name       # 嵌套变量
            └── age        # 嵌套变量
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
  path: ['res', 'name'],
}
```

因此，添加、删除 `res.name` 或 `res.age` 不会影响画布端口数量，也不会改变现有 Edge 的
`sourceHandle`。

## 12. 表单层职责

建议后续由 `@ai-workflow/form` 提供统一的变量值编辑器，但不在 Core 中包含 React 代码。

表单需要根据 `VariableValue.type` 渲染：

| `type`      | UI                                                 |
| ----------- | -------------------------------------------------- |
| `value`     | 普通输入框、数字框、Switch 或 JSON 编辑器          |
| `reference` | 节点、系统变量、Env 变量选择器                     |
| `object`    | 对象字段映射编辑器，每个字段都可以选择自己的值来源 |

表单只更新 `WorkflowNode.config`，不负责保存工作流或解析真实运行值。

## 13. 校验职责

### Zod 结构校验

负责：

- `key` 格式；
- `scope` 枚举；
- `nodeId`、`portId`、`variableId` 非空；
- 对象表达式结构；
- 输出变量名是否重复。

### 工作流语义校验

`validateWorkflow()` 或后续公共变量校验器负责：

- 引用节点是否存在；
- 引用端口是否存在；
- 引用节点是否位于当前节点上游；
- `path` 指向的字段是否存在；
- 来源数据类型是否兼容目标数据类型；
- Env 变量是否存在；
- 系统变量是否已经注册；
- 是否出现自引用或循环引用。

### 执行前校验

`validateExecutorWorkflow()` 负责：

- 必填输入是否已经配置；
- End 是否至少配置一个输出变量；
- 敏感 Env 是否可以在当前执行上下文中读取；
- 所有引用是否可以在当前执行路径上解析。

## 14. 实施顺序

建议按以下顺序落地，避免一次性扩大改动范围：

1. 新增 `variable-reference-schema.ts`。
2. 新增 `variable-value-schema.ts`。
3. 新增 `output-variable-schema.ts`。
4. 新增 `port-presets.ts` 和 `create-node-definition.ts`。
5. 先迁移 End 节点验证设计。
6. 在 Core 中补充变量引用语义校验。
7. 初始化 Runtime 的变量解析契约。
8. 实现 Form 的统一变量值编辑器。
9. 再逐步迁移 Start、LLM、HTTP 和其他节点。

在真正实施前，不应删除现有 `resolvePorts()`。Condition 等动态端口节点仍然需要通过
`resolvePorts(parsedConfig)` 生成稳定的动态 Handle。
