# `@ai-workflow/plugin-cli`

## 职责

`packages/workflow-plugin-cli` 是第三方插件的 Node.js 开发期脚手架与构建工具，负责生成内置插件项目
模板；也负责从插件 package 读取 `exports["."]` 默认导出，复用 `@ai-workflow/plugin` 契约执行检查，
并生成 Manifest、静态资源、可选 Web Remote、可选 Executor ESM、完整性信息和不可变压缩包。

CLI 不负责插件安装、发布、版本持久化、Web 注册或 Executor 执行。配置根入口会在 CLI Node 进程中
加载，所以本地 CLI 只用于开发者主动构建的可信源码；Marketplace 必须在受控环境重新构建或校验。

## 命令和公共 API

命令入口：

```text
ai-workflow-plugin init  <directory> [--template <basic|custom-ui|executor>] [--package-name <name>] [--local] [--install]
ai-workflow-plugin check [--cwd <directory>]
ai-workflow-plugin build [--cwd <directory>] [--out-dir <directory>]
ai-workflow-plugin pack  [--cwd <directory>] [--out-dir <directory>]
ai-workflow-plugin dev   [--cwd <directory>] [--out-dir <directory>]
```

根入口同时导出 `initPlugin()`、`checkPlugin()`、`buildPlugin()`、`packPlugin()`、`devPlugin()`、
`PluginCliError` 和对应 Options/Result 类型。构建命令共享同一份 package 发现、配置加载和源码引用
检查管线，不复制 SDK 校验规则。

仓库内从根目录使用 `pnpm plugin:init <directory>`。该脚本先执行
`pnpm --filter @ai-workflow/plugin-cli build`，再调用 CLI bin，避免源码变更后遗漏构建；根
`prepare` 也会在正常安装依赖后构建 CLI。根脚本自动传入 `--local`，根据目标目录生成指向 SDK 和
CLI workspace package 的 `link:` 相对路径。两处都只使用当前 workspace，不依赖全局 link 或 npm
已发布版本。

## 目录职责

- `src/cli.ts` 只处理参数、命令分发、输出和退出码；`src/index.ts` 只维护公共 Node API。
- `src/commands` 编排 init、check、build、pack、dev 用例，不承载 Manifest 转换或路径校验细节。
- `src/templates` 维护 basic、custom-ui、executor 模板以及公共 package、tsconfig、README、图标和
  插件入口生成能力；模板以 TypeScript 模块内联，确保 CLI 单文件构建产物可以直接使用。
- `src/pipeline` 维护 Manifest 计划、Artifact 构建、文件摘要等可复用构建能力。
- `src/config` 负责临时编译和加载插件默认导出。
- `src/package` 负责 package 发现、根 exports 解析和文件系统安全边界。
- `src/validation` 负责源码模块、export 和宿主版本范围检查。
- `src/shared` 只保存跨流程错误与公共输入输出类型。

依赖方向保持为 `cli -> commands -> pipeline/config/package/validation -> shared`。基础模块不得反向依赖
`commands`，新增能力优先进入已有职责目录，不恢复 `src` 根目录平铺。

## `init` 行为

- `init <directory>` 默认生成 basic 模板；custom-ui 增加 React content 与 `web:execute`，executor
  增加 `defineExecutor()` 与 `sandbox-js` 声明，并说明由本地 Go Executor 的 Node.js 子进程运行。
- 目标目录必须不存在或为空；拒绝普通文件、符号链接和非空目录。所有文件先写入同级 staging，成功后
  再 rename 到目标目录。
- package 名默认取目标目录名，可通过 `--package-name` 覆盖并执行 npm package 名校验。
- CLI 与源码配置不包含平台插件 UUID或 publisher；平台上传接口按 package 名映射 UUID，并绑定当前认证用户。
- 默认不安装依赖；只有 `--install` 才使用无 shell 的子进程执行 `pnpm install`。安装失败时保留已生成
  项目并提示手动重试。
- `--local` 从当前目录向上查找包含 `packages/workflow-plugin` 与 `packages/workflow-plugin-cli` 的仓库
  根，再按最终目标目录动态生成两个 `link:` specifier；找不到匹配 package 时失败。未使用 `--local`
  时保留 registry 版本范围，供两个包正式发布后的仓库外脚手架使用。

## 稳定流程

- 从 `cwd` 向上选择最近的 `package.json`；根导出支持字符串和 `source`、`import`、`default`
  条件对象，入口必须位于 package 内。
- 使用 esbuild 把 TypeScript/TSX 根入口临时编译为 Node ESM，再读取唯一配置入口 `default`；临时目录
  在命令结束时清理。
- 默认导出必须通过 `pluginConfigSchema`；`hostVersionRange` 额外使用 SemVer range 校验。
- icon、UI、表单和 Executor 引用必须是 package 内真实文件，并在检查阶段验证所声明的 export；
  Executor 固定要求 default export。
- Manifest node type 只通过 `createPluginNodeType(packageName, nodeKey)` 生成。
- 输出目录只能位于 package 内，同时检查父目录和符号链接真实路径；构建先写同文件系统 staging，
  校验成功后原子替换目标目录。
- Manifest `integrity.digest` 是排序后 Artifact 路径、大小和文件摘要的聚合 SHA-256；
  `integrity.json` 另外记录 Manifest 和全部 Artifact 的逐文件摘要，自身不参与循环摘要。
- pack 使用稳定路径顺序、固定 tar 元数据和 gzip 头生成 `.tgz`，压缩包摘要独立返回。

## Web 与 Executor 产物

- 自定义 content、完整节点 renderer 或完整配置 renderer 存在时生成 `web/remoteEntry.js` 和
  `web/remote-manifest.json`；当前 Remote 是 ESM 格式。
- React、React DOM 和 `@ai-workflow/plugin` 公共入口保留为宿主共享 external，不重复打入 Remote。
- Manifest 的 `remoteExport` 使用节点 Key 派生的稳定导出名，并由虚拟入口聚合成
  `PluginWebModule`。
- `sandbox-js` 为每个节点生成 `executor/<node-key>.mjs`。CLI 只编译和打包，禁止 import 或调用
  Executor Artifact；实际运行由 Go Executor 的独立 Node.js 子进程负责。

## `dev` 行为

- 首次执行完整 build，成功后才启动 HTTP 服务；默认监听 `127.0.0.1:4174`。
- `/` 返回 `plugin.manifest.json`，`/__ai_workflow_plugin/status` 返回最新构建状态。
- 连续文件变化合并为最新待执行任务；失败时保留最后一次成功产物。
- 忽略 `node_modules`、`.git`、输出目录和 staging/backup 目录，不自动打开浏览器或修改 Web 配置。

## 维护约束

- CLI 直接运行时依赖必须由自身 `package.json` 声明；Node 类型只放 devDependencies。
- CLI Node ESM 产物必须内联 `@ai-workflow/plugin` 契约，避免原生 Node 解析 workspace SDK 的
  TypeScript 源码和目录导入；`esbuild` 保持 external，并作为 CLI 直接运行时依赖。
- 参数解析、package/路径处理、配置加载、校验、Manifest 转换、Artifact 构建、摘要、打包和 dev 服务
  保持模块分离。
- 修改源码 Config 或 Manifest 契约时，先更新 `@ai-workflow/plugin`，CLI 只消费公开包入口，不深层
  引用其 `src`。
- 不在 CLI 中引入 Server、Web 应用、Prisma、RabbitMQ 或 Go Worker 依赖。
- 详细实施和验收顺序见 `docs/plugin-cli-implementation.md`。
