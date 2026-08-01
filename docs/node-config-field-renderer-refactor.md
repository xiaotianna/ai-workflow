# 节点配置字段级 Renderer 重构清单

> 状态：已完成。HTTP、Condition、LLM、RAG 均已迁移为字段级 renderer。

## 1. 重构目标

节点配置默认使用 `NodeType.form` 描述，每个配置键通过稳定的 `field.ui` 从字段 renderer
注册表选择组件。`label` 只用于展示，不得作为组件定位、注册或分支判断依据。

字段 renderer 可以是普通 Input、Select，也可以是键值表格、请求体、条件分支、模型选择器等
复杂受控组件。复杂不等于必须接管整个节点表单；只有无法按配置字段拆分，或第三方插件确实需要
完整接管表单时，才保留 `NodeType.configRenderer`。

统一数据流：

```text
Core NodeType.form
  -> Web 注入依赖应用数据的字段 renderer
  -> Form NodeConfigFields 按 field.ui 查找 renderer
  -> 字段 renderer 接收 value / error / errors / availableVariables
  -> onChange(name, value)
  -> Web 使用 Core Zod schema 校验并写回 node.config
```

字段在 `NodeType.form` 中的声明顺序就是展示顺序。需要调整布局时修改字段声明顺序，不在 Web
中按节点类型重新排序。

## 2. HTTP 已完成

HTTP 不再声明整节点 `configRenderer`，而是在
`packages/workflow-core/src/nodes/http/form.ts` 中完整声明：

1. `url`：`TEXT`。
2. `method`：`SELECT`。
3. `headers`：`KEY_VALUE_TABLE`。
4. `params`：`KEY_VALUE_TABLE`。
5. `body`：`REQUEST_BODY`。
6. `connectionTimeout`：`NUMBER`。

`KEY_VALUE_TABLE` 和 `REQUEST_BODY` 已成为平台维护的正式字段类型，并在
`@ai-workflow/form` 的 `builtinFields` 注册。原
`packages/workflow-form/src/config/http-config-editor.tsx` 已删除，其中的请求体编辑逻辑归入
`RequestBodyField`，Headers 和 Params 继续共用 `KeyValueTableField`。

`NodeConfigFields` 现在统一向字段 renderer 透传完整错误映射和 `availableVariables`，复杂字段
不需要重新接管整个配置对象，也不需要遍历工作流图。

## 3. 组件重构状态

### 3.1 ConditionBranchesField（已完成）

当前文件：

- `packages/workflow-form/src/fields/condition-branches-field/index.tsx`
- `packages/workflow-core/src/nodes/condition/form.ts`
- `packages/workflow-core/src/nodes/condition/index.ts`

Condition 的配置对象只有 `conditions` 一个顶层字段，现在通过
`FIELD_UI_TYPES.CONDITION_BRANCHES` 和 `conditionNodeForm` 进入通用字段分发。原
`ConditionConfigEditor` 已迁移为标准字段 renderer `ConditionBranchesField`，只接收和回写
`conditions` 数组，不再接管整个节点配置。

已完成：

1. 增加稳定字段类型 `CONDITION_BRANCHES`。
2. 新增 `conditionNodeForm`，将 `conditions` 映射为该字段类型。
3. 组件迁移到 `packages/workflow-form/src/fields/condition-branches-field`，改为标准
   `FieldRendererProps`，只接收和回写 `conditions`。
4. 保留上游变量、嵌套错误路径、稳定分支端口 ID、节点摘要回填和动态端口逻辑。
5. 删除 Condition 的 `configRenderer` 声明、整节点注册项、专属常量和失效导出。

不变边界：`conditionNode.resolvePorts()` 仍属于 Core，字段 renderer 不负责 Edge 或端口清理；
Web 在合法配置写回节点后继续统一清理失效端口 Edge 并刷新 Handle。

### 3.2 LLM（已完成）

当前文件：

- `packages/workflow-core/src/nodes/llm/form.ts`
- `apps/web/src/features/workflow/node-config-renderers/llm-model-field.tsx`
- `packages/workflow-form/src/fields/context-messages-field/index.tsx`
- `packages/workflow-core/src/nodes/llm/index.ts`

LLM 现在通过 `llmNodeForm` 按顺序声明 `model` 和 `messages`。两个字段继续共用
`NodeConfigFields` 的统一数据流，但按依赖边界使用不同注册位置，不再由整节点 renderer
同时接管。

已完成：

1. 新增 `llmNodeForm`，按顺序声明 `model` 和 `messages`。
2. `model` 使用稳定字段类型 `LLM_MODEL`。`LlmModelField` 留在 Web，并通过
   `NodeConfigFields.renderers` 注入，继续消费模型目录 Context、模型 API 状态和供应商展示策略。
3. `messages` 使用稳定字段类型 `CONTEXT_MESSAGES`。`ContextMessagesField` 已迁入
   `@ai-workflow/form`，继续复用 `NodeVariablePicker`、Tiptap、Motion、上游变量和嵌套错误。
4. 模型参数 Dialog 仍是模型字段内部的临时子表单，没有提升为节点顶层字段。
5. 已删除 LLM 的 `configRenderer`、`NODE_CONFIG_RENDERER_TYPES.LLM`、`LlmNodeConfigEditor`、
   Web 整节点注册项、空的 `builtinWorkflowNodeConfigRenderers` 占位和旧
   `ContextMessagesEditor`，不存在双轨实现。

`configRenderer` 机制本身继续保留，用于无法按顶层配置字段拆分的完整动态表单，以及需要完整
接管节点配置界面的第三方插件；完成内置节点迁移不等于删除该扩展能力。Web 通过
`WorkflowEditor.configRenderers` 将宿主合并后的完整表单 registry 透传给
`WorkflowConfigPanel`，不再在 LLM 字段 registry 旁维护空的整节点 registry。

### 3.3 RAG（已完成）

当前文件：

- `packages/workflow-core/src/nodes/rag/form.ts`
- `apps/web/src/features/workflow/node-config-renderers/knowledge-base-field.tsx`
- `packages/workflow-core/src/nodes/rag/index.ts`

RAG 的 `knowledgeBases` 通过 Core `ragNodeForm` 和稳定字段类型
`FIELD_UI_TYPES.KNOWLEDGE_BASE` 进入通用字段分发；`topK` 作为紧随其后的独立 SLIDER 字段
渲染“召回设置”。字段名、标签、默认说明和必填约束不再由 Web 节点 Resolver 重组。

已完成：

1. 增加稳定字段类型 `KNOWLEDGE_BASE` 和 `KnowledgeBaseFieldSchema`。
2. `ragNodeForm.knowledgeBases` 使用知识库字段类型，不再以空 `SELECT.options`
   占位；数组按选择顺序保存带 `id`、可选 `title` / `icon` 的引用快照且禁止重复，历史
   `knowledgeBaseId` / `knowledgeBaseIds` 自动迁移。
3. Web `KnowledgeBaseField` 通过字段 registry 注入，随 RAG 配置面板挂载后才触发
   `WorkflowKnowledgeBaseCatalogProvider` 加载目录，并提供多选 Dialog、已选卡片和 Hover 操作；
   Provider 挂载和画布渲染不发起目录请求。
4. 已保存但当前目录不存在的知识库引用继续保留为不可用选项，不会被目录刷新
   静默清空。
5. `ragNodeSchema.topK` 是范围 1 到 20、默认值为 `5` 的整数，通过通用 Slider + 数字 Input
   编辑，知识库 renderer 标题区不承载召回配置。
6. 已删除 `apps/web/src/features/workflow/node-form-resolvers` 的 RAG resolver、内置注册表和
   通用解析层，配置面板直接消费 Core `NodeType.form`。

## 4. 不属于本问题的组件

- `LlmModelParametersDialog`：它是 `model.parameters` 的嵌套临时 Dialog，不接管节点顶层字段列表。
- `NodeInputBindingsEditor`、`NodeOutputDefinitionsEditor`、`StartInputVariablesEditor`：它们编辑
  `node.inputs` 或 `node.outputs`，由变量区 renderer 契约管理，不属于 `node.config` 字段分发。
- 第三方插件完整表单：插件拥有专属交互、运行时能力且无法形成平台标准字段时，可以继续使用
  `configRenderer`；详细边界见 `docs/plugin-node-config-form-design.md`。

## 5. 字段级重构约束

1. Core Zod schema 是字段结构和校验的唯一事实来源。
2. Core 只保存可序列化的字段描述和 renderer 名称，不依赖 React 或 Web API。
3. Form 字段保持受控，不保存第二份已提交配置。
4. 字段值通过 `onChange` 回写；多个顶层配置键不得由单个字段隐式修改。
5. 嵌套错误从完整错误映射按当前字段名派生，不在组件内复制校验规则。
6. 上游变量由 Web 计算后统一透传，字段不得自行读取 React Flow。
7. 依赖 Web API 的字段 renderer 留在 Web，并通过 `NodeConfigFields.renderers` 注入。
8. 多个节点真实复用的复杂字段才进入 Form；单节点、单字段且依赖应用业务的组件留在 Web。
9. `label` 可以修改、重复或国际化；注册表只使用稳定的 `ui` 标识。
10. 删除整节点 renderer 前，必须同步清理 Core 常量、Form/Web 注册表、公开导出和技能文档。

## 6. 验收结果

- HTTP、Condition、LLM、RAG 的所有顶层配置键都能在对应 `NodeType.form` 中看到。
- 普通字段与复杂字段由同一个 `NodeConfigFields` 按声明顺序渲染。
- Web 配置面板没有增加节点类型 JSX 分支；Web 数据字段通过字段 registry 注入。
- 每个字段级 renderer 只更新自己的配置键。
- 原有变量插入、嵌套错误、禁用态、动态端口和模型加载行为保持不变。
- 对应整节点 renderer、注册项和失效类型已删除，无双轨实现。
