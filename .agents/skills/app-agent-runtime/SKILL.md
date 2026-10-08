---
name: app-agent-runtime
description: '维护 AI Workflow 的 Pi Agent Runtime。修改 apps/agent-runtime、scripts/agent-dev.mjs、Pi 模型映射、内存 Session、内置 Tools、Agent SSE 事件、取消与运行限制、开发启动或 Agent 部署时使用。'
---

# Agent Runtime 维护规范

- 先读取根 AGENTS.md；涉及跨端事件或输入时同时读取 $ai-workflow-packages 的 Agent Protocol 引用。
- Runtime 是独立 ESM 应用，Node.js 基线 >=22.19.0。Pi 依赖只在此应用内，通过 agent-runtime.ts 和 pi-model.ts 隔离；Server 保持 CommonJS，Web 不导入 Pi。
- 会话只存在进程内存；owner/app 范围、TTL、单用户与单应用并发、模型轮次、工具次数、超时和 AbortSignal 必须贯穿模型与 Gateway 请求。单实例部署不支持跨实例会话或重启续跑。
- 本地 Turbo 启动由 scripts/agent-dev.mjs 衔接 Server 与 Runtime；自动生成的内部认证令牌只保存在已忽略的 .agent-runtime.auth.local（权限 0600），并发启动共享完整令牌，已有配置优先；生产不使用此自动配置。Chat 模型的地址与 API Key 始终由 Server 从模型管理数据库解析，开发启动脚本不加载模型凭证。
- 模型与凭证由 Server 每轮解析；禁止从 Pi 用户配置、环境变量或用户文件加载默认模型凭证。结束后清理凭证闭包、Tool Context 与上下文令牌。
- 本轮可选图片由共享协议校验，runAgent 通过 Pi agent.prompt 的独立图片参数传入，不拼入文本；Pi 模型映射声明 text/image 输入，所选 Chat 模型仍必须实际支持图片。图片和消息沿用内存 Session 的 TTL；图片不设张数上限，单张最大 10MiB；请求与序列化消息预算为 64MiB，超过消息预算后清理 Session。
- 内置 Tools 固定注册并按 sequential 执行；beforeToolCall 校验签名上下文中的工具范围、期限和运行限制。只读项目数据通过受认证的 Server Tool Gateway 获取，不直接连接数据库、Redis、RabbitMQ 或对象存储。
- read_canvas 读取本轮未保存基线或 workingCandidate；set_canvas_candidate 必须经 Server 的完整 Workflow 与 Catalog 校验才替换内存候选。Agent 不保存、发布或执行工作流。
- reasoning 仅发送 Runtime 结构化摘要或明确的模型摘要；Pi thinking_* 原始内容不得投影到事件、日志或 Web。Tool displayArgs/displayResult 使用安全固定字段，日志仅包含 Run ID、工具名、耗时和状态。
- 完成、取消、超时、断连均保留已产生轨迹并释放 Session 活跃占用；会话失效返回 SESSION_NOT_FOUND，Web 可重新发送。
- 统一 Docker 镜像的 agent-runtime 入口仅读取 agent_token；Compose 不公开 Runtime 端口，仅挂载 Agent 密钥卷并通过独立网络调用 Server 与模型。
- 实施范围和执行记录见 [AI Agent Runtime 设计](../../../docs/ai-agent-runtime-design.md)；新任务按需读取相关章节，不将一次性实施记录写入技能。
