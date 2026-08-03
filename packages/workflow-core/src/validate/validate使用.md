# validate 校验文档

工作流校验分为两层：

1. `workflowSchema`：数据结构校验，校验外部输入的数据结构。
2. `validation`：业务校验，校验节点配置、动态端口、连线、Loop 结构和节点输入引用。

数据结构校验通过后，根据业务场景调用 `validateWorkflow()` 或`validateExecutorWorkflow()`。两个方法只接收已经由 `workflowSchema` 解析的`Workflow`。

## 校验入口

| 规则                      | `validateWorkflow()` | `validateExecutorWorkflow()` |
| ------------------------- | -------------------- | ---------------------------- |
| 节点 ID 唯一              | 是                   | 是                           |
| 节点类型已注册            | 是                   | 是                           |
| 节点配置和动态端口合法    | 是                   | 是                           |
| 边 ID 唯一                | 是                   | 是                           |
| 源节点和目标节点存在      | 是                   | 是                           |
| 不存在完全重复的连线      | 是                   | 是                           |
| 源端口和目标端口存在      | 是                   | 是                           |
| 端口连接数符合 `multiple` | 是                   | 是                           |
| Loop 父子与作用域结构合法 | 是                   | 是                           |
| 节点输入变量引用合法      | 是                   | 是                           |
| 必填输入端口已有连线      | 否                   | 是                           |
| 不存在循环依赖            | 否                   | 是                           |

Edge 不按 `dataType` 阻止连线；`dataType` 描述节点变量，不属于当前画布连线校验规则。

`validateWorkflow()` 用于编辑和保存，允许工作流暂时不完整。

`validateExecutorWorkflow()` 用于执行前校验，已经包含 `validateWorkflow()` 的全部规则，并追加
必填输入端口和有向无环检查；调用方不需要先调用 `validateWorkflow()`。

## 调用关系

```text
原始数据
  ↓
workflowSchema.safeParse()
  ├── validateWorkflow()
  │     └── collectWorkflowValidationResult()
  │           ├── validateNodes()
  │           │     └── nodeType.schema.safeParse(node.config)
  │           │           ├── 失败 → report(config 错误)
  │           │           └── 成功 → 使用 result.data 解析动态端口
  │           ├── validateEdges()
  │           ├── validateLoopStructure()
  │           └── validateVariableReferences()
  └── validateExecutorWorkflow()
        ├── collectWorkflowValidationResult()
        ├── validateRequiredNodeInputs()
        └── validateAcyclicWorkflow()
```

## 调用示例

### 工作流数据结构校验

原始数据通常来自：

- 前端编辑器提交的 JSON
- 后端接口请求体
- 数据库读取的 JSON
- 导入的工作流文件

```ts
const rawWorkflow = await request.json()
const parsed = workflowSchema.safeParse(rawWorkflow)
```

如果结构错误：

```ts
if (!parsed.success) {
  return parsed.error.issues
}
```

如果成功，parsed.data 才是可以交给业务校验的 Workflow（也就是下面的步骤了）：

```ts
const issues = validateWorkflow(parsed.data, nodeRegistry)
```

### 编辑或保存工作流【业务校验】

`validateWorkflow()` 用于校验当前已经存在的节点和连线，不要求必填输入端口全部连接，
也不校验循环依赖。

```ts
const parsed = workflowSchema.safeParse(rawWorkflow)

if (!parsed.success) {
  return parsed.error.issues
}

const issues = validateWorkflow(parsed.data, nodeRegistry)

if (issues.length > 0) {
  return issues
}

await saveWorkflow(parsed.data)
```

### 执行工作流【业务校验】

执行前直接调用 `validateExecutorWorkflow()`，不需要先调用 `validateWorkflow()`。

```ts
const parsed = workflowSchema.safeParse(rawWorkflow)

if (!parsed.success) {
  return parsed.error.issues
}

const issues = validateExecutorWorkflow(parsed.data, nodeRegistry)

if (issues.length > 0) {
  return issues
}

await executeWorkflow(parsed.data)
```
