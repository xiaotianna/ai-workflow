# AI Workflow Go Executor

该应用是 RabbitMQ 单节点 Worker。它只执行 Protocol Command，不读取完整 Workflow，也不负责 DAG
调度。

处理顺序固定为：

1. 从 `ai-workflow.node.execute.v1` 持久队列手动消费 Command；
2. 使用 `workflow-protocol` JSON Schema 解码和校验消息；
3. 校验 `deadlineAt`，按 `nodeType` 从 Registry 解析 Executor；
4. 调用节点 Executor 并校验 Result；
5. 将 Result 持久发布到 `ai-workflow.result.v1`，收到 Publisher Confirm 后才 Ack Command。

非法 Command 会进入 Command DLQ；结果发布失败时原 Command 会重新入队。Worker 断线后每 2 秒重连，
RabbitMQ URL 通过 `RABBITMQ_URL` 配置，默认连接根目录 `compose.dev.yaml` 创建的开发 vhost。

Registry 不提供 fallback；未注册的 `nodeType` 返回 `NODE_EXECUTOR_NOT_REGISTERED`。内置注册入口
`internal/executors.RegisterBuiltins` 当前注册 `llm`、`rag`、`code`、`http`、`condition`，每个目录
自行实现 Mock、打印不含输入、配置或凭证的命令身份并组装协议 Result。Server 使用版本快照为带
`__mockExecutor` 标识的结果补出实例声明的 mock 输出。后续实现真实节点时只替换对应目录的
`NodeExecutor`，MQ Worker、Protocol、Runtime 和持久化链路无需改动。

Start/End 仍由 TypeScript Runtime 本地推进，不产生无业务价值的 MQ 往返。
