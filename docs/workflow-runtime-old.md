## 10. Runtime 变量解析

### 10.1 解析单个变量值

#### 文件路径

```text
packages/workflow-runtime/src/variable/resolve-variable-value.ts
```

#### 文件作用

统一解析直接值和变量引用，让具体节点执行器不需要分别判断`node`、`system`、`env`。

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
