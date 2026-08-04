---
name: app-executor-go
description: '维护 AI Workflow 的 Go 节点执行器。修改 apps/executor-go、RabbitMQ Worker、节点 Executor、Code 节点的 Node ESM 运行时、runner.mjs、runtime.go、进程与资源限制、部署镜像或运行环境时使用。'
---

# Go 节点执行器维护规范

## 执行流程

1. 先读取根目录 `AGENTS.md` 并遵守命令和修改范围约束
2. 修改 Code Executor、Node 运行时或部署方式前，读取 [references/code-runtime-and-deployment.md](references/code-runtime-and-deployment.md)
3. 需要理解 Go 与 Node 的完整执行时序时，读取 [`apps/executor-go/internal/executors/code/README.md`](../../../apps/executor-go/internal/executors/code/README.md)
4. 修改 RabbitMQ Command 或 Result 契约时，同时读取 `$ai-workflow-packages` 的 workflow-protocol 引用
5. 保持 Executor 只执行 Protocol Command，不读取完整 Workflow，也不承担 DAG 调度
6. 运行时能力、环境变量、资源限制、部署依赖或安全边界变化时，在同一任务中更新本技能引用

## 实现约束

- 保持节点实现通过 Registry 注册，不为未知 `nodeType` 提供 fallback
- 不把凭证、输入正文或用户代码写入日志
- 保持 Command context 的超时和取消语义能够传递到外部进程与网络请求
- 错误通过稳定错误码进入 Protocol Result，不把实现异常直接泄露成无结构文本
- 遵守根目录约束，不自动运行 `dev`、`build` 或任何 git 命令

## 按需读取

- 修改 `internal/executors/code/runtime.go`、`runner.mjs`、Node 版本、npm 包解析、容器镜像或服务器部署：读取 [references/code-runtime-and-deployment.md](references/code-runtime-and-deployment.md)
- 只需要理解 Code Executor 文件协议和调用顺序：读取 [`apps/executor-go/internal/executors/code/README.md`](../../../apps/executor-go/internal/executors/code/README.md)

## 维护本技能

- Code Executor 不再使用真实 Node 或最低 Node 版本变化时，立即更新运行时引用
- 新增 Executor 级稳定环境变量、部署要求或隔离边界时，写入对应引用
- 技能适用范围变化时，同步更新顶部 `description` 与 `agents/openai.yaml`
