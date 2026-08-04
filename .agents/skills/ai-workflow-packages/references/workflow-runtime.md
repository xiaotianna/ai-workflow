# `@ai-workflow/runtime`

## 职责

承载与 NestJS、数据库和界面无关的工作流纯状态机：ExecutionPlan 查询索引、动态值校验、变量解析、
根 DAG 调度、RuntimeState 恢复和状态迁移。Start/End 由 Runtime 本地推进；业务节点通过
`DISPATCH_NODE` Effect 交给宿主，Runtime 不直接执行外部副作用。

## 公开入口

- `buildExecutionPlan(workflow)`：接受已通过 Core 执行前校验的 Workflow，只机械建立 Node、Edge
  和静态 Scope 索引，不重复校验节点、端口、环、Loop 或变量引用。
- `createRuntimeNodeConfigResolver(projectors)`：按 nodeType 注册显式 Config projector；
  `projectStaticJsonNodeConfig` 只用于确认不含运行时变量位置的纯 JSON Config。
- `projectLlmNodeConfig`：解析 LLM `config.messages[].content` 中由上下文编辑器写入的
  `{{#nodeId.outputKey.path#}}`、`{{#env.variableId.path#}}` 与 `{{#sys.key.path#}}` 引用，派发前将
  string 直接插入、其他 JSON 值序列化为文本；Go Executor 只接收解析后的消息列表。
- `projectHttpNodeConfig`：按 HTTP Schema 解析配置，并显式解析 Headers、Params 与各类 Body 中的
  `VariableValue`；Go Executor 只接收静态键值与 Body。
- `projectConditionNodeConfig`：按 Condition Schema 解析分支，并在派发前解析每条规则的左右值；Go
  Executor 只负责对本次静态值进行比较与选路。
- `createWorkflowRuntime(workflow, { workflowVersionId, configResolver })`：创建绑定不可变 WorkflowVersion
  的 Runtime，提供 `start()` 与 `applyNodeResult()`。
- `runtimeStateSchema` / `restoreRuntimeState()`：解析持久化 State，并校验 Run、Workflow、Version、
  系统变量、Node/Edge 索引、Execution 反向索引和逻辑序号一致性。
- 根入口同时导出 RuntimeState、Effect、Transition、状态常量和稳定的 `RuntimeError` 契约；变量解析、
  Scheduler 和 State 写操作保持包内私有。
- 包根 `types`/`default` 条件指向 TypeScript 源码，`require` 条件提供 CommonJS Server 使用的 CJS
  入口；package module 类型保持 CommonJS，使 NestJS NodeNext 直接解析公开类型。CJS 产物只由
  `build:node` 生成，不新增深层公开路径或 Server 本地镜像。

## 值与协议边界

- Workflow、Node、Edge、`VariableValue`、`JsonValue`、系统变量和环境变量契约只从
  `@ai-workflow/core` 根入口使用；Runtime 不重复声明领域值类型。
- `StartRuntimeInput.input` 是 `Record<string, unknown>`，启动时按 Start 节点 `outputs` 的 key、
  dataType、required 和 defaultValue 归一化；系统变量必须使用 Core 的完整键集合并匹配 Run 身份。
- `node.inputs` 统一解析直接值、节点引用、系统变量和非 Secret 环境变量；Config 不做递归形状猜测，
  含变量的节点必须注册显式 projector。系统变量和环境变量只作为引用解析上下文，不会自动展开为
  `sys.<key>` 或 `env.<name>` 输入；声明输入引用上下文变量时，解析后的真实值保留声明输入的 key。
  Loop 作用域内允许读取当前作用域和任意祖先作用域中已成功执行的合法上游节点；禁止根或祖先
  作用域反向读取 Loop 后代结果，也禁止读取兄弟 Loop 作用域，Execution 自身的 `scopeKey` 必须与
  被引用节点的静态所属作用域一致。
- `applyNodeResult()` 只接受已由 `@ai-workflow/protocol` parser 校验的 `ExecuteNodeResult`。Command 的
  commandId、nodeRunId、leaseToken、deadline 和 Inbox/Outbox 幂等仍由 Server 负责。
- 成功 Result 的原始 `outputs` 可以包含节点内置结果字段；Runtime 只按可选的 `node.outputs` 声明
  投影进入 Execution 的可引用变量，未声明字段不进入 RuntimeState，但不会导致工作流失败。
  `NodeOutputDefinition.value` 缺省时使用 Result 的同名字段，存在时在当前上游可见上下文中解析
  直接值或变量引用并覆盖同名结果；合并后统一校验必填、默认值、JSON 边界与 dataType。Start
  输入继续拒绝未声明字段。若输出投影失败，即使 Executor 原始 Result 为 `SUCCEEDED`，对应
  Execution 也会归一化为 `FAILED`；宿主持久化必须以该最终状态为准。
- Runtime 内部异常使用 `RuntimeError`；进入 State、Effect、数据库、MQ 或 API 前转换成只含 JSON 的
  `RuntimeErrorData`。

## DAG 与 Loop 语义

- Start 注入归一化输入并激活全部已连接输出 Handle；End 仅结束当前路径，最终结果统一解析
  `Workflow.outputs`。
- Edge 使用 `WAITING`、`ACTIVE`、`INACTIVE` 三态。节点等待全部入边收敛；至少一条 ACTIVE 时执行，
  全部 INACTIVE 时 SKIPPED，并继续传播未激活路径。
- 每次业务节点派发都会创建显式 Execution，State 保存 executionKey、nodeId、scopeKey、sequence、
  attempt、输入、配置、输出或标准错误；Loop 作用域内的 Execution 额外保存从 1 开始的
  `iteration`，供运行追踪区分同一节点的多轮执行。Start/End 等同步本地控制 Execution 额外持久化整数毫秒
  `durationMs`，即使在 1 ms 内完成也记录为 `1`；业务节点实际耗时继续由宿主 NodeRun 记录。
  禁止拆解 executionKey 推断执行位置。
- 状态迁移返回新 revision、可持久化 RuntimeState 和 `DISPATCH_NODE`、`COMPLETE_RUN` 或 `FAIL_RUN`
  Effect，不访问 NestJS、Prisma、RabbitMQ、Redis、HTTP 或 React。
- Loop、Loop Start 和 Loop Exit 由 Runtime 本地推进，不派发给 Executor。Loop Exit 结束当前轮，
  Runtime 按 `terminationCondition` 和 `maxIterations` 决定终止或重置该作用域进入下一轮。
- RuntimeState v2 的 `loopStates` 保存活跃 Loop 的迭代与父作用域，Execution `scopeKey`
  保存 `root` 或 Loop ID；调度器可从最内层活跃作用域恢复，支持嵌套 Loop。

## 当前阶段限制

- Sub Workflow、Secret Gateway 和业务重试等未实现能力必须由 Server 在创建 Run 前拒绝；
  新增持久化能力时继续升级 State Schema 版本和 Effect/Protocol 判别联合。
- Core 仍是 Workflow 静态正确性的唯一所有者；Runtime 的 `RUN_STALLED` 只处理动态状态无法推进，
  不能把静态图校验搬进 Compiler。
