# `@ai-workflow/plugin`

## 职责

`packages/workflow-plugin` 是第三方插件开发者使用的公共 SDK 门面，负责提供可序列化的插件声明
DSL、Schema AST 与 Zod 编译器、源码配置和 manifest 契约，以及受限的 UI、Executor 公共类型。
包不负责读取插件 package、构建远程模块、发布产物、安装插件或运行第三方代码；这些能力分别属于
Plugin CLI、Web/Server 插件运行时和独立强沙箱。

## 公开入口

根入口保持环境无关：

```ts
import {
  compilePluginSchemaToZod,
  defineConfig,
  defineNode,
  field,
  pluginConfigSchema,
  pluginManifestSchema,
  pluginSchema,
  type PluginConfig,
  type PluginManifest,
} from '@ai-workflow/plugin'
```

- `defineConfig`、`defineNode` 只返回原对象，不执行校验、日志、环境读取或文件访问。
- `pluginSchema` 只生成纯数据 AST；支持 object、array、string、number、boolean、literal、enum、
  union、optional、nullable、default、JSON、VariableValue、DataType 和资源引用。
- `field` 覆盖文本、数字、文本域、选择、开关、滑块、代码编辑器、键值表、请求体、条件规则、
  条件分支、上下文消息和异常处理等 Form 内置 renderer；LLM、知识库、子工作流等应用数据字段
  必须使用 `field.host()`。
- `compilePluginSchemaToZod()` 是 Web、Server 和 CLI 重建业务校验规则的统一入口。
- `pluginConfigSchema` 校验插件源码默认导出的配置，包含初始配置、form 顶层字段、重复节点 Key、
  宿主字段能力和自定义 UI 权限等跨字段约束。
- `pluginManifestSchema` 校验构建后的纯数据 manifest，并校验节点 type 必须由
  `plugin:<publisher>/<plugin-id>/<node-key>` 生成。
- 节点配置 schema 顶层必须是 object；第一阶段只支持静态初始配置和静态端口。

React 能力只从 `./ui` 使用：

```ts
import {
  BaseNode,
  HostField,
  HostFieldProvider,
  HostVariablePicker,
  NodeContentItem,
  NodeContentList,
  createWorkflowHostFieldRegistry,
  type PluginConfigRendererProps,
  type PluginNodeContentProps,
  type PluginNodeRendererProps,
  type PluginWebModule,
} from '@ai-workflow/plugin/ui'
```

`HostField` 只通过 `WorkflowHostFieldRegistry` 取得宿主 renderer，不导入 `apps/web/src`。完整自定义
表单仍应使用该入口导出的 `useFormData` 和 `validateFormByZod`，并透传受控 config、errors、
disabled 与 availableVariables。

Executor 源码只从 `./executor` 使用：

```ts
import {
  defineExecutor,
  type PluginExecutorContext,
  type PluginExecutorResult,
} from '@ai-workflow/plugin/executor'
```

该入口只定义纯 JSON 输入、输出、运行标识和取消信号，不依赖 React、DOM UI、NestJS、RabbitMQ
或 Go Worker。`sandbox-js` 当前只是可声明产物类型；在独立强沙箱落地前，宿主不得执行它。

## 依赖边界与注意事项

- 根入口可以依赖环境无关的 `@ai-workflow/core` 类型和 Zod schema，不得引入 React 或应用代码。
- `./ui` 作为 Core、Form、Nodes UI、Shared 表单能力的稳定门面；第三方不得继续深层导入仓库源码。
- React 是 peer dependency，Web Remote 必须使用宿主共享实例。
- manifest、Schema AST、初始配置、form、端口与 artifact 引用必须保持可序列化，不能保存函数、
  class、React element、Zod 对象、绝对路径或越界相对路径。
- `field.host()` 生成的宿主字段必须同时列入 `requires.hostFields`；任何自定义 content、完整节点
  renderer 或完整配置 renderer 都必须声明 `web:execute`。
- 新增 Schema 能力时必须同时更新 AST 类型、builder、`pluginSchemaAstSchema`、Zod 编译器和本文件，
  不能只在 TypeScript 层增加不可由 Web/Server 确定性重建的函数能力。
