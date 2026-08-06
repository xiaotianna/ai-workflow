# Code Executor 运行时与部署约束

## Node 运行时

- Code Executor 使用真实 Node.js 22+ ESM 子进程执行用户代码
- `runtime.go` 的 `go:embed` 只把 `runner.mjs` 源码嵌入 Go 二进制，不包含 Node 可执行程序
- Executor 的实际运行环境必须能找到 Node.js 22+，否则 Code 节点返回 `CODE_NODE_RUNTIME_UNAVAILABLE`
- 默认从 `PATH` 调用 `node`，可用 `CODE_NODE_BINARY` 指定其他 Node 可执行文件路径
- 宿主服务器可以不安装 Node，但运行 Executor 的容器或 Pod 必须包含 Node
- 不能在保留完整 Node API、ESM、原生 `fetch`、文件系统、网络、`worker_threads` 和 `child_process` 能力的同时移除 Node 运行时

## 第三方包

- Node 内置模块不需要额外安装
- 用户代码导入 npm 第三方包时，对应依赖必须存在于 Executor 可解析的 `node_modules`
- `CODE_NODE_MODULES_PATH` 可显式指定依赖目录
- 未配置时，Executor 从自身启动目录逐级向上查找首个 `node_modules`
- 部署镜像必须同时包含允许用户导入的第三方包，不能依赖宿主机偶然存在的依赖目录

## 执行隔离

- Code Executor 通过 `CODE_SANDBOX_BACKEND=process|remote` 选择执行后端；未配置时默认为
  `process`，保持现有本地行为
- 每次 Code 节点运行都使用唯一临时目录、独立 Node 进程、独立 ESM 模块命名空间和独立输入输出文件
- 内部导出名 `__aiWorkflowMain_6f7dd58d` 只存在于单次执行的用户模块命名空间，不会因并发用户共用名称而互相覆盖
- 临时目录和独立进程解决执行文件与模块状态冲突，但不构成不可信多租户的强安全边界
- 完整 Node 能力允许用户代码访问 Executor 容器内的文件、网络和进程 API，真正的安全边界是容器、运行用户和基础设施策略
- 不可信多租户场景需要按任务或租户提供更强的容器或虚拟化隔离，不能只依赖 `runner.mjs`
- `remote` 后端要求配置完整的 `CODE_SANDBOX_CONTROLLER_URL`，使用 `commandId` 作为幂等键，并限制
  Controller 响应大小和结构；`CODE_SANDBOX_CONTROLLER_TOKEN` 可附加 Bearer Token
- `CODE_SANDBOX_REQUIRE_REMOTE=true` 用于生产启动保护，配置为 `process` 时 Executor 必须拒绝启动
- 生产远程后端同时设置 `CODE_SANDBOX_REQUIRE_TLS=true` 和 `CODE_SANDBOX_REQUIRE_AUTH=true`，禁止
  明文或无认证 Controller 连接
- 仓库内的远程后端只是 Worker 与 Controller 的边界，不等于 Controller 已经提供逐任务容器、gVisor
  或 microVM；部署验收必须验证实际 Controller 的隔离能力

## Worker Profile

- `EXECUTOR_PROFILE` 支持 `legacy`、`compute`、`model`、`http` 和 `sandbox`；未配置时使用 `legacy`
  保持原单队列行为
- `compute` 只注册 Condition，`model` 只注册 LLM/RAG，`http` 只注册 HTTP，`sandbox` 只注册 Code
- 分类 Profile 分别消费 `ai-workflow.node.execute.compute.v1`、`.model.v1`、`.http.v1` 和
  `.sandbox.v1`；Result 仍统一发布到 `ai-workflow.result.v1`
- 分类 Worker 收到不属于当前 Profile 的节点返回 `EXECUTOR_PROFILE_MISMATCH`，不提供 fallback
- `EXECUTOR_INTERNAL_AUTH_TOKEN` 同时用于 Command Lease 与模型解析请求的 Bearer Token；为空时兼容
  现有本地部署
- 生产两端设置 `EXECUTOR_REQUIRE_INTERNAL_AUTH=true`，缺少 Token 时 Server 或 Executor 必须拒绝启动

## 部署检查

部署或修改 Executor 镜像时确认：

1. 镜像包含项目要求的 Go Executor 二进制
2. 镜像包含 Node.js 22 或更高版本
3. `node` 位于 `PATH`，或正确配置 `CODE_NODE_BINARY`
4. 需要开放的 npm 包存在于可解析的 `node_modules`，或正确配置 `CODE_NODE_MODULES_PATH`
5. 使用最小权限非 root 用户和只读根文件系统
6. 临时目录可写且每次执行后能够清理
7. 配置容器级 CPU、内存和 PID 限制
8. 配置最小网络权限且不向用户代码暴露 Server、数据库或模型凭证
9. 生产 Sandbox Profile 设置 `CODE_SANDBOX_BACKEND=remote` 和
   `CODE_SANDBOX_REQUIRE_REMOTE=true`

## Command 租约

- Executor 通过 `COMMAND_RUNTIME_LEASE_URL` 访问 Server 的命令租约接口，默认地址为
  `http://127.0.0.1:3000/internal/executor/commands/lease`
- Worker 领取 RabbitMQ Command 后先校验租约，执行期间每 500ms 复查；Run、NodeRun、Lease Token
  或 deadline 任一失效时取消 Command context
- 失效的排队消息直接 Ack 且不发布 Result；租约服务暂时不可用时不得盲目执行新命令，原消息重新入队
- 部署网络必须允许 Executor 访问该内部接口，但不能把接口暴露到公网

修改具体执行流程前，继续读取 [`apps/executor-go/internal/executors/code/README.md`](../../../../apps/executor-go/internal/executors/code/README.md)
