# `@ai-workflow/core`

## 职责

提供与界面和服务端框架无关的工作流领域模型：Workflow、节点类型、节点注册表、端口、内置节点、配置 schema 和业务校验。

## 公开入口

包只暴露根入口：

```ts
import {
  workflowSchema,
  nodeRegistry,
  getNodePorts,
  validateWorkflow,
  validateExecutorWorkflow,
} from '@ai-workflow/core'
```

不要从 `packages/workflow-core/src/*` 深层导入。

## 核心模型

- `workflowSchema` 校验工作流基本结构，包含 id、name、description、nodes 和 edges。
- `workflowNodeSchema` 校验通用节点字段、`inputs` 变量绑定和实例动态 `outputs`，具体
  `config` 仍由对应 `NodeType.schema` 校验。
- `workflowEdgeSchema` 校验节点与端口引用，并禁止节点连接自身。
- `NodeRegistry` 管理节点类型，重复注册会抛错。
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
3. 使用 `createInitialConfig()` 实现 `NodeType.createInitialConfig`，不要继续使用已废弃的字段默认值。
4. 动态端口通过 `resolvePorts(parsedConfig)` 生成，端口 id 必须与 edge handle 稳定对应。
5. 在 `BuiltinNodeType`、`builtinNodeStrategies` 和 `nodeRegistry` 中登记正式内置节点。
6. 如果节点需要专属界面，同步更新 `@ai-workflow/nodes-ui`。

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
- `package.json` 当前未声明源码直接使用的 Zod 依赖；维护 manifest 时应补齐直接依赖，不能依靠根目录提升。
- `BaseFieldSchema.defaultValue` 已废弃，实际节点默认配置来源是 `NodeType.createInitialConfig()`。
- `src/node/get-node-ports使用文档.md` 和 `src/validate/validate使用.md` 是补充示例；示例与当前 API 不一致时以源码为准并同步更新文档。
