# validate 目录作用说明

作用：进行工作流的校验，整体分为三层校验：

1. `workflowSchema`：用于校验整体数据结构是否正确
2. `validateWorkflow()`：检查编辑、保存阶段已经存在的节点和连线是否合法
3. `validateExecutorWorkflow()`：在执行前校验，负责校验节点和边是否能构成一个可执行的工作流

调用关系如下：

```
原始数据
   ↓
workflowSchema.safeParse()
   ↓ 结构正确
validateWorkflow()
   ↓ 节点、端口、连线关系正确
validateExecutorWorkflow()
   ↓ 必填输入完整且不存在循环依赖
执行器
```

`validateExecutorWorkflow()` 内部会执行与 `validateWorkflow()` 相同的基础校验流程，因此调用方不需要先后调用两个函数。
