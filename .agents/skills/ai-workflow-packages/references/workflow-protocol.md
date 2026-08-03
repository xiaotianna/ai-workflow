# `@ai-workflow/protocol`

## 职责

定义 NestJS Server 与 Go Executor 之间版本化、环境无关的单节点 JSON 消息。`schemas/*.schema.json`
是跨语言协议唯一来源；Protocol 不依赖 `@ai-workflow/core`、Runtime、Server 或具体节点实现。

## TypeScript 公共入口

- `ExecuteNodeCommand`：协议版本、消息与幂等标识、Run/NodeRun/Execution 身份、attempt、租约、deadline，
  以及已经解析完成的 JSON Inputs/Config。
- `ExecuteNodeResult`：`SUCCEEDED` 与 `FAILED` 的严格判别联合；成功包含 outputs 和唯一
  activatedHandles，失败包含稳定 code、message、retryable 和可选 JSON details。
- `parseExecuteNodeCommand(unknown)` / `parseExecuteNodeResult(unknown)`：使用 AJV 2020 和 format 校验器
  执行完整 Schema 边界校验；失败抛出带稳定 issues 的 `ProtocolValidationError`。
- `ProtocolJsonValue` 与生成消息类型位于 `src/generated`，生成文件不手工修改，调用方只从包根入口
  导入。

## Go 公共入口

- Go module 位于 package 根目录，生成结构在 `types.generated.go`，与 TypeScript 使用同一批 Schema。
- `DecodeExecuteNodeCommand()` / `DecodeExecuteNodeResult()` 先做 Schema 校验，再使用
  `DisallowUnknownFields` 解码，并拒绝尾随的第二个 JSON 值。
- `ValidateExecuteNodeCommand()` / `ValidateExecuteNodeResult()` 用于发布前校验已组装的 Go 结构；
  `NewSucceededResult()` / `NewFailedResult()` 负责构造互斥结果字段。

## 协议规则

- 当前 `protocolVersion` 固定为 `'1'`；扩展不兼容字段时必须新增版本并保持旧消息含义稳定。
- Command 只携带单个节点执行所需数据，不携带完整 Workflow、Edge、其他节点输出、数据库连接或长期
  Secret。
- Protocol 独立声明递归 JSON 值以支持 Go；Runtime 继续使用 Core `JsonValue`，不能反向依赖
  `ProtocolJsonValue` 代替领域类型。
- 两端都必须在消息边界运行 Schema 校验。TypeScript 类型断言、Go `json.Unmarshal` 成功或构造器调用
  都不能替代发布前/消费后的 validator。
- commandId 用于追踪，idempotencyKey 用于业务幂等，leaseToken 用于拒绝过期结果；NodeRun、
  Outbox/Inbox、租约状态与 ack 时机由 Server/Worker 负责，不进入协议包。
