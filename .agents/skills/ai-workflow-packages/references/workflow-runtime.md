# `@ai-workflow/runtime`

## 职责

计划承载与 NestJS、数据库和界面无关的工作流执行计划、变量解析、运行上下文、依赖调度、
运行状态和状态迁移契约。全部内置节点的实际执行由独立 Go Executor 承担，Runtime 只产生已经
解析 Inputs 与 Config 的节点派发 Effect。

## 当前状态

- 包已声明 ESM，并通过根 `exports` 指向 `src/index.ts`；`tsconfig.json` 继承 workspace package
  配置。
- `src/index.ts`、`src/variable/resolve-variable-value.ts` 和
  `src/variable/resolve-output-variables.ts` 当前都是空占位文件，没有可用公共 API 或变量解析实现。
- `package.json` 尚未声明对 `@ai-workflow/core` 的直接依赖，`scripts` 当前为空。

## 首次实现顺序

1. 声明对 `@ai-workflow/core` 的直接 workspace 依赖，并确认根 `exports` 是预期的公共入口。
2. 定义最小的运行上下文、执行状态、节点派发 Effect、状态迁移结果和错误契约。
3. 接受已经通过 `validateExecutorWorkflow` 的 Workflow 和 NodeRegistry。
4. 先实现确定性依赖调度和变量解析，再逐步增加并发、重试、取消和检查点。
5. 首个公共 API 落地后，用真实用法替换本文件中的规划说明。

## 目标边界

- Runtime 实现时必须显式依赖 `@ai-workflow/core` 并只从根入口导入 `Workflow`、节点、边、
  `NodeOutputDefinition`、`VariableValue`、`JsonValue`、`jsonValueSchema`、环境变量、
  `SystemVariableKey`、系统变量常量和执行前校验；Core 是这些工作流领域类型和值契约的唯一
  来源。
- `StartRuntimeInput.input` 是调用方提交的动态字段边界，可以使用 `Record<string, unknown>`；
  Runtime 必须根据 Start 节点已有 `outputs` 的 `key`、`dataType`、`required` 和 `defaultValue`
  校验、拒绝非 JSON 值并归一化，之后才能写入强约束的 RuntimeState。不能误用表示节点变量
  引用绑定的 `NodeInputBindings`。
- 系统变量直接使用 `Record<SystemVariableKey, JsonValue>`；宿主通过 `SYSTEM_VARIABLE_KEYS`
  组装完整键集合，Runtime 再根据 `SYSTEM_VARIABLE_DEFINITIONS` 校验每个值的 dataType，并校验
  运行标识与工作流标识一致，不复制字符串键表或另建系统变量值文件。
- Runtime 不创建 `runtime-value.ts`，也不重复声明 RuntimeValue 或 RuntimeObject。RuntimeState、
  RuntimeEffect、解析后 Inputs/Config 和 Workflow Outputs 直接使用 Core `JsonValue` 或
  `Record<string, JsonValue>`；运行状态和 Effect 属于 Runtime。
  跨语言 JSON Schema 属于 `workflow-protocol`，不得把 Runtime 或协议契约放入 Core。
- Runtime 不实现内置节点 Executor，不在调度循环中硬编码节点类型；Core 的 NodeRegistry 只用于
  Schema、端口和执行前校验。
- 使用 edge 的 source、target 和 handle 决定执行依赖与条件分支，不依赖数组顺序；
  节点数据通过 `inputs` 中的直接值或上游输出引用解析。
- 根 Scope 的节点和边状态直接保存在 RuntimeState；每次 Loop 迭代使用独立 scopeKey 保存自己的
  节点、边、迭代序号和终态，嵌套 Loop 通过 parentScopeKey 形成 Scope 链。节点 executionKey
  必须包含当前 Scope 路径，避免不同迭代的状态和输出互相覆盖。
- Sub Workflow 由 NestJS 创建独立子 WorkflowRun 和 RuntimeState，不写入父 RuntimeState.scopes；
  父节点以 SUSPENDED 等待，childRunId 关联由 NodeRun/Capability 状态持久化。
- 最终结果直接解析 `Workflow.outputs[].value` 并按字段 `key` 组装；End 只表示当前路径结束，
  不重复保存最终输出配置。
- 子工作流执行结果必须符合被调用 Workflow 的公开输出字段，调用方不能读取其内部
  `value` 引用或依赖内部 End 实现。
- 运行时不修改已保存的 Workflow 或节点配置。
- 外部副作用通过 Runtime Effect 交给宿主；日志、持久化和检查点通过显式接口接入。
- NestJS 负责应用生命周期、依赖注入、Prisma、RabbitMQ、SSE 和 Runtime Effect 落地；Go
  Executor 负责全部内置节点行为。
- Runtime 不依赖 React、UI、Web Feature 或 Nest HTTP 类型。

## 执行注意事项

- 节点只有在依赖满足后执行，条件分支只激活选中的输出路径。
- 并发、失败传播、超时和取消语义必须显式且可预测。
- 只重试声明为可重试的失败；有副作用的节点需要幂等键或补偿策略。
- LangGraph 如果采用，应作为可替换适配器，不能反向定义 Core 领域模型。
