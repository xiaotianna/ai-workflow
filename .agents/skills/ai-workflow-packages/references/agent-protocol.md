# Agent Protocol

- 包名 @ai-workflow/agent-protocol，源码公开入口 src/index.ts，依赖 Core 和 Zod；禁止依赖 Pi、React 或 apps。Workflow 沿用 Core，事件只携带可序列化值。
- exports 对 TypeScript 与浏览器提供源码，Node 条件 import/require 分别提供 dist/index.mjs 与 dist/index.cjs。构建前必须生成双模块产物；Server runtime:prepare 和 Runtime predev/prebuild 已包含该步骤。
- agentTurnSchema 校验版本、用户文本、当前 Snapshot、稳定模型 UUID、baseSnapshotHash 和最多 20 个去重的当前节点 ID，以及可选 images（不设张数上限、每张解码后最大 10MiB 的 PNG/JPEG/WebP）。agentImageSchema 同时校验 MIME、Base64 格式和解码尺寸，旧文本请求可以省略 images。Runtime 内部请求额外包含 Server 解析的模型与签名上下文，Web 不接受凭证配置。
- canonicalAgentJson/hashAgentSnapshot 使用排序 JSON 与 SHA-256；摘要涵盖完整 Workflow 和布局，包括未保存值。Server 先核对原始快照摘要，再掩码 Secret 后发往 Runtime，候选应用前 Web 必须重算摘要并检查异步期间是否又编辑。
- agentContextClaimsSchema 绑定 owner/app/run/workflow/allowedTools/expiresAt；签名和活跃 Run 管理属于 Server。Runtime 验证签名与绑定，Gateway 每次复查活跃 Run。
- 八个固定 Tools、输入 Schema、Gateway 请求/结果与稳定错误在本包定义；read_canvas 与 set_canvas_candidate 的内存状态属于 Runtime。候选必须使用完整 Workflow，不新增另一套节点定义或通用 Patch。
- 事件顺序为 session、reasoning、assistant、tool、candidate 和终态。parseAgentEvent 必须校验 protocolVersion；encodeAgentEvent 提供 SSE 编码。reasoning 仅含安全摘要，工具展示只含固定安全字段。
- 限制：请求 64MiB（容纳多图 Base64 与画布上下文），SSE 帧独立使用 AGENT_MAX_EVENT_BYTES 的 1MiB，工具结果 64KiB；大项目查询返回明确 truncated 标记。候选定义不可截断为合法 Workflow。maskAgentWorkflow 保持 Secret 占位符，Web 应用时保留已有真实值，新 Secret 留空待用户填写。
- Pi 类型与原始思维链不得进入此包。更改契约时同步 Server、Runtime、Web 三方，并验证乱序/取消、掩码和候选冲突边界。
