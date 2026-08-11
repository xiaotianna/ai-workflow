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

- Code Executor 固定在 Worker 内启动本地 Node.js 子进程，不依赖外部 Sandbox Controller
- 每次 Code 节点运行都使用唯一临时目录、独立 Node 进程、独立 ESM 模块命名空间和独立输入输出文件
- 内部导出名 `__aiWorkflowMain_6f7dd58d` 只存在于单次执行的用户模块命名空间，不会因并发用户共用名称而互相覆盖
- 临时目录和独立进程解决执行文件与模块状态冲突，但不构成不可信多租户的强安全边界
- 完整 Node 能力允许用户代码访问 Executor 容器内的文件、网络和进程 API，真正的安全边界是容器、运行用户和基础设施策略
- 本地进程模式只适用于本地开发和受信任代码，不应宣称具备不可信多租户安全边界
- 插件 `sandbox-js` 同样使用独立临时目录和 Node.js 子进程；插件 Artifact 通过受租约保护的内部接口
  读取并校验文件 SHA-256

## Worker Profile

- `EXECUTOR_PROFILE` 支持 `legacy`、`compute`、`model`、`http` 和 `sandbox`；未配置时使用 `legacy`
  保持原单队列行为
- `compute` 只注册 Condition，`model` 只注册 LLM/RAG，`http` 只注册 HTTP，`sandbox` 只注册 Code
- 分类 Profile 分别消费 `ai-workflow.node.execute.compute.v1`、`.model.v1`、`.http.v1` 和
  `.sandbox.v1`；Result 仍统一发布到 `ai-workflow.result.v1`
- 分类 Worker 收到不属于当前 Profile 的节点返回 `EXECUTOR_PROFILE_MISMATCH`，不提供 fallback
- `EXECUTOR_INTERNAL_AUTH_TOKEN` 同时用于 Command Lease、模型解析和知识检索请求的 Bearer Token；为空时兼容
  现有本地部署
- 生产两端设置 `EXECUTOR_REQUIRE_INTERNAL_AUTH=true`，缺少 Token 时 Server 或 Executor 必须拒绝启动

## 部署检查

仓库根目录的 `compose.yaml` 是单机自托管部署入口：`apps/executor-go/Dockerfile` 使用 Go 1.25
构建静态 Executor，并以 Node.js 22 Debian 镜像作为运行层。镜像固定配置
`CODE_NODE_BINARY=node` 和 `CODE_NODE_MODULES_PATH=/workspace/node_modules`，并按根 `.npmrc` 安装
workspace 的生产依赖，使容器内第三方包解析规则与仓库一致；Compose 使用非 root 用户、只读根文件
系统、独立可写 `/tmp`、能力删除、PID/CPU/内存限制和独立 Executor 网络运行它。默认启动 `legacy`
Profile，与 Server 的 `WORKFLOW_EXECUTOR_ROUTING_MODE=legacy` 对齐。
RabbitMQ 密码和内部认证令牌由 Compose 的 `secrets-init` 首次随机生成，Executor 只挂载自身需要的
密钥卷；入口脚本读取后再启动 Worker，不要求用户手动创建 `.env`。
根 `pnpm-lock.yaml` 当前不纳入版本控制，三个应用 Dockerfile 不得强制复制该文件；容器内安装依赖
显式使用 `--no-frozen-lockfile`，避免服务器从仓库检出后在 Docker `COPY` 阶段失败。

部署或修改 Executor 镜像时确认：

1. 镜像包含项目要求的 Go Executor 二进制
2. 镜像包含 Node.js 22 或更高版本
3. `node` 位于 `PATH`，或正确配置 `CODE_NODE_BINARY`
4. 需要开放的 npm 包存在于可解析的 `node_modules`，或正确配置 `CODE_NODE_MODULES_PATH`
5. 使用最小权限非 root 用户和只读根文件系统
6. 临时目录可写且每次执行后能够清理
7. 配置容器级 CPU、内存和 PID 限制
8. 配置最小网络权限且不向用户代码暴露 Server、数据库或模型凭证
9. 只运行受信任的 Code 和插件源码，并明确本地子进程不提供多租户强隔离

## Command 租约

- Executor 通过 `COMMAND_RUNTIME_LEASE_URL` 访问 Server 的命令租约接口，默认地址为
  `http://127.0.0.1:3000/internal/executor/commands/lease`
- Worker 领取 RabbitMQ Command 后先校验租约，执行期间每 500ms 复查；Run、NodeRun、Lease Token
  或 deadline 任一失效时取消 Command context
- 失效的排队消息直接 Ack 且不发布 Result；租约服务暂时不可用时不得盲目执行新命令，原消息重新入队
- 部署网络必须允许 Executor 访问该内部接口，但不能把接口暴露到公网

## RAG 检索

- RAG Executor 不在 Go 进程内实现搜索算法，也不读取模型凭证；它把当前 Command 身份、Lease Token
  和已解析的 `query` 发送给 Server 的统一 Retriever。
- `KNOWLEDGE_RUNTIME_RETRIEVER_URL` 默认指向
  `http://127.0.0.1:3000/internal/executor/knowledge/retrieve`。
- Server 必须按 NodeRun 租约回查不可变工作流版本、owner、知识库引用和 TopK，不能信任 Executor
  自报知识库 ID；返回结果统一写入 RAG 的 `documents` 输出。
- 内部检索接口与租约、模型解析接口使用相同受控网络和 Bearer Token，不得暴露公网或记录查询正文。

修改具体执行流程前，继续读取 [`apps/executor-go/internal/executors/code/README.md`](../../../../apps/executor-go/internal/executors/code/README.md)
