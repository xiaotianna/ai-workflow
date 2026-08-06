# `@ai-workflow/core`

## 职责

提供与界面和服务端框架无关的工作流领域模型：Workflow、节点类型、节点注册表、端口、内置节点、配置 schema 和业务校验。

## 公开入口

包只暴露根入口：

```ts
import {
  codeNode,
  endNode,
  HTTP_BODY_TYPES,
  HTTP_FIXED_OUTPUTS,
  HTTP_FORM_DATA_VALUE_TYPES,
  HTTP_METHODS,
  HTTP_RESPONSE_OUTPUT_KEY,
  workflowSchema,
  nodeRegistry,
  CONDITION_LOGICAL_OPERATOR_KINDS,
  CONDITION_LOGICAL_OPERATOR_OPTIONS,
  CONDITION_OPERATOR_KINDS,
  CONDITION_OPERATOR_OPTIONS,
  conditionRulesSchema,
  DEFAULT_NODE_VARIABLE_FORM,
  FIELD_UI_TYPES,
  NODE_CONFIG_RENDERER_TYPES,
  NODE_VARIABLE_RENDERER_TYPES,
  ENVIRONMENT_VARIABLE_NAMESPACE,
  ENVIRONMENT_VARIABLE_TYPES,
  workflowEnvironmentVariableSchema,
  workflowEnvironmentVariablesSchema,
  SYSTEM_VARIABLE_DEFINITIONS,
  SYSTEM_VARIABLE_KEYS,
  SYSTEM_VARIABLE_NAMESPACE,
  systemVariableKeySchema,
  getNodePorts,
  resolveNodeVariableForm,
  validateWorkflow,
  validateExecutorWorkflow,
  type FieldSchema,
  type ConditionRules,
  type NodeFormSchema,
  type NodeVariableForm,
  type WorkflowEnvironmentVariable,
  type SystemVariableDefinition,
  type SystemVariableKey,
} from '@ai-workflow/core'
```

不要从 `packages/workflow-core/src/*` 深层导入。
需要由其他 package 实现专属界面的内置节点通过根入口导出节点对象及其配置类型；当前
Code、HTTP、LLM、RAG、Condition 与 Sub Workflow 节点分别公开对应节点对象和配置类型，供 Form 与
Nodes UI 保持 schema 和组件类型关联。

## 核心模型

- `workflowSchema` 校验工作流基本结构，包含 id、name、description、nodes、edges、outputs 和
  `environmentVariables`；旧工作流缺少环境变量字段时默认解析为空数组。
- `workflowNodeSchema` 校验通用节点字段、可选的实例 `label` / `description`、
  `inputs` 变量绑定和实例动态 `outputs`；实例名称和描述覆盖 `NodeDefinition` 的默认展示
  文案，具体 `config` 仍由对应 `NodeType.schema` 校验。
- `NodeOutputDefinition` 除 `key`、`label`、`dataType`、`description` 外，可选保存
  `defaultValue`、`required` 与 `value`；默认值和直接输出值必须是可序列化 JSON 值，并与
  string、number、boolean 类型声明一致，json 类型接受任意 JSON 值。`value` 使用统一
  `VariableValue`，缺省时由执行器返回同名字段，存在时由 Runtime 解析直接值或上游变量并覆盖
  该输出；字段保持可选以兼容旧工作流、Start 输入和执行器原生输出。
- `workflowEdgeSchema` 校验节点与端口引用，并禁止节点连接自身。
- `NodeRegistry` 管理节点类型，重复注册会抛错。
- `supportsSingleNodeTestRun(nodeType)` 判定节点是否允许 `SINGLE_NODE` 测试运行；Start、End、
  Loop、Loop Start、Loop Exit、Sub Workflow 返回 `false`。Web `canRunNode` 与 Server 单节点入口
  必须复用该函数，不得各自维护拒绝列表。
- `FIELD_UI_TYPES` 使用 `text`、`number`、`textarea`、`select`、`switch`、`slider`、
  `code_editor`、`key_value_table`、`request_body`、`condition_rules`、`condition_branches`、
  `llm_model`、`knowledge_base`、`sub_workflow`、`context_messages` 和 `error_handling` 作为
  字段 schema 的唯一判别值，不再同时声明数据 `type` 和 `ui`。
- `FieldSchemaByUI` 是字段 UI 到具体 schema 接口的显式类型表；
  `FieldSchema<TUI>` 直接通过该表获得具体字段类型，不使用条件类型。
- `TextFieldSchema`、`NumberFieldSchema`、`TextareaFieldSchema`、`SelectFieldSchema`、
  `SwitchFieldSchema`、`SliderFieldSchema`、`CodeEditorFieldSchema`、
  `KeyValueTableFieldSchema`、`RequestBodyFieldSchema`、`ConditionRulesFieldSchema`、
  `ConditionBranchesFieldSchema`、`LlmModelFieldSchema`、`KnowledgeBaseFieldSchema`、
  `SubWorkflowFieldSchema`、`ContextMessagesFieldSchema` 和 `ErrorHandlingFieldSchema` 都继承
  `BaseFieldSchema`。`NumberConstraints` 只由 Slider 使用，普通数字输入的范围由 Zod 校验。
- `FieldSchemaMap<TConfig>` 根据配置键生成字段映射，字段值和最终合法性仍由节点 Zod schema
  负责；`NodeFormSchema<TSchema>` 用于把节点表单字段名约束到 schema 输出。
- 当前 `loop`、`code`、`rag`、`http`、`condition`、`llm` 和 `sub_workflow` 已声明通用节点配置
  form；Code 使用 `FIELD_UI_TYPES.CODE_EDITOR`，代码编辑器固定为 JavaScript，不在字段 schema
  中重复保存语言元数据。RAG 使用 `FIELD_UI_TYPES.KNOWLEDGE_BASE` 在 Core 声明
  `config.knowledgeBases`，按顺序保存不允许重复的知识库引用；每项包含稳定 `id` 和可选
  `title` / `icon` 展示快照，创建节点时可为空。正整数 `config.topK` 范围为 1 到 20、默认 `5`，
  通过紧随其后的 SLIDER 字段显示“召回设置”。旧 `config.knowledgeBaseId` 与
  `config.knowledgeBaseIds` 由 schema 自动迁移为缺少展示快照的引用对象，历史配置缺少 `topK`
  时补齐默认值。Web 只在配置字段挂载时加载外部目录并补全快照；Core 不依赖外部知识库数据。
- Sub Workflow 使用 `FIELD_UI_TYPES.SUB_WORKFLOW` 声明 `config.workflow`：稳定 `id` 为被调用
  Workflow ID，`appId` 供 Studio 目录匹配与拉取已发布契约，可选 `name` / `icon` 为展示快照；
  创建节点时允许空引用草稿，旧 `config.workflowId` 字符串由 schema 迁移为引用对象。节点只声明
  输入变量区（`INPUT_BINDINGS`），不提供可编辑输出区；公开输出由 Web 在选择已发布目标后写入
  `node.outputs`，只复用目标发布版本 `Workflow.outputs` 的 `key`、`label`、`dataType` 和可选
  `description`。`createSubWorkflowNodeVariables()` 根据目标 Start 的 `outputs` 与
  `Workflow.outputs` 生成输入绑定和输出定义，并保留同名旧输入绑定。未发布工作流不得作为候选。
- HTTP、LLM 与 Code 共用 `config.errorHandling` 异常处理契约，使用 `mode` 区分 `none`、
  `default_value` 和 `error_branch`；字段缺省时由 schema 补为 `none`。默认值模式保存经过
  `jsonValueSchema` 校验的可序列化 JSON；异常分支模式通过统一 `resolveErrorHandlingPorts`
  在原输出端口之外增加稳定且允许多条连线的 `error` 输出端口，切换到其他模式后该端口不再存在。
- `NodeType.configRenderer` 为确实无法按顶层配置字段拆分的完整表单声明专属 renderer 名称；
  可按单个配置键表达的复杂控件应先形成字段 UI 类型并进入 `NodeType.form`。Core 只通过
  `NODE_CONFIG_RENDERER_TYPES` 保存字符串契约，整节点 React renderer 与内置注册表属于
  `@ai-workflow/form`，需要应用业务数据的 renderer 由应用通过 `NodeConfigSection.renderers`
  注入。声明专属 renderer 的节点不再把复杂配置伪装成普通 `FieldSchema`。当前内置节点均已
  使用字段级 form，`NODE_CONFIG_RENDERER_TYPES` 保留为空注册表，扩展机制本身继续保留。
- LLM 通过 `llmNodeForm` 按顺序声明 `LLM_MODEL`、`CONTEXT_MESSAGES` 与 `ERROR_HANDLING`。模型字段由 Web 注入
  renderer，上下文字段由 Form 内置 renderer 提供；`config.messages` 按顺序保存带稳定 `id` 的
  `system`、`assistant`、`user` 消息及纯字符串内容，至少保留一条且消息内容不能为空。旧版
  `config.prompt` 在 schema 解析时自动迁移为 SYSTEM 消息，不在解析结果中继续保留 Prompt 字段。
  `config.model` 保存稳定的 `groupId`、`configuredModelId`、可选 `parameters`，以及可选的
  `groupName`、`modelId`、`modelName`、`providerType` 展示快照。旧配置缺少展示快照时仍可解析；
  展示快照只服务编辑器与画布，不替代运行时用稳定 ID 解析真实模型。参数 schema
  统一覆盖温度、Top P、最大输出 Token、
  停止序列、响应格式、推理强度、思考模式以及 Ollama 的 Top K、重复惩罚和 Seed；所有字段
  缺失时表示沿用供应商默认值，旧节点由 schema 补为空引用与空参数。Core 只定义可序列化领域
  契约，不保存模型组凭证、参数界面策略或 Web 请求数据。
- HTTP 通过 `httpNodeForm` 按顺序声明 URL、Method、Headers、Params、Body、连接超时和异常处理；基础
  字段与复杂字段都由 `NodeConfigFields` 按 `field.ui` 分发，不再声明整节点 renderer。
  新建 HTTP 节点的 URL 初始值为空字符串，作为可保存、可连线的编辑草稿；非空 URL 仍必须
  满足完整 URL 格式并使用 HTTP 或 HTTPS 协议，必填空值由工作流检查清单提示。
  `connectionTimeout` 使用秒为单位的正数并默认设为 30，旧配置缺省时由 schema 自动补齐。
  Headers、Params
  以带稳定 `id` 的键值条目数组保存，Key 与 Value 都使用 `VariableValue`，空 Key 和空 Value
  允许保留；字段缺省时各创建一条空行，用户删除后显式保存的空数组不会自动补回。Body 使用
  `type` 判别 none、form-data、x-www-form-urlencoded、json、raw、binary，
  form-data 条目额外保存 `text` / `file` 类型，其余内容继续使用 `VariableValue`。
  `createHttpRequestBody(type)` 负责创建切换 Body 类型时的合法初始结构，其中两种表格 Body
  默认各包含一条可删除的空行；旧 HTTP 配置缺少新增字段时由 schema 默认补齐 Headers、Params
  的初始空行和 none Body。
- `NodeType.createInitialInputs()` 与 `createInitialOutputs()` 为需要预置变量的节点分别生成
  独立的输入绑定和输出定义；`createInitialConfig(variables)` 可以读取同一批初始变量，
  让配置模板与变量名保持一致。未声明变量工厂的节点继续使用空输入和空输出。
- `NodeType.fixedOutputs` 声明节点实例不可删除、修改或配置取值映射的固定输出定义，统一通过
  `normalizeNodeOutputs` 合并到 `node.outputs`，并始终以类型定义中的固定元数据为准。输出端口只负责 Edge Handle 与执行分支，
  `node.outputs` 才是节点公开的变量集合；即使两者当前使用相同字符串，也不得从端口推导变量，
  或用端口存在性放宽变量引用校验。LLM 只固定公开最终回答字符串 `result`，不公开模型思考过程；
  Executor 可以在供应商最终回答为空时把其思考字段归一为 `result` 兜底。HTTP 固定公开 JSON `response`，
  内容包含 `status`、`headers`、`data` 和 `durationMs`；两者都允许实例追加其他输出定义。
  Code 的源码派生输出不写入 `NodeType.fixedOutputs`；它们由 `deriveCodeNodeOutputs()` 按节点配置
  动态生成，并在配置面板中以相同的不可编辑语义展示。
- 字段 renderer 注册属于 `@ai-workflow/form`，Core 只保留无 React 依赖的字段契约。
- `NodeType.variableForm` 以可选的 `input` / `output` 区域声明节点变量表单；每个区域只保存
  标题、说明和 renderer 字符串，不保存 React 组件。节点未配置 `variableForm` 时，
  `resolveNodeVariableForm` 返回默认输入绑定区和输出定义区；配置对象存在时只使用其中实际
  声明的方向，缺少某方向就不渲染，不写 `null` 占位。内置 `INPUT_BINDINGS` renderer 编辑
  `node.inputs`，`OUTPUT_DEFINITIONS` renderer 编辑 `node.outputs`，
  `START_INPUT_VARIABLES` renderer 使用 Start 专属 UI 编辑 `node.outputs`，具体 renderer 由
  `@ai-workflow/form` 提供。
- Start 将产品语义上的“输入变量”声明为 `START_INPUT_VARIABLES`，数据写入 `node.outputs`，
  且不声明 `output`；End 不声明 `input`，只将“输出变量”声明为 `INPUT_BINDINGS`，数据写入
  `node.inputs`。Code 和普通节点不需要重复声明，直接使用默认输入绑定区与输出定义区。
- `getNodePorts(nodeType, rawConfig)` 先解析配置，再返回动态端口或静态端口。
- `VariableValue` 只区分直接值和引用值；节点引用通过
  `nodeId + outputKey + path` 定位，`path: []` 读取整个输出变量，非空 `path` 读取嵌套字段。
  节点变量引用只允许使用上游实例 `node.outputs` 已声明的 Key，不把静态或动态输出端口视为变量。
- 内置系统变量由 `SYSTEM_VARIABLE_DEFINITIONS` 统一声明稳定 Key、`DataType` 和说明，文本
  命名空间统一使用 `SYSTEM_VARIABLE_NAMESPACE`（当前为 `sys`）。系统引用持久化为
  `scope: 'system' + key`，`key` 只保存 `user_id` 等裸 Key，不重复保存 `sys.`；
  `systemVariableKeySchema` 将引用限制在已声明的系统变量集合内。节点自定义的同名输出仍使用
  `scope: 'node' + nodeId + outputKey`，不会与系统变量冲突。
- 工作流环境变量由 `workflowEnvironmentVariableSchema` 统一声明稳定 ID、名称、描述、类型和值，
  类型只允许 `string`、`number`、`secret`；集合 schema 保证 ID 和名称唯一。文本命名空间使用
  `ENVIRONMENT_VARIABLE_NAMESPACE`（当前为 `env`），引用持久化为
  `scope: 'env' + variableId`，展示名称不进入引用，因此重命名不会破坏节点配置。自定义
  `user_id` 显示为 `env.user_id`，系统变量仍是 `sys.user_id`。
- Condition 的 `config.conditions` 保存按顺序匹配的 IF / ELIF 分支和最后一个唯一 ELSE；
  普通分支通过公共 `ConditionLogicalOperator` 使用统一 AND 或 OR 组合 `rules`，旧配置缺少
  该字段时默认按 AND 解析；每条规则以两个 `VariableValue` 和公共 `ConditionOperator`
  表达。`IS_EMPTY`、`IS_NOT_EMPTY` 不保存右值，其余运算符必须保存右值。
  `portId` 是动态输出端口的稳定标识，修改规则不重建端口；旧的字符串 `condition` 不再属于
  当前 schema。旧版空字符串默认配置会安全转换为 `rules: []`，非空旧表达式拒绝有损转换。
  Condition 通过 `conditionNodeForm` 将 `conditions` 声明为 `CONDITION_BRANCHES` 字段，不再
  使用整节点 `configRenderer`；画布摘要和动态输出端口继续从写回后的同一份配置派生。
- `conditionRulesSchema` 是 Condition 与其他节点共用的单组判断规则契约，包含统一的 AND / OR
  `logicalOperator` 和带稳定 ID 的 `rules`。Loop 的 `config.terminationCondition` 使用该契约，
  通过 `CONDITION_RULES` 字段编辑；空 `rules` 表示不设置循环终止条件，历史 Loop 配置缺少该
  字段时自动补为空条件，此时循环仅受 `maxIterations` 限制。
- Edge 只表达执行依赖与分支 Handle，不按 `dataType` 阻止节点连线；`dataType` 属于变量定义。
- 节点输入引用和输出 `value` 映射只能读取执行连线可达的上游节点输出，不能引用自身、下游或
  无关节点；环境变量引用同样校验稳定 ID 是否存在。
- 输出设计提案由 `Workflow.outputs` 同时保存公开字段描述和内部 `value` 取值来源；
  End 配置保持为空，子工作流节点只复用 `key`、`label`、`dataType` 等公开字段写入
  `node.outputs`，不保存目标输出的内部 `value`。
- 当前正式注册的内置节点包括 `start`、`end`、`llm`、`rag`、`code`、`http`、
  `loop`、`loop_start`、`loop_exit`、`condition` 和 `sub_workflow`。
- Code 节点新增时默认创建直接值输入 `arg1`、`arg2`，初始代码通过这些变量生成 `main` 函数模板。
  `deriveCodeNodeOutputs()` 按 ESM 语法解析普通或 `export` 声明的 `main`，静态提取其直接返回的
  对象字面量顶层 Key，并以 `json` 类型同步为不可手动修改或删除的执行器输出；代码语法暂时
  不完整时保留最后一次有效定义，返回 Key 变化后删除旧执行器输出并增加新输出。用户显式配置了
  `value` 的附加输出映射不受源码同步影响。
- 每个 Loop 必须恰好直接包含一个 `loop_start` 和一个 `loop_exit`；两者不能脱离 Loop，
  边也不能跨越 Loop 作用域。每个直接子节点必须从 Loop Start 可达且能到达 Loop Exit。
  Loop Start 固定公开 `input` 和从 1 开始的 `iteration`；Loop 固定公开最后一轮的 `result`。

## 新增节点

1. 定义 Zod 配置 schema，并导出推导后的配置类型。
2. 定义稳定唯一的 type、标签、说明、图标和静态端口。
3. 需要通用配置表单时使用 `NodeFormSchema<typeof nodeSchema>` 声明 form，以
   `FIELD_UI_TYPES` 中的 `ui` 选择控件；不要在字段中重复声明值类型。
4. 可按单个配置键表达且存在平台复用价值的复杂配置应增加字段 UI 类型，并在
   `@ai-workflow/form` 注册字段 renderer；依赖应用业务数据的字段 renderer 由应用通过字段
   registry 注入。只有无法按顶层字段拆分或第三方插件完整接管时才使用
   `NodeType.configRenderer`，不要让整节点 renderer 重复渲染已有基础字段。
5. 使用 `createInitialConfig()` 实现 `NodeType.createInitialConfig`；需要预置节点变量时同时
   实现 `createInitialInputs()` / `createInitialOutputs()`，配置模板需要变量名时从
   `createInitialConfig(variables)` 的参数读取。
6. 动态端口通过 `resolvePorts(parsedConfig)` 生成，端口 id 必须与 edge handle 稳定对应。
7. 在 `BuiltinNodeType`、`builtinNodeStrategies` 和 `nodeRegistry` 中登记正式内置节点。
8. 如果节点需要专属界面，同步更新 `@ai-workflow/nodes-ui`。
9. 默认变量区满足需求时不声明 `NodeType.variableForm`；需要自定义时只声明实际显示的方向，
   缺少的方向不渲染且不写 `null`，不在 Web 中按节点类型维护另一份映射。

## 校验顺序

```ts
const parsed = workflowSchema.safeParse(rawWorkflow)
if (!parsed.success) return parsed.error.issues

const saveIssues = validateWorkflow(parsed.data, nodeRegistry)
const runIssues = validateExecutorWorkflow(parsed.data, nodeRegistry)
```

- `validateWorkflow` 用于编辑和保存，允许必填端口暂未连接，也不检查环。
- `validateExecutorWorkflow` 用于执行前，额外检查必填输入、循环依赖、根作用域恰好一个 Start、
  至少一个 End，以及所有根节点从 Start 可达并可到达 End；不需要先调用保存校验。
- 原始请求、数据库 JSON 和导入文件都先做结构校验，再做业务校验。
- Runtime 的 `buildExecutionPlan()` 只消费已通过上述两层校验的 Workflow 并建立查询索引，不得重复
  节点、Edge、端口、环、Loop 作用域或变量引用规则。若执行依赖新的静态不变量（例如 Workflow
  输出引用），先把规则加入 Core 的执行前校验，再由所有入口复用。

## 注意事项

- Core 不依赖 React、NestJS、Prisma、Redis 或具体运行时。
- Go Executor 目标架构直接复用 Core 已有的 `Workflow`、节点、边、`NodeOutputDefinition`、
  `VariableValue`、环境变量、`SystemVariableKey`、`SYSTEM_VARIABLE_KEYS`、
  `SYSTEM_VARIABLE_DEFINITIONS` 和执行前校验，不要求 Core 先增加 Runtime 专属值类型。
- `VariableValue` 的 Direct Value 使用 `unknown` 是进入变量解析前的开放值边界；
  `WorkflowNode.config` 使用 `Record<string, unknown>` 是通用节点外壳，具体配置继续由对应
  `NodeType.schema` 校验。不得仅为了 Runtime 或 MQ 边界全局收窄这两个领域字段。
- `NodeOutputDefinition.defaultValue` 已在 `workflow-node-schema.ts` 中通过现有递归 `JsonValue` 和
  `jsonValueSchema` 限制为 JSON 值，并已经由 Node 入口和 Core 根入口公开。Runtime 直接从
  `@ai-workflow/core` 复用，不要创建结构相同的 Runtime 值类型，也不要借此改写 Core 字段。
  `StartRuntimeInput`、RuntimeState、Runtime Effect 和跨语言协议仍不属于 Core。
- 节点 `inputs`/`outputs` 与环境变量已接入 Workflow 结构与保存校验，变量值解析由 Runtime 实现。
- 包根 `types`/`default` 条件继续指向 TypeScript 源码，`require` 条件指向 `dist/index.cjs`；package
  module 类型保持 CommonJS，使 NestJS NodeNext 可以直接解析根入口类型，不需要 Server 维护镜像
  声明或加载适配层。Server 启动或构建前通过 `build:node` 生成 CJS 入口，所有调用方仍只从包根使用。
- `src/workflow/workflow-output-schema.ts` 已包含字段取值来源并接入 `workflowSchema`；Workflow 输出
  引用的存在性、可达性和运行时实际值解析仍需分别由 Core 执行前校验与 Runtime 补齐。
- `package.json` 直接声明 Core 源码使用的 Zod 依赖，不依靠根目录提升。
- 节点 `config` 的字段契约不提供 `defaultValue`，配置默认值唯一来源是
  `NodeType.createInitialConfig()`；这与 `NodeOutputDefinition.defaultValue` 的输入变量元数据
  语义不同。
- 节点变量默认值只由 `NodeType.createInitialInputs()` / `createInitialOutputs()` 提供，
  Web 的节点工厂不得按节点类型复制默认变量。
- `src/node/get-node-ports使用文档.md` 和 `src/validate/validate使用.md` 是补充示例；示例与当前 API 不一致时以源码为准并同步更新文档。
