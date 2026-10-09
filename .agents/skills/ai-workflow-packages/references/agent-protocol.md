# Agent Protocol

- 包名 @ai-workflow/agent-protocol，源码公开入口 src/index.ts，依赖 Core 和 Zod；禁止依赖 Pi、React 或 apps。Workflow 沿用 Core，事件只携带可序列化值。
- exports 对 TypeScript 与浏览器提供源码，Node 条件 import/require 分别提供 dist/index.mjs 与 dist/index.cjs。构建前必须生成双模块产物；Server runtime:prepare 和 Runtime predev/prebuild 已包含该步骤。
- agentTurnSchema 校验版本、用户文本、messages 历史、当前 Snapshot、稳定模型 UUID、baseSnapshotHash 和最多 20 个去重的当前节点 ID，以及可选 images（不设张数上限、每张解码后最大 10MiB 的 PNG/JPEG/WebP）。agentImageSchema 同时校验 MIME、Base64 格式和解码尺寸，旧文本请求可以省略 images 和 messages（后者默认空数组）。agentMessageSchema 只接收 user/assistant：用户文本与图片、助手文本/可见 reasoning/工具调用及对应结果；工具名来自固定名单，未完成工具须带错误结果，不接收 system 角色。messages 是当前对话本轮用户消息之前的历史，本轮 Prompt/images 由 Runtime 追加一次。Runtime 内部请求额外包含 Server 解析的模型与签名上下文，Web 不接受凭证配置。
- canonicalAgentJson/hashAgentSnapshot 使用排序 JSON 与 SHA-256；摘要涵盖完整 Workflow 和布局，包括未保存值。Server 先核对原始快照摘要，再掩码 Secret 后发往 Runtime，候选应用前 Web 必须重算摘要并检查异步期间是否又编辑。
- agentContextClaimsSchema 绑定 owner/app/run/workflow/allowedTools/expiresAt；签名和活跃 Run 管理属于 Server。Runtime 验证签名与绑定，Gateway 每次复查活跃 Run。
- 八个固定 Tools、输入 Schema、Gateway 请求/结果与稳定错误在本包定义；read_canvas 与 set_canvas_candidate 的内存状态属于 Runtime。候选必须使用完整 Workflow，不新增另一套节点定义或通用 Patch。
- 事件顺序为 session、reasoning、assistant、tool、candidate 和终态。parseAgentEvent 必须校验 protocolVersion；encodeAgentEvent 提供 SSE 编码。reasoning 的 model 来源携带模型实际返回的可见 thinking，旧 runtime/model_summary 来源保持解析兼容；displayArgs/displayResult 的可选 data 为脱敏 JSON，truncated 明确标记裁剪，旧 fields 保持兼容。reasoning_finished 的可选 field 仅允许 reasoning_content/reasoning/reasoning_text，用于回放供应商可见 reasoning 字段，不传递任意 Pi 签名。
- 限制：请求 64MiB（容纳多图 Base64 与画布上下文），SSE 帧独立使用 AGENT_MAX_EVENT_BYTES 的 1MiB，工具结果 64KiB；大项目查询返回明确 truncated 标记。候选定义不可截断为合法 Workflow。maskAgentWorkflow 保持 Secret 占位符，Web 应用时保留已有真实值，新 Secret 留空待用户填写。
- projectAgentData 是 Server 与 Runtime 复用的环境无关投影：敏感键与已知 Secret 脱敏、字符串/数组/深度裁剪、64KiB 字节预算；Workflow 须先 maskAgentWorkflow。Pi 内部类型与思考签名不进入此包。更改契约时同步 Server、Runtime、Web 三方，并验证乱序/取消、掩码和候选冲突边界。
