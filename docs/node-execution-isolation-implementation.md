# 节点分级执行实现

## 1. 当前状态

- 分类 Command Queue/DLQ、Outbox 固定执行类别与 Routing Key 已实现；默认使用 `legacy`，显式设置
  `WORKFLOW_EXECUTOR_ROUTING_MODE=classified` 后启用分类路由。
- Go Executor 已实现 `legacy`、`compute`、`model`、`http` 和 `sandbox` Profile，并按 Profile 注册
  Executor 白名单。
- Code 和 `sandbox-js` 插件固定使用本地 Node.js 子进程，不依赖外部执行服务。
- 本地子进程用于开发与受信任代码执行，不构成不可信多租户安全边界。

本文只记录当前已实现的分级路由、Worker Profile 和本地执行边界，不规划其他执行后端。

## 2. 组件边界

- `@ai-workflow/runtime` 只负责状态机、DAG/Loop 调度和 Effect，不访问 RabbitMQ 或执行外部副作用。
- Server 负责 WorkflowRun、NodeRun、Outbox、Inbox、租约、幂等和 RuntimeState 持久化。
- Executor 只接收单节点 Protocol Command，不读取完整 Workflow，也不承担 DAG 调度。
- Start、End、Loop、Loop Start、Loop Exit 由 Runtime 本地推进。
- Sub Workflow 由 Server 宿主执行，不投递到 Go Executor。
- Result 只有在 Publisher Confirm 后才 Ack Command，Server 只有在结果事务提交后才 Ack Result。

## 3. 执行类别

| 执行类别            | 节点                           | 当前执行位置               |
| ------------------- | ------------------------------ | -------------------------- |
| `runtime-control`   | Start、End、Loop、Sub Workflow | Runtime / Server           |
| `trusted-compute`   | Condition                      | Go Compute Worker          |
| `controlled-model`  | LLM、RAG                       | Go Model Worker            |
| `controlled-http`   | HTTP                           | Go HTTP Worker             |
| `untrusted-sandbox` | Code、`sandbox-js` 插件        | Go Worker 启动 Node 子进程 |

`untrusted-sandbox` 是路由和 Worker Profile 的稳定名称，不代表当前实现提供强安全隔离。

## 4. RabbitMQ 路由

保留 `ai-workflow.command.v1` direct exchange，并提供以下分类路由：

| 执行类别            | Routing Key            | Queue                                 |
| ------------------- | ---------------------- | ------------------------------------- |
| `trusted-compute`   | `node.execute.compute` | `ai-workflow.node.execute.compute.v1` |
| `controlled-model`  | `node.execute.model`   | `ai-workflow.node.execute.model.v1`   |
| `controlled-http`   | `node.execute.http`    | `ai-workflow.node.execute.http.v1`    |
| `untrusted-sandbox` | `node.execute.sandbox` | `ai-workflow.node.execute.sandbox.v1` |

每个分类队列拥有对应 DLQ。Result 继续统一发布到 `ai-workflow.result.v1` 的 `node.result` Routing Key，
Server 和 Runtime 不根据 Worker 类型拆分结果处理。

Server 在创建 Command Outbox 时根据 Workflow Server Catalog 中的节点登记确定 `executionClass` 和
`routingKey`，并与 Command 一起持久化。Publisher 重试只使用已经保存的 Routing Key，未知节点不回退
到通用队列。

## 5. Worker Profile

同一个 Go 可执行程序通过 `EXECUTOR_PROFILE` 选择 Registry 与 Command Queue：

| Profile   | 注册节点                                    | 消费队列                              |
| --------- | ------------------------------------------- | ------------------------------------- |
| `legacy`  | LLM、RAG、HTTP、Code、Condition、插件执行器 | `ai-workflow.node.execute.v1`         |
| `compute` | Condition                                   | `ai-workflow.node.execute.compute.v1` |
| `model`   | LLM、RAG                                    | `ai-workflow.node.execute.model.v1`   |
| `http`    | HTTP                                        | `ai-workflow.node.execute.http.v1`    |
| `sandbox` | Code、`plugin-sandbox-js`                   | `ai-workflow.node.execute.sandbox.v1` |

未配置 `EXECUTOR_PROFILE` 时使用 `legacy`，保证本地开发只启动一个 Executor 就能消费默认单队列。启用
分类路由后，部署方必须启动与已启用执行类别对应的 Profile。分类 Worker 收到不属于当前 Profile 的节点时
返回 `EXECUTOR_PROFILE_MISMATCH`，不提供 fallback。

当前 Worker 使用 `Qos(1)` 并同步处理 delivery，一个实例同时执行一个 Command。租约失效、deadline
到期或用户取消会通过 Command context 传递到具体 Executor。

## 6. Code 本地执行

Code Executor 为每个 Command：

1. 创建唯一临时目录；
2. 写入固定 `runner.mjs`、用户代码、Inputs 和结果路径；
3. 启动独立 Node.js 22+ ESM 子进程；
4. 使用 Command context 控制进程生命周期；
5. 校验结构化 JSON 结果并清理临时目录。

Node 子进程使用 64 MiB V8 Heap、1 MiB 调用栈，并限制源码、输出和 stderr 大小。`CODE_NODE_BINARY`
可以覆盖 `node` 命令，`CODE_NODE_MODULES_PATH` 可以指定第三方包目录。

这些措施限制单次任务的资源和文件协议，但用户代码仍可使用完整 Node.js 文件、网络、Worker Thread 和
子进程 API。因此运行 Code 时必须信任代码来源以及 Executor 当前用户能够访问的宿主资源。

## 7. 插件本地执行

声明 `sandbox-js` 的插件节点通过固定 `plugin-sandbox-js` executorType 进入插件执行器：

1. Go Worker 使用 Command 身份和租约调用 `PLUGIN_ARTIFACT_RESOLVER_URL`；
2. Server 按 Workflow 插件锁解析精确版本和 Artifact；
3. Worker 校验返回源码的 SHA-256；
4. 每个 Command 在独立临时目录中启动 Node.js 子进程；
5. 插件默认导出接收 Config、Inputs、运行身份和取消信号，并返回受限 JSON Outputs；
6. 进程结束后清理临时文件。

插件进程使用最小化环境变量，不会继承 RabbitMQ、模型或数据库凭证。和 Code 一样，它仍具有 Node.js
进程能够访问的宿主文件与网络能力，所以当前只运行本地开发插件和受信任插件。

## 8. 稳定配置

| 配置                             | 用途                                              |
| -------------------------------- | ------------------------------------------------- |
| `EXECUTOR_PROFILE`               | 选择 `legacy/compute/model/http/sandbox` Profile  |
| `WORKFLOW_EXECUTOR_ROUTING_MODE` | Server 使用 `legacy` 或 `classified` Command 路由 |
| `RABBITMQ_URL`                   | Executor 使用的 RabbitMQ 地址                     |
| `COMMAND_RUNTIME_LEASE_URL`      | Command 租约检查接口                              |
| `PLUGIN_ARTIFACT_RESOLVER_URL`   | 插件 Executor Artifact 解析接口                   |
| `CODE_NODE_BINARY`               | Node.js 可执行文件                                |
| `CODE_NODE_MODULES_PATH`         | Code 节点第三方依赖目录                           |
| `EXECUTOR_INTERNAL_AUTH_TOKEN`   | Lease、模型与插件 Artifact 接口的 Bearer Token    |
| `EXECUTOR_REQUIRE_INTERNAL_AUTH` | 要求内部接口认证                                  |

本地默认配置使用 `legacy` 路由和 Profile，Server 与 Executor 的内部地址指向 `127.0.0.1:3000`，RabbitMQ
指向开发 vhost。

## 9. 日志与验收

日志可以记录 `commandId`、`runId`、`nodeRunId`、`executionKey`、`nodeType`、Profile、耗时和稳定
错误码，不得记录用户源码、Inputs、Config、Outputs、模型 Prompt、API Key、Authorization、Cookie 或
完整 URL Query。

本地执行验收至少确认：

- 默认 `legacy` Executor 能执行内置节点和 `sandbox-js` 插件；
- 分类路由下 `sandbox` Profile 能执行 Code 与 `plugin-sandbox-js`；
- 插件 Artifact 版本、路径和摘要不一致时拒绝执行；
- Command 租约失效或取消时 Node 进程组终止；
- 超限输出和非法结果返回稳定错误；
- 执行结束后临时目录被清理；
- 未知 node type 或 executor type 不进入 fallback Queue。
