# data-type-registry.ts 使用

## 定义

1. 定义zod schema

```ts
import { z } from 'zod'

export const workflowVariableDefinitionSchema = z.object({
  name: z.string(),

  dataType: z.any(),

  required: z.boolean().optional(),

  defaultValue: z.unknown().optional(),
})
```

2. 定义ts类型

```ts
export type WorkflowVariableDefinition = z.infer<typeof workflowVariableDefinitionSchema>
```

3. 注册 custom type

```ts
import { registerCustomType } from './runtime/type-registry'

import { workflowVariableDefinitionSchema } from './types/workflow-variable-definition'

// 变量定义
registerCustomType('workflow-variable-definition', workflowVariableDefinitionSchema, {
  description: '工作流变量定义',
})

// tool call
registerCustomType('tool-call', toolCallSchema)
```

4. node-definition使用

```ts
outputs: {
  variables: {
    dataType: {
      kind: 'array',

      itemType: {
        kind: 'custom',

        typeName: 'workflow-variable-definition'
      }
    },

    label: 'Variables'
  }
}
```

## 后续的使用

拿 `start` 节点的 `outputs.variables` 来举例：

```ts
const port = node.outputs.variables
```

得到的结果：

```ts
{
  kind: 'custom',
  typeName: 'workflow-variable-definition'
}
```

获取schema：

```ts
const customType = getCustomType(port.dataType.typeName)
customType.schema.parse(value)
```
