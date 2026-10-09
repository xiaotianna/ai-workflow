---
name: app-agent-runtime
description: '维护 AI Workflow 的 Pi Agent Runtime。修改 apps/agent-runtime、scripts/agent-dev.mjs、Pi 模型映射、对话上下文与活跃运行、内置 Tools、Agent SSE 事件、取消与运行限制、开发启动或 Agent 部署时使用。'
---

# Agent Runtime 维护规范

- 先读取根 AGENTS.md；涉及跨端事件或输入时同时读取 $ai-workflow-packages 的 Agent Protocol 引用。
- Runtime 是独立 ESM 应用，Node.js 基线 >=22.19.0。Pi 依赖只在此应用内，通过 agent-runtime.ts 和 pi-model.ts 隔离；Server 保持 CommonJS，Web 不导入 Pi。
- 历史由 Web 每轮通过 messages 携带；Runtime 从历史创建本轮 Agent，只在内存登记活跃运行，结束即释放。不设对话空闲 TTL、会话数量上限或历史回收。sessionId 是稳定对话标识，重启后可直接沿用；owner/app 范围、单用户与单应用并发、超时和 AbortSignal 必须贯穿模型与 Gateway 请求。模型轮次与工具总次数不设固定上限；同一画布与参数连续返回三次相同结果时暂停工具一轮，要求模型简短说明障碍与新策略后继续，调整后仍重复原调用则停止工具并要求最终答复；模型忽略暂停仍请求工具时返回 AGENT_TOOL_LOOP。检测覆盖交替调用与参数校验失败，画布、参数或结果发生变化视为不同进展。执行中的 Run 不支持重启续跑，当前单实例取消协调不支持跨实例运行。
- 本地 Turbo 启动由 scripts/agent-dev.mjs 衔接 Server 与 Runtime；自动生成的内部认证令牌只保存在已忽略的 .agent-runtime.auth.local（权限 0600），并发启动共享完整令牌，已有配置优先；生产不使用此自动配置。Chat 模型的地址与 API Key 始终由 Server 从模型管理数据库解析，开发启动脚本不加载模型凭证。
- Pi 模型映射使用 Models.stream，让输出长度由供应商默认设置决定；请求不设置 max_tokens/max_completion_tokens，不使用会自动注入和裁剪输出长度的 streamSimple。Pi 必填的 maxTokens 元数据使用 0，不作为请求限制。
- 模型与凭证由 Server 每轮解析；禁止从 Pi 用户配置、环境变量或用户文件加载默认模型凭证。结束后清理凭证闭包、Tool Context 与上下文令牌。
- 本轮可选图片由共享协议校验，runAgent 通过 Pi agent.prompt 的独立图片参数传入，不拼入文本；Pi 模型映射声明 text/image 输入，所选 Chat 模型仍必须实际支持图片。历史图片同样由 messages 回填；图片不设张数上限，单张最大 10MiB，完整请求预算为 64MiB；超限拒绝本轮请求，不清理对话或静默丢弃历史。
- 内置 Tools 固定注册并按 sequential 执行；beforeToolCall 校验签名上下文中的工具范围、期限和运行限制。只读项目数据通过受认证的 Server Tool Gateway 获取，不直接连接数据库、Redis、RabbitMQ 或对象存储。
- read_canvas 读取本轮未保存基线或 workingCandidate；set_canvas_candidate 必须经 Server 的完整 Workflow 与 Catalog 校验才替换内存候选。Agent 不保存、发布或执行工作流。
- reasoning 按 Pi thinking_start/delta/end 转发模型实际返回的可见思考内容，分片不超过 4000 字符；未返回 thinking 的模型不生成思考卡片，不注入固定摘要。Tool displayArgs/displayResult 携带真实参数和结果的脱敏 JSON、专属结果摘要与 truncated 标记；复用 Agent Protocol 的 projectAgentData，Workflow Secret 先使用 maskAgentWorkflow。模型凭证与上下文令牌不进入展示或日志，日志仅包含 Run ID、工具名、耗时和状态。
- 模型 stopReason=length，或正常停止但没有工具结果和最终文本时，保留上下文自动续跑；连续最多补发两轮，收到有效答复或正常工具轮次后重置恢复计数。仍不完整分别返回 MODEL_OUTPUT_TRUNCATED / MODEL_RESPONSE_INCOMPLETE，不发送成功终态；截断的工具调用沿用 Pi 的失败结果，不执行残缺参数。
- 完成、取消、超时、断连均保留 Web 已产生轨迹并释放活跃运行。取消已结束的 sessionId 幂等返回，活跃运行仍校验 owner/app。历史工具调用只回放上下文，必须包含对应结果，未完成工具按错误结果补齐；连续工具调用按同一助手批次回放。历史 reasoning 仅携带可见文本和允许的 API 字段名，不接收任意思考签名或 system 角色。
- 统一 Docker 镜像的 agent-runtime 入口仅读取 agent_token；Compose 不公开 Runtime 端口，仅挂载 Agent 密钥卷并通过独立网络调用 Server 与模型。
- 实施范围和执行记录见 [AI Agent Runtime 设计](../../../docs/ai-agent-runtime-design.md)；新任务按需读取相关章节，不将一次性实施记录写入技能。
