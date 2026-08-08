# @ai-workflow/plugin-cli

`@ai-workflow/plugin-cli` 是第三方 AI Workflow 插件的开发期脚手架、检查与构建工具。它可以生成
插件项目模板，也可以读取插件 package 根导出的 `defineConfig(...)`，复用 `@ai-workflow/plugin`
契约生成 Manifest、可选 Web Remote、可选 Executor ESM、完整性信息和压缩包。

## 使用

仓库根目录已经提供项目内命令：

```bash
pnpm plugin:init ./examples/my-plugin
```

`plugin:init` 会先自动构建 CLI，再执行 `init`，因此修改 CLI 源码后不需要手动补一次 build。根目录
`prepare` 也会在正常执行 `pnpm install` 后构建 CLI。使用 `--ignore-scripts` 安装依赖时不会触发
`prepare`，但后续 `plugin:init` 仍会在执行前完成构建。

根 `plugin:init` 还会自动传入 `--local`：模板会根据目标目录动态生成指向
`packages/workflow-plugin` 和 `packages/workflow-plugin-cli` 的 `link:` 相对路径，不会尝试从 npm
下载尚未发布的包。直接执行公开的 `ai-workflow-plugin init` 时仍默认生成 `^1.0.0`，供未来正式发布后
在仓库外使用。

需要直接调试 CLI package 时，仍可以在该 package 中执行 `pnpm build`，然后使用
`ai-workflow-plugin` 命令。

## 命令

```text
ai-workflow-plugin init <directory> [--template <template>] [--package-name <name>] [--local] [--install]
ai-workflow-plugin check [--cwd <directory>]
ai-workflow-plugin build [--cwd <directory>] [--out-dir <directory>]
ai-workflow-plugin pack  [--cwd <directory>] [--out-dir <directory>]
ai-workflow-plugin dev   [--cwd <directory>] [--out-dir <directory>]
```

- `init`：生成 `basic`、`custom-ui` 或 `executor` 插件项目，默认不安装依赖。
- `check`：定位 package、解析根导出、临时编译默认导出，并检查配置、模块路径和导出。
- `build`：生成 `plugin.manifest.json`、`integrity.json` 及可选 Artifact。
- `pack`：重新执行确定性构建并生成 `.tgz` 和 SHA-256。
- `dev`：监听插件 package，保留最后一次成功构建，并提供本地静态 HTTP 服务。

CLI 只把 npm package 名作为第三方来源标识写入 Manifest。平台插件 UUID 不进入 CLI 或插件源码；
服务端在上传时用 package 名映射平台 UUID，并把当前认证用户绑定为作者。

## 创建插件项目

默认生成推荐的声明式 `basic` 模板：

```bash
pnpm plugin:init ./examples/my-plugin
```

也可以选择自定义 UI 或 Executor 模板：

```bash
pnpm plugin:init ./examples/my-plugin --template custom-ui
pnpm plugin:init ./examples/my-plugin --template executor
```

可用模板：

- `basic`：Schema 表单、静态端口和 `execution: none`；
- `custom-ui`：增加 React 节点 content 和 `web:execute` 权限；
- `executor`：增加 `defineExecutor()` 和 `sandbox-js` 声明，但 CLI 只构建、不运行 Executor。

`init` 默认用目标目录名作为 package 名，也可以通过
`--package-name @acme/my-plugin` 生成 scoped package。生成的 build/pack/dev scripts 不携带平台
UUID 或发布者参数。

依赖模式：

- 仓库根 `pnpm plugin:init`：自动使用本地 `link:` 依赖；
- `ai-workflow-plugin init --local`：从当前目录向上定位 AI Workflow 仓库并生成本地链接；
- `ai-workflow-plugin init`：生成 registry 版本范围，适用于 SDK 和 CLI 已正式发布以后。

目标目录必须不存在或为空，CLI 不覆盖非空目录。生成过程先写同级 staging，再一次性发布目标目录。
默认不安装依赖，只有显式传入 `--install` 才会执行 `pnpm install`：

```bash
pnpm plugin:init ./examples/my-plugin --template basic --install
```

生成后按提示执行：

```bash
cd my-plugin
pnpm install
pnpm plugin:check
```

## 根入口

插件 package 必须提供 `exports["."]`，支持字符串或 `source`、`import`、`default` 条件对象

```json
{
  "exports": {
    ".": "./src/index.ts"
  }
}
```

或者

```json
{
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

并且根入口必须默认导出插件配置：

```ts
import { defineConfig } from '@ai-workflow/plugin'

export default defineConfig({
  // ...
})
```

所有入口、图标、UI 和 Executor 模块必须位于插件 package 内。Executor 模块必须默认导出
`defineExecutor(...)` 的结果；CLI 只构建该模块，不执行第三方 Executor。

## 构建产物

```text
dist/
├── plugin.manifest.json
├── integrity.json
├── assets/
├── web/
│   ├── remoteEntry.js
│   └── remote-manifest.json
└── executor/
```

没有自定义 UI 时不会生成 `web/`，没有 `sandbox-js` 节点时不会生成 `executor/`。Web Remote 使用
ESM 格式，并把 React、React DOM 和 `@ai-workflow/plugin` 公共入口保留为宿主共享依赖。

## 源码结构

```text
src/
├── cli.ts / index.ts       命令行与公共 API 入口
├── commands/               init、check、build、pack、dev 流程编排
├── templates/              三套脚手架模板和公共文件生成能力
├── pipeline/               Manifest、Artifact 和完整性纯构建能力
├── config/                 插件默认导出加载
├── package/                package 发现、exports 与安全路径
├── validation/             源码模块和导出检查
└── shared/                 公共错误和类型
```

`commands` 可以组合下层能力；`pipeline`、`config`、`package`、`validation` 和 `shared` 不反向依赖
命令编排层。

CLI 发布产物会内联 `@ai-workflow/plugin` 的契约与校验代码，避免 Node.js 原生 ESM 直接加载 workspace
SDK 的 TypeScript 源码入口；负责临时编译插件源码的 `esbuild` 保留为 CLI 自身声明的运行时依赖。

## 安全边界

插件配置入口会在 CLI Node 进程中加载，所以本地 CLI 只应用于开发者主动构建的可信源码，它不是
Marketplace 的安全执行环境。CLI 不调用 Executor；第三方 Executor 产物只能由后续独立强沙箱运行。
