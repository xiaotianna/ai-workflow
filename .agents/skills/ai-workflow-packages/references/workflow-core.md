# `@ai-workflow/core`

## 职责

提供与界面和服务端框架无关的工作流领域模型：Workflow、节点类型、节点注册表、端口、内置节点、配置 schema 和业务校验。

## 公开入口

包只暴露根入口：

```ts
import {
  codeNode,
  endNode,
  workflowSchema,
  nodeRegistry,
  DEFAULT_NODE_VARIABLE_FORM,
  FIELD_UI_TYPES,
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
Code、HTTP、LLM 与 RAG 节点分别公开对应节点对象和配置类型，供 Nodes UI 保持 schema
与组件类型关联。

## 核心模型

- `workflowSchema` 校验工作流基本结构，包含 id、name、description、nodes 和 edges。
- `workflowNodeSchema` 校验通用节点字段、可选的实例 `label` / `description`、
  `inputs` 变量绑定和实例动态 `outputs`；实例名称和描述覆盖 `NodeDefinition` 的默认展示
  文案，具体 `config` 仍由对应 `NodeType.schema` 校验。
- `workflowEdgeSchema` 校验节点与端口引用，并禁止节点连接自身。
- `NodeRegistry` 管理节点类型，重复注册会抛错。
- `FIELD_UI_TYPES` 使用 `text`、`number`、`textarea`、`select`、`switch`、`slider`
  和 `code_editor` 作为字段 schema 的唯一判别值，不再同时声明数据 `type` 和 `ui`。
- `FieldSchemaByUI` 是字段 UI 到具体 schema 接口的显式类型表；
  `FieldSchema<TUI>` 直接通过该表获得具体字段类型，不使用条件类型。
- `TextFieldSchema`、`NumberFieldSchema`、`TextareaFieldSchema`、`SelectFieldSchema`、
  `SwitchFieldSchema`、`SliderFieldSchema` 和 `CodeEditorFieldSchema` 都继承
  `BaseFieldSchema`。`NumberConstraints` 只由 Slider 使用，普通数字输入的范围由 Zod 校验。
- `FieldSchemaMap<TConfig>` 根据配置键生成字段映射，字段值和最终合法性仍由节点 Zod schema
  负责；`NodeFormSchema<TSchema>` 用于把节点表单字段名约束到 schema 输出。
- 当前 `llm`、`http`、`loop`、`code` 和 `rag` 已声明通用节点配置 form；Code 使用
  `FIELD_UI_TYPES.CODE_EDITOR`，代码编辑器固定为 JavaScript，不在字段 schema 中重复保存
  语言元数据。RAG 使用空的静态 `SELECT` 选项声明知识库字段，具体知识库选项由应用在渲染
  表单前通过节点表单 Resolver 合并，Core 不依赖外部知识库数据。
- 字段 renderer 注册属于 `@ai-workflow/form`，Core 只保留无 React 依赖的字段契约。
- `NodeType.variableForm` 以可选的 `input` / `output` 区域声明节点变量表单；每个区域只保存
  标题、说明和 renderer 字符串，不保存 React 组件。节点未配置 `variableForm` 时，
  `resolveNodeVariableForm` 返回默认输入绑定区和输出定义区；配置对象存在时只使用其中实际
  声明的方向，缺少某方向就不渲染，不写 `null` 占位。内置 `INPUT_BINDINGS` renderer 编辑
  `node.inputs`，`OUTPUT_DEFINITIONS` renderer 编辑 `node.outputs`，具体 renderer 由
  `@ai-workflow/form` 提供。
- Start 将产品语义上的“输入变量”声明为 `OUTPUT_DEFINITIONS`，数据写入 `node.outputs`；
  且不声明 `output`；End 不声明 `input`，只将“输出变量”声明为 `INPUT_BINDINGS`，数据写入
  `node.inputs`。Code 和普通节点不需要重复声明，直接使用默认输入绑定区与输出定义区。
- `getNodePorts(nodeType, rawConfig)` 先解析配置，再返回动态端口或静态端口。
- `VariableValue` 只区分直接值和引用值；节点引用通过
  `nodeId + outputKey + path` 定位，`path: []` 读取整个输出变量，非空 `path` 读取嵌套字段。
- Edge 只表达执行依赖与分支 Handle，不按 `dataType` 阻止节点连线；`dataType` 属于变量定义。
- 节点输入引用只能读取执行连线可达的上游节点输出，不能引用自身、下游或无关节点。
- 输出设计提案由 `Workflow.outputs` 同时保存公开字段描述和内部 `value` 取值来源；
  End 配置保持为空，子工作流节点只复用 `key`、`label`、`dataType` 等公开字段。
- 当前正式注册的内置节点包括 `start`、`end`、`llm`、`rag`、`code`、`http`、
  `loop`、`loop_start`、`loop_exit`、`condition` 和 `sub_workflow`。
- 每个 Loop 必须恰好直接包含一个 `loop_start` 和一个 `loop_exit`；两者不能脱离 Loop，
  边也不能跨越 Loop 作用域。

## 新增节点

1. 定义 Zod 配置 schema，并导出推导后的配置类型。
2. 定义稳定唯一的 type、标签、说明、图标和静态端口。
3. 需要通用配置表单时使用 `NodeFormSchema<typeof nodeSchema>` 声明 form，以
   `FIELD_UI_TYPES` 中的 `ui` 选择控件；不要在字段中重复声明值类型。
4. 使用 `createInitialConfig()` 实现 `NodeType.createInitialConfig`，字段 schema 不保存默认值。
5. 动态端口通过 `resolvePorts(parsedConfig)` 生成，端口 id 必须与 edge handle 稳定对应。
6. 在 `BuiltinNodeType`、`builtinNodeStrategies` 和 `nodeRegistry` 中登记正式内置节点。
7. 如果节点需要专属界面，同步更新 `@ai-workflow/nodes-ui`。
8. 默认变量区满足需求时不声明 `NodeType.variableForm`；需要自定义时只声明实际显示的方向，
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
- 字段契约不再提供 `defaultValue`，节点默认配置唯一来源是 `NodeType.createInitialConfig()`。
- `src/node/get-node-ports使用文档.md` 和 `src/validate/validate使用.md` 是补充示例；示例与当前 API 不一致时以源码为准并同步更新文档。
