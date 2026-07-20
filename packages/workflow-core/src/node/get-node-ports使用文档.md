# get-node-ports的使用

适用范围包括：

- React 节点 Handle 渲染
- 创建连线时的数据类型校验
- 删除分支时检查受影响的连线
- 工作流运行前校验
- 服务端执行工作流

## 1. 渲染画布端口

```tsx
function WorkflowNode({ node }: { node: WorkflowNode }) {
  const nodeType = nodeRegistry[node.type]
  const ports = getNodePorts(nodeType, node.config)

  return (
    <div>
      {Object.entries(ports.inputs).map(([key, port]) => (
        <Handle key={key} id={key} type="target" position={Position.Left} />
      ))}

      {Object.entries(ports.outputs).map(([key, port]) => (
        <Handle key={key} id={key} type="source" position={Position.Right} />
      ))}
    </div>
  )
}
```

## 2. 连线时校验

```ts
function canConnect(
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
  sourceHandle: string,
  targetHandle: string,
) {
  const sourceType = nodeRegistry[sourceNode.type]
  const targetType = nodeRegistry[targetNode.type]

  const sourcePorts = getNodePorts(sourceType, sourceNode.config)
  const targetPorts = getNodePorts(targetType, targetNode.config)

  const output = sourcePorts.outputs[sourceHandle]
  const input = targetPorts.inputs[targetHandle]

  if (!output || !input) {
    return false
  }

  return output.dataType === input.dataType
}
```

## 3. 配置变化后端口自动更新

例如开始节点新增一个变量：

```ts
node.config = {
  inputs: [
    {
      key: 'username',
      label: '用户名',
      dataType: 'string',
      required: true,
    },
  ],
}
```

重新执行：

```ts
const ports = getNodePorts(startNode, node.config)
```

得到：

```ts
{
  ports: {
    inputs: {},
    outputs: {
      username: {
        label: '用户名',
        dataType: 'string',
        required: true,
      },
    },
  },
}
```

## 4. 调用链路

```
node.config
    ↓
schema.parse()
    ↓
resolvePorts(config)
    ↓
画布渲染 / 连线校验 / 运行时取值
```
