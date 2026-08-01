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
  HTTP_FORM_DATA_VALUE_TYPES,
  HTTP_METHODS,
  workflowSchema,
  nodeRegistry,
  CONDITION_LOGICAL_OPERATOR_KINDS,
  CONDITION_LOGICAL_OPERATOR_OPTIONS,
  CONDITION_OPERATOR_KINDS,
  CONDITION_OPERATOR_OPTIONS,
  DEFAULT_NODE_VARIABLE_FORM,
  FIELD_UI_TYPES,
  NODE_CONFIG_RENDERER_TYPES,
  NODE_VARIABLE_RENDERER_TYPES,
  getNodePorts,
  resolveNodeVariableForm,
  validateWorkflow,
  validateExecutorWorkflow,
  type FieldSchema,
  type NodeFormSchema,
  type NodeVariableForm,
} from '@ai-workflow/core'
```

不要从 `packages/workflow-core/src/*` 深层导入。
需要由其他 package 实现专属界面的内置节点通过根入口导出节点对象及其配置类型；当前
Code、HTTP、LLM、RAG 与 Condition 节点分别公开对应节点对象和配置类型，供 Form 与
Nodes UI 保持 schema 和组件类型关联。

## 核心模型

- `workflowSchema` 校验工作流基本结构，包含 id、name、description、nodes 和 edges。
- `workflowNodeSchema` 校验通用节点字段、可选的实例 `label` / `description`、
  `inputs` 变量绑定和实例动态 `outputs`；实例名称和描述覆盖 `NodeDefinition` 的默认展示
  文案，具体 `config` 仍由对应 `NodeType.schema` 校验。
- `NodeOutputDefinition` 除 `key`、`label`、`dataType`、`description` 外，可选保存
  `defaultValue` 与 `required`；默认值必须是可序列化 JSON 值，并与 string、number、
  boolean 类型声明一致，json 类型接受任意 JSON 值。两项保持可选以兼容旧工作流和不需要
  输入元数据的普通节点输出。
- `workflowEdgeSchema` 校验节点与端口引用，并禁止节点连接自身。
- `NodeRegistry` 管理节点类型，重复注册会抛错。
- `FIELD_UI_TYPES` 使用 `text`、`number`、`textarea`、`select`、`switch`、`slider`、
  `code_editor`、`key_value_table`、`request_body`、`condition_branches`、`llm_model`、
  `knowledge_base` 和 `context_messages` 作为字段 schema 的唯一判别值，不再同时声明数据
  `type` 和 `ui`。
- `FieldSchemaByUI` 是字段 UI 到具体 schema 接口的显式类型表；
  `FieldSchema<TUI>` 直接通过该表获得具体字段类型，不使用条件类型。
- `TextFieldSchema`、`NumberFieldSchema`、`TextareaFieldSchema`、`SelectFieldSchema`、
  `SwitchFieldSchema`、`SliderFieldSchema`、`CodeEditorFieldSchema`、
  `KeyValueTableFieldSchema`、`RequestBodyFieldSchema`、`ConditionBranchesFieldSchema`、
  `LlmModelFieldSchema`、`KnowledgeBaseFieldSchema` 和 `ContextMessagesFieldSchema` 都继承
  `BaseFieldSchema`。
  `NumberConstraints` 只由 Slider 使用，普通数字输入的范围由 Zod 校验。
- `FieldSchemaMap<TConfig>` 根据配置键生成字段映射，字段值和最终合法性仍由节点 Zod schema
  负责；`NodeFormSchema<TSchema>` 用于把节点表单字段名约束到 schema 输出。
- 当前 `loop`、`code`、`rag`、`http`、`condition` 和 `llm` 已声明通用节点配置 form；Code 使用
  `FIELD_UI_TYPES.CODE_EDITOR`，代码编辑器固定为 JavaScript，不在字段 schema 中重复保存
  语言元数据。RAG 使用 `FIELD_UI_TYPES.KNOWLEDGE_BASE` 在 Core 声明知识库字段，
  Web 通过字段 registry 注入依赖知识库目录的 renderer；Core 不依赖外部知识库数据。
- `NodeType.configRenderer` 为确实无法按顶层配置字段拆分的完整表单声明专属 renderer 名称；
  可按单个配置键表达的复杂控件应先形成字段 UI 类型并进入 `NodeType.form`。Core 只通过
  `NODE_CONFIG_RENDERER_TYPES` 保存字符串契约，整节点 React renderer 与内置注册表属于
  `@ai-workflow/form`，需要应用业务数据的 renderer 由应用通过 `NodeConfigSection.renderers`
  注入。声明专属 renderer 的节点不再把复杂配置伪装成普通 `FieldSchema`。当前内置节点均已
  使用字段级 form，`NODE_CONFIG_RENDERER_TYPES` 保留为空注册表，扩展机制本身继续保留。
- LLM 通过 `llmNodeForm` 按顺序声明 `LLM_MODEL` 与 `CONTEXT_MESSAGES`。模型字段由 Web 注入
  renderer，上下文字段由 Form 内置 renderer 提供；`config.messages` 按顺序保存带稳定 `id` 的
  `system`、`assistant`、`user` 消息及纯字符串内容，至少保留一条且消息内容不能为空。旧版
  `config.prompt` 在 schema 解析时自动迁移为 SYSTEM 消息，不在解析结果中继续保留 Prompt 字段。
  `config.model` 保存稳定的 `groupId`、`configuredModelId` 和可选 `parameters`。参数 schema
  统一覆盖温度、Top P、最大输出 Token、
  停止序列、响应格式、推理强度、思考模式以及 Ollama 的 Top K、重复惩罚和 Seed；所有字段
  缺失时表示沿用供应商默认值，旧节点由 schema 补为空引用与空参数。Core 只定义可序列化领域
  契约，不保存供应商展示信息、模型组凭证、参数界面策略或 Web 请求数据。
- HTTP 通过 `httpNodeForm` 按顺序声明 URL、Method、Headers、Params、Body 和连接超时；基础
  字段与复杂字段都由 `NodeConfigFields` 按 `field.ui` 分发，不再声明整节点 renderer。
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
- Condition 的 `config.conditions` 保存按顺序匹配的 IF / ELIF 分支和最后一个唯一 ELSE；
  普通分支通过公共 `ConditionLogicalOperator` 使用统一 AND 或 OR 组合 `rules`，旧配置缺少
  该字段时默认按 AND 解析；每条规则以两个 `VariableValue` 和公共 `ConditionOperator`
  表达。`IS_EMPTY`、`IS_NOT_EMPTY` 不保存右值，其余运算符必须保存右值。
  `portId` 是动态输出端口的稳定标识，修改规则不重建端口；旧的字符串 `condition` 不再属于
  当前 schema。旧版空字符串默认配置会安全转换为 `rules: []`，非空旧表达式拒绝有损转换。
  Condition 通过 `conditionNodeForm` 将 `conditions` 声明为 `CONDITION_BRANCHES` 字段，不再
  使用整节点 `configRenderer`；画布摘要和动态输出端口继续从写回后的同一份配置派生。
- Edge 只表达执行依赖与分支 Handle，不按 `dataType` 阻止节点连线；`dataType` 属于变量定义。
- 节点输入引用只能读取执行连线可达的上游节点输出，不能引用自身、下游或无关节点。
- 输出设计提案由 `Workflow.outputs` 同时保存公开字段描述和内部 `value` 取值来源；
  End 配置保持为空，子工作流节点只复用 `key`、`label`、`dataType` 等公开字段。
- 当前正式注册的内置节点包括 `start`、`end`、`llm`、`rag`、`code`、`http`、
  `loop`、`loop_start`、`loop_exit`、`condition` 和 `sub_workflow`。
- Code 节点新增时默认创建直接值输入 `arg1`、`arg2` 和 string 输出 `result`，初始代码
  通过这些变量生成 `main` 函数模板。
- 每个 Loop 必须恰好直接包含一个 `loop_start` 和一个 `loop_exit`；两者不能脱离 Loop，
  边也不能跨越 Loop 作用域。

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
- `validateExecutorWorkflow` 用于执行前，额外检查必填输入和循环依赖；不需要先调用保存校验。
- 原始请求、数据库 JSON 和导入文件都先做结构校验，再做业务校验。

## 注意事项

- Core 不依赖 React、NestJS、Prisma、Redis 或具体运行时。
- 节点 `inputs`/`outputs` 已接入 Workflow 结构与保存校验，变量值解析 Runtime 尚未实现。
- `src/workflow/workflow-output-schema.ts` 已包含字段取值来源，但仍使用旧的
  `outputVariableSchema`/`OutputVariable` 命名，且 `workflowSchema` 与子工作流尚未接入。
- `package.json` 直接声明 Core 源码使用的 Zod 依赖，不依靠根目录提升。
- 节点 `config` 的字段契约不提供 `defaultValue`，配置默认值唯一来源是
  `NodeType.createInitialConfig()`；这与 `NodeOutputDefinition.defaultValue` 的输入变量元数据
  语义不同。
- 节点变量默认值只由 `NodeType.createInitialInputs()` / `createInitialOutputs()` 提供，
  Web 的节点工厂不得按节点类型复制默认变量。
- `src/node/get-node-ports使用文档.md` 和 `src/validate/validate使用.md` 是补充示例；示例与当前 API 不一致时以源码为准并同步更新文档。
