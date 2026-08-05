# AI Workflow Go Executor

如果你还不熟悉 RabbitMQ，可以先读 [MQ_GUIDE.md](./MQ_GUIDE.md)。这份文档会从 NestJS 和 Go 怎么通过 RabbitMQ 传递消息开始讲起，并说明 Ack、Nack、Reject、死信队列以及项目里的异常消息处理流程。

该应用是 RabbitMQ 单节点 Worker。它只执行 Protocol Command，不读取完整 Workflow，也不负责 DAG 调度。

处理顺序固定为：

1. 从 `ai-workflow.node.execute.v1` 持久队列手动消费 Command；
2. 使用 `workflow-protocol` JSON Schema 解码和校验消息；
3. 校验 `deadlineAt` 与 Server Command 租约，按 `nodeType` 从 Registry 解析 Executor；
4. 调用节点 Executor 并校验 Result；
5. 将 Result 持久发布到 `ai-workflow.result.v1`，收到 Publisher Confirm 后才 Ack Command。

非法 Command 会进入 Command DLQ；Result 失败时原 Command 会重新入队。Worker 断线后每 2 秒重连，RabbitMQ URL 通过 `RABBITMQ_URL` 配置，默认连接根目录 `compose.dev.yaml` 创建的开发 vhost。

Command 租约地址通过 `COMMAND_RUNTIME_LEASE_URL` 配置，默认是
`http://127.0.0.1:3000/internal/executor/commands/lease`。Worker 消费前先检查，执行期间每 500ms
复查；Run 因前端 SSE 断开或主动暂停进入终态后，排队消息会直接 Ack 丢弃，执行中的 Command context
会被取消。租约服务暂时不可用时新命令不会盲目执行，而是重新入队等待。

Registry 不提供 fallback；未注册的 `nodeType` 返回 `NODE_EXECUTOR_NOT_REGISTERED`。内置注册入口 `internal/executors.RegisterBuiltins` 当前注册 `llm`、`rag`、`code`、`http`、`condition`，每个目录自行实现 `NodeExecutor`、打印不含输入、配置或凭证的命令身份并组装协议 Result。

LLM 已接入真实执行逻辑：`config.go` 对齐 Core 的模型引用、上下文、参数和异常处理契约；Provider Registry 动态注册 OpenAI、DeepSeek 与 Ollama 适配器。运行时只信任 `groupId` 和 `configuredModelId`，Go 使用当前 Command 的 NodeRun 身份与租约向 Server 解析真实模型、Base URL 和凭证，不使用 `modelId`、`providerType` 展示快照。API Key 不进入 RabbitMQ Command，也不会写入日志。

模型解析地址通过 `MODEL_RUNTIME_RESOLVER_URL` 配置，默认是 `http://127.0.0.1:3000/internal/executor/models/resolve`。该接口会返回本次调用需要的明文凭证，部署时只能暴露在 Server 与 Executor 的受控内部网络中，并应使用 TLS；不得经过公网网关、缓存或访问日志正文。

HTTP、Code 与 Condition 已接入真实执行逻辑。三者在进入业务逻辑前都会严格解析节点 Config；HTTP
和 Code 与 LLM 共用 Core 的 `none`、`default_value`、`error_branch` 异常处理语义，避免各节点分别
组装不一致的 Result。RAG 仍是最小实现。Server 对所有 Executor Result 统一按 Protocol 处理，不
识别临时实现标识，也不从版本快照改写或补齐输出。

HTTP Executor 支持 GET、POST、PUT、PATCH、DELETE、Headers、Query Params，以及 none、form-data、
x-www-form-urlencoded、JSON、raw 和 binary Body。Runtime 在派发前显式解析配置中的
`VariableValue`，Go 只接收静态 JSON。空 Key 行会被忽略；JSON 字符串 Body 必须是合法 JSON；
binary 接受字符串或 0 到 255 的数字数组。form-data 文件值可以直接使用字符串内容，也可以使用
`{ name, content, contentType?, encoding?: 'base64' }` 对象。请求使用节点连接超时与 Command
deadline 中较早到期者，响应体上限为 10 MiB；2xx 响应输出
`response.status / headers / data / durationMs`，JSON Content-Type 会自动解码。未显式配置
`Idempotency-Key` 时会使用 Protocol `idempotencyKey`，便于支持该 Header 的上游服务消除重复副作用。

Condition Executor 按配置顺序计算普通分支，AND 要求全部规则成立，OR 要求任一规则成立，首个命中
分支生效，其余情况进入最后的 ELSE。equals/not_equals 对 JSON 值做结构比较；contains 支持字符串
子串、数组元素和对象 Key；is_empty/is_not_empty 支持 null、字符串、数组和对象。

Code Executor 为每次执行创建独立临时目录和 Node.js 22+ ESM 子进程，源码可以使用静态或动态
`import`、`node:*`、原生 `fetch`、文件系统、网络、`worker_threads` 与 `child_process`；同步和
异步 `main(inputs)` 都统一通过 `await` 调用。`main` 必须返回可序列化 JSON 对象，对象字段直接
作为节点 outputs。Command context 到期或取消时会终止 Node 进程组，V8 Heap 限制为 64 MiB、
调用栈限制为 1 MiB，外层继续限制 256 KiB 源码和 4 MiB 输出。

第三方包从 `CODE_NODE_MODULES_PATH` 指定的目录加载；未配置时，Executor 会从自身启动目录逐级
向上查找首个 `node_modules`。`CODE_NODE_BINARY` 可以覆盖默认的 `node` 命令。传给用户代码的
环境变量经过最小化处理，不包含 RabbitMQ、模型凭证等 Executor 私密配置。

完整 Node.js 能力意味着 Code 进程可以访问 Executor 容器内的文件、网络和进程 API，因此这里的
安全边界是专用 Executor 容器及其运行用户，而不是 Node 子进程本身。生产环境必须让 Executor
使用最小权限非 root 用户、只读根文件系统、独立临时目录、网络策略和容器级 CPU/内存/PID 限制，
不得与 Server 或数据库共享宿主文件系统和高权限凭证。

Start/End 仍由 TypeScript Runtime 本地推进，不产生无业务价值的 MQ 往返。
