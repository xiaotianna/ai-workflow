# @ai-workflow/plugin

`@ai-workflow/plugin` 是提供给第三方插件开发者使用的公共 SDK。它负责“描述插件”，不负责构建、安装或运行插件。

## 目录结构

```text
workflow-plugin
├── src
│   ├── contracts   插件整体、节点、表单、Manifest 等契约
│   ├── schema      节点配置的数据 Schema DSL
│   ├── ui          插件自定义 React UI 的公共接口
│   ├── executor    插件执行函数的公共接口
│   └── index.ts    环境无关的根导出
```

## `src/contracts`

定义“一个插件及其节点应该长什么样”，并用 Zod 做运行时校验。

- `config.ts`：插件源码配置，提供 defineConfig()、插件权限、节点集合及跨节点约束。
- `node.ts`：节点声明，提供 defineNode()，定义配置、端口、固定输出、UI 和执行方式。
- `field.ts`：表单字段 DSL，如 field.text()、field.select()、field.host()。
- `manifest.ts`：构建后 plugin.manifest.json 的结构和校验规则。
- `identifiers.ts`：npm package 名、节点 Key、端口 ID、节点 type 的命名规则。平台插件 UUID 不属于 SDK 契约。
- `module-reference.ts`：校验 UI、图标、Executor 等模块入口必须是安全相对路径。

contracts 描述的是完整插件、节点和 Manifest

## `src/schema`

定义“节点的配置数据应该长什么样”。

例如插件可以声明：

```ts
const configSchema = pluginSchema.object({
  url: pluginSchema.string(),
  timeout: pluginSchema.default(pluginSchema.number(), 30),
  errorHandling: pluginSchema.errorHandling(),
})
```

目录里的职责是：

- `types.ts`：Schema AST 的 TypeScript 类型和类型推导。
- `builders.ts`：pluginSchema.string()、object()、array()、errorHandling() 等声明 DSL。
- `ast-schema.ts`：检查序列化后的 AST（Schema 字段值） 本身是否合法。
- `compiler.ts`：通过 compilePluginSchemaToZod() 把 AST 重建成 Zod Schema。

这里没有直接让插件保存 Zod 对象，是因为 AST 必须能够写进 Manifest、通过网络传输，并由 Web、Server、CLI 确定性重建。

简单区分：

- `contracts`：插件、节点、Manifest 的外层结构。
- `schema`：节点 config 内部数据的结构。

## `src/ui`

这是 React 专用入口，只能通过以下方式使用：

```ts
import { HostField, BaseNode } from '@ai-workflow/plugin/ui'
```

- `contracts.ts`：自定义节点、节点内容和配置表单组件的 Props 契约。
- `host-field.tsx`：通过注册表把插件的 HostField 请求交给宿主 Web 应用渲染。
- `index.ts`：统一转发 BaseNode、变量选择器、表单 Hook、校验工具等稳定 API。

这一层的意义是隔离内部实现：第三方插件不需要、也不应该直接引用 apps/web 或其他包的 src 路径。

## `src/executor`

定义插件节点执行函数的标准签名：

```ts
defineExecutor(async ({ config, inputs, signal }) => ({
  outputs: {},
}))
```

它只描述：

- 配置和输入
- 工作流、节点运行 ID
- 重试次数
- 取消信号
- 输出结果

这里不是真正的执行器或沙箱，也不依赖 RabbitMQ、Go Worker、NestJS、React。构建后的
`sandbox-js` ESM 由 Server 按工作流锁和摘要解析，再交给 Go Executor 在独立临时目录的 Node.js
子进程中执行；SDK 本身不接触运行基础设施。该模式不构成不可信多租户安全边界，只适用于本地开发和
受信任插件。

需要使用平台模型配置时，节点可以声明 `execution: { kind: 'host-llm' }`。这种节点不提供 Executor
源码，由宿主使用 Core LLM Schema 校验配置、解析上下文变量并路由到固定 `llm` Executor；插件不会
接触模型 Base URL 或凭证。
