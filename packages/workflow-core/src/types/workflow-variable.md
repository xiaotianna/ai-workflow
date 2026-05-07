# workflow-variable.ts 使用

该文件是作用在 `runtime/executor` 阶段的，不是应用于 DSL 阶段。

拿 `Start` 节点举例：

1. start节点的schema定义：

```ts
outputs: {
  variables: {
    dataType: {
      kind: WorkflowDataTypeKind.ARRAY,

      itemType: {
        kind: WorkflowDataTypeKind.CUSTOM,
        typeName: 'workflow-variable-definition'
      }
    }
  }
}
```

2. runtime输出：

```ts
const variables: WorkflowVariableDefinition[] = [
  {
    name: 'question',

    dataType: {
      kind: WorkflowDataTypeKind.STRING,
    },

    required: true,
  },
]
```

3. 使用：

```ts
import type { WorkflowVariables } from '../types'

export interface WorkflowRuntimeState {
  variables: WorkflowVariables

  nodeResults: Record<string, unknown>
}
```

runtime：

```ts
state.variables.question
```
