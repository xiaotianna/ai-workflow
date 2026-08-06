# 远程沙箱调用实现状态

## 结论

当前已经实现远程沙箱的 Worker 调用端，但尚未实现和部署被调用的 Sandbox Controller，以及真正承载
用户代码的逐任务容器、gVisor 或 microVM。

因此目前具备的是稳定的远程沙箱接入边界，不是可以独立运行的完整强沙箱系统。默认配置仍使用本地
Node.js 子进程，只有显式设置 `CODE_SANDBOX_BACKEND=remote` 才会发起远程调用。

## 已实现的调用端

Code Executor 通过
[`runner.go`](../apps/executor-go/internal/executors/code/runner.go) 选择执行后端，具体远程请求实现在
[`remote_runner.go`](../apps/executor-go/internal/executors/code/remote_runner.go)。当前调用端已经支持：

- 校验 `CODE_SANDBOX_CONTROLLER_URL`，并向该地址发送 HTTP POST 请求；
- 发送 `contractVersion`、`commandId`、`deadlineAt`、源码、Inputs 和最大输出字节数；
- 使用 `commandId` 作为 `Idempotency-Key`，为 Controller 的任务幂等提供稳定标识；
- 使用 `CODE_SANDBOX_CONTROLLER_TOKEN` 添加 Bearer Token；
- 通过 `CODE_SANDBOX_REQUIRE_TLS=true` 禁止使用明文 Controller 地址；
- 通过 `CODE_SANDBOX_REQUIRE_AUTH=true` 禁止无认证调用；
- 继承 Command context 的超时和取消，并把传输失败映射为稳定沙箱错误；
- 限制响应大小，严格校验 JSON 字段、尾随数据、成功输出和失败错误结构；
- 把 Controller 返回的成功或失败转换为现有 `ExecuteNodeResult` 链路可以处理的结果。

Controller 成功响应需要使用以下结构：

```json
{
  "status": "SUCCEEDED",
  "outputs": {
    "result": 123
  }
}
```

失败响应需要包含稳定错误信息：

```json
{
  "status": "FAILED",
  "error": {
    "code": "CODE_RUNTIME_ERROR",
    "message": "JavaScript main 函数执行失败",
    "retryable": false
  }
}
```

## 尚未实现的服务端与基础设施

仓库当前没有提供 Sandbox Controller 服务。后续 Controller 至少需要负责：

1. 根据 `commandId` 幂等创建或查询沙箱任务；
2. 为每个 Command 创建独立容器、gVisor 沙箱或 microVM；
3. 注入固定版本的 Node.js Runner、源码和 Inputs；
4. 限制非 root 用户、文件系统、CPU、内存、PID、磁盘、执行时间和输出大小；
5. 阻止沙箱访问 Server、PostgreSQL、Redis、RabbitMQ、模型凭证、云元数据和集群控制面；
6. 传播取消和 Deadline，终止整个任务进程树；
7. 保存短期任务结果供断线重试查询，并清理超时或残留资源；
8. 返回符合调用端契约的结构化成功或失败结果。

只有 Controller 和这些基础设施策略经过部署验收后，才能把 `remote` 后端视为真正的强沙箱。

## 当前默认行为

未配置时使用兼容后端：

```env
CODE_SANDBOX_BACKEND=process
```

此时 Code Executor 会在当前 Worker 内启动 Node.js 子进程。独立临时目录、进程组、V8 限制、超时和
环境变量过滤仍然有效，但它们不构成不可信多租户的强安全边界。

## 启用远程调用

远程调用至少需要：

```env
EXECUTOR_PROFILE=sandbox
CODE_SANDBOX_BACKEND=remote
CODE_SANDBOX_CONTROLLER_URL=https://sandbox-controller.example.com/execute
```

生产建议同时启用拒绝降级、TLS 和认证保护：

```env
CODE_SANDBOX_CONTROLLER_TOKEN=替换为内部令牌
CODE_SANDBOX_REQUIRE_REMOTE=true
CODE_SANDBOX_REQUIRE_TLS=true
CODE_SANDBOX_REQUIRE_AUTH=true
```

`CODE_SANDBOX_REQUIRE_REMOTE=true` 会让非 `remote` 配置启动失败，避免生产 Sandbox Worker 静默退回
本地进程执行。`CODE_SANDBOX_REQUIRE_TLS` 和 `CODE_SANDBOX_REQUIRE_AUTH` 则确保 Controller 通信不会
意外运行在明文或无认证模式。

如果 Server 已启用分类路由，还需要确保 Sandbox Worker 使用 `EXECUTOR_PROFILE=sandbox` 并消费
`ai-workflow.node.execute.sandbox.v1`。Result 仍发布到统一的 `ai-workflow.result.v1`，不改变现有
Protocol v1、租约、Outbox/Inbox 和结果推进逻辑。

总体隔离目标、Controller 职责、发布顺序和验收标准见
[节点分级隔离实现方案](./node-execution-isolation-implementation.md)。
