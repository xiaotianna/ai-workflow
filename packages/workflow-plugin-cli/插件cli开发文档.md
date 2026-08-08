# 插件 CLI 开发文档：面试讲解版

这份文档不按“逐个文件背源码”的方式介绍 `@ai-workflow/plugin-cli`，而是按照面试时更容易讲清楚的
顺序来说明：它解决了什么问题、接收什么输入、怎样一步步产出插件、为什么要这样设计，以及面试官
继续追问时应该怎样回答。

## 1. 先用一句话说清楚

`@ai-workflow/plugin-cli` 是一条运行在 Node.js 中的**插件构建流水线**。

插件开发者写的是 TypeScript 配置、UI、图标和 Executor 源码；CLI 负责把这些开发态源码检查并转换成
平台能够识别、校验、分发的标准插件产物。

可以把它类比成“插件世界里的编译器加打包器”：

```text
开发者写的插件源码
  -> 找到插件入口
  -> 读取并校验插件配置
  -> 检查源码引用
  -> 生成 Manifest 和各种 Artifact
  -> 计算完整性摘要
  -> 输出 dist 或 tgz
```

这里的两个核心词是：

- **Manifest**：插件的说明书，告诉平台插件是谁、包含哪些节点、需要什么能力、产物放在哪里；
- **Artifact**：平台实际需要加载的文件，例如图标、Web UI 模块和 Executor ESM。

## 2. 为什么需要单独做一个 CLI

插件源码不能直接交给平台使用，主要有四个原因：

1. 插件入口可能是 TypeScript 或 TSX，Node.js 和浏览器不能直接把它当成最终产物使用；
2. 插件配置可能写错，例如节点 Key 重复、版本范围非法、引用的 UI 文件不存在；
3. 平台需要的是可序列化的 Manifest，而不是带有开发期路径和 TypeScript 类型的源码配置；
4. 插件要被分发，就必须有稳定的目录结构、文件摘要和压缩包。

所以项目把职责分成了两层：

```text
@ai-workflow/plugin
  负责定义规则：Config、Schema、Manifest、UI 和 Executor 契约

@ai-workflow/plugin-cli
  负责执行规则：读取 package、检查源码、构建产物、计算摘要、打包和本地开发
```

面试时可以这样概括两者关系：

> SDK 负责告诉开发者“插件应该怎么写”，CLI 负责验证“你是否写对了”，再把源码变成平台可以消费的产物。

CLI 复用 `@ai-workflow/plugin` 的 `pluginConfigSchema`、`pluginManifestSchema` 和节点类型生成方法，
不会自己再定义一套插件协议。这样 Web、Server 和构建工具理解的是同一份规则。

## 3. 输入和输出分别是什么

### 3.1 输入：一个插件 package

CLI 的输入不是某一个零散文件，而是一个完整的 npm package。这个 package 至少需要：

- 合法的 `package.json#name` 和完整 SemVer `version`；
- `package.json#exports["."]` 指向插件根入口；
- 根入口默认导出一份符合 `PluginConfig` 的配置；
- 配置里引用的 icon、UI 和 Executor 文件真实存在于当前 package 内。

示意配置如下：

```json
{
  "name": "@acme/http-plugin",
  "version": "1.0.0",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```ts
import { defineConfig } from '@ai-workflow/plugin'

export default defineConfig({
  displayName: 'HTTP Plugin',
  // 节点、配置、UI、执行器等声明
})
```

### 3.2 输出：平台可消费的标准产物

执行 `build` 后，默认在目标插件 package 的 `dist/` 中得到：

```text
dist/
├── plugin.manifest.json       插件的标准说明书
├── integrity.json             文件大小和 SHA-256 摘要
├── assets/                    图标等静态资源
├── web/                       存在自定义 UI 时生成
│   ├── remoteEntry.js
│   └── remote-manifest.json
└── executor/                  存在 sandbox-js 节点时生成
    └── <node-key>.mjs
```

执行 `pack` 后，还会在输出目录中生成：

```text
<package-name>-<version>.tgz
```

没有自定义 UI 就不会创建 `web/`；没有 `sandbox-js` 节点就不会创建 `executor/`。

## 4. `init` 负责起步，另外四条命令复用构建主线

CLI 对外提供五条命令：

```text
ai-workflow-plugin init <directory> [--template <basic|custom-ui|executor>] [--local] [--install]
ai-workflow-plugin check [--cwd <directory>]
ai-workflow-plugin build [--cwd <directory>] [--out-dir <directory>]
ai-workflow-plugin pack  [--cwd <directory>] [--out-dir <directory>]
ai-workflow-plugin dev   [--cwd <directory>] [--out-dir <directory>]
```

`init` 是脚手架入口，负责从模板创建一个新的插件 package。其余四条命令作用于已经存在的插件，并且
逐层增加构建能力：

```text
init：生成一个新的插件项目

check：只检查，不生成正式产物
  ↑
build：先 check，再生成完整产物
  ↑
pack：先 build，再把产物压成 tgz

dev：先 build，再启动文件监听和本地 HTTP 服务；文件变化后继续 build
```

也就是说，`build` 不会绕过 `check`，`pack` 也不会拿旧目录随便压缩。所有命令复用同一条检查和构建
主线，因此不会出现“check 说能用，但 build 使用了另一套规则”的情况。

### `init`：回答“怎样快速创建一个符合契约的插件项目”

最简单的用法是：

```bash
ai-workflow-plugin init my-plugin
```

它默认生成 `basic` 模板，也可以通过 `--template custom-ui` 或 `--template executor` 生成带 React
content 或 `sandbox-js` Executor 的项目。生成内容直接使用现有 `defineConfig`、`defineNode`、
`pluginSchema`、`field` 和 `defineExecutor`，不会另造一套示例 API。

脚手架会校验 npm package 名，拒绝覆盖非空目录，并先写入同级 staging 再发布目标目录。CLI 不接收
平台插件 UUID 或 publisher；这些身份由服务端在上传时绑定。默认只生成文件，只有明确传入
`--install` 才执行 `pnpm install`。

仓库根的 `pnpm plugin:init` 会自动启用 `--local`，按照插件目标目录计算 SDK 与 CLI 的 `link:` 相对
路径，适用于两个包尚未发布时的本地开发。公开 CLI 不传 `--local` 时保留 registry 版本范围，供未来
正式发布后在仓库外创建插件。

### `check`：回答“这个插件写得对不对”

它会完成三件事：

```text
findPluginPackage()
  -> loadPluginConfig()
  -> validatePluginSourceReferences()
```

分别对应：找到插件、加载配置、检查配置里引用的文件和导出。它不会创建正式 `dist/`。

### `build`：回答“怎样把源码变成正式产物”

`build` 先执行完整 `check`，再生成 Manifest、静态资源、Web Remote、Executor 和完整性文件。

### `pack`：回答“怎样得到可分发的压缩包”

`pack` 先重新执行 `build`，再按稳定顺序收集产物，生成 `.tgz`，最后计算整个压缩包的 SHA-256。

### `dev`：回答“插件开发时怎样快速看到最新产物”

`dev` 首次构建成功后启动本地 HTTP 服务，同时监听插件目录。源码变化时自动重建；如果某次重建失败，
服务仍保留上一次成功的产物，不会让开发环境立刻不可用。

## 5. 最核心的 build 流程

面试时最值得讲的是 `build`，因为 check、pack 和 dev 的核心关系都围绕它展开。

```text
1. 找到 package
2. 加载并校验 Config
3. 检查源码引用
4. 生成构建计划
5. 在 staging 中构建 Artifact
6. 计算摘要并生成 Manifest
7. 写入 integrity.json
8. 原子替换正式输出目录
```

下面按这条主线解释每一步。

### 5.1 找到插件 package

CLI 从 `--cwd` 或当前目录开始，逐级向上寻找最近的 `package.json`。找到以后会检查：

- package 名称是否符合小写 npm 命名格式；
- `version` 是否是完整的 SemVer，例如 `1.0.0`；
- 根 `exports` 能否唯一解析到一个入口文件；
- 入口是否真实存在，并且没有跑到 package 目录之外。

根入口既支持简单字符串，也支持条件对象：

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

CLI 按 `source -> import -> default` 的顺序选择第一个可用字符串。数组、通配根导出、绝对路径、
`..` 越界以及符号链接逃逸都会被拒绝。

### 5.2 加载插件 Config

插件入口通常是 TypeScript/TSX，Node.js 不能直接稳定加载，所以 CLI 会：

```text
根入口源码
  -> esbuild 临时编译成 Node ESM
  -> 动态 import()
  -> 读取 default export
  -> pluginConfigSchema 校验
  -> 清理临时目录
```

临时文件放在系统临时目录中，不会污染插件 package；无论成功还是失败，都会在 `finally` 中清理。

`defineConfig()` 本身只是帮助开发者获得类型提示，真正的运行时校验发生在这里。这样即使输入来自普通
JavaScript，CLI 也不能只相信 TypeScript 类型。

需要明确一个安全边界：`import()` 会执行入口模块的顶层代码。因此这个 CLI 适合开发者主动构建自己
信任的本地源码，不是用来直接运行 Marketplace 陌生代码的安全沙箱。

### 5.3 检查源码引用

Schema 能检查数据结构，但它不知道某个文件是否真的存在，也不知道模块里有没有指定导出。因此 CLI
还会补一层与文件系统、编译器有关的检查：

- `hostVersionRange` 是不是合法的 SemVer range；
- icon 文件是否存在；
- content、节点 renderer、配置 renderer 是否存在声明的 export；
- `sandbox-js` Executor 是否存在 `default export`；
- 所有路径是否仍在当前插件 package 内。

检查 UI 和 Executor 导出时，CLI 使用 esbuild 的内存构建结果读取 export，不直接运行这些模块。
这点很重要：配置入口需要加载才能取得配置对象，但 Executor 在 CLI 中始终只检查、只编译，不执行。

### 5.4 生成构建计划

通过检查后，CLI 不会一边遍历配置一边随意写文件，而是先生成 `PluginBuildPlan`。计划中主要包括：

- 最终 Manifest 的数据草稿；
- 哪些 icon 要复制到 `assets/`；
- 哪些 UI 模块要进入 Web Remote；
- 哪些 Executor 要构建为 Node ESM。

例如，源码中“某节点的 Executor 在 `./src/executor.ts`”，到构建计划里会变成稳定的产物地址：

```text
executor/<node-key>.mjs
```

节点 type 也不是插件作者随意填写，而是统一通过以下规则生成：

```text
plugin:<package-name>/<node-key>
```

例如 package 名为 `@acme/http-plugin` 时，节点类型为
`plugin:@acme/http-plugin/<node-key>`。package 名用于产物定位，不能替代平台 UUID 或上传作者。

先做计划的好处是把“配置怎样映射成产物”和“怎样操作文件系统”拆开，转换规则更容易检查，构建器也
不需要理解完整的插件领域模型。

### 5.5 构建三类 Artifact

CLI 按计划处理三类文件：

1. **静态资源**：把 icon 等文件复制到稳定的 `assets/` 路径；
2. **Web Remote**：把 content、节点 renderer 和配置 renderer 聚合成浏览器 ESM；
3. **Executor**：把每个 `sandbox-js` 入口分别构建成 Node.js 22 ESM。

Web Remote 会导出稳定的模块名，并额外提供一个统一的 `pluginWebModule`。React、React DOM 和
`@ai-workflow/plugin` 不重复打进 Remote，而是保留为 external，由宿主提供共享实例。这样可以避免
插件和宿主各自携带一份 React，造成上下文或 Hook 运行问题。

Executor 只会被构建成文件，CLI 不会 `import` 或调用它。真正执行第三方 Executor，必须交给后续独立
的强沙箱。

### 5.6 计算完整性摘要

构建完成后，CLI 会递归收集 Artifact，统一路径分隔符，按路径排序，并为每个文件记录：

```ts
{
  path: 'web/remoteEntry.js',
  size: 1234,
  sha256: '...'
}
```

然后再把每个文件的路径、大小和摘要拼成稳定内容，计算一个聚合 SHA-256。这个聚合值写入
`plugin.manifest.json` 的 `integrity.digest`。

Manifest 完成后会再用 `pluginManifestSchema` 校验一次。也就是说：

- Config Schema 检查“开发者写的输入是否合法”；
- Manifest Schema 检查“CLI 转换出的结果是否合法”。

最后的 `integrity.json` 会列出 Manifest 和全部 Artifact 的逐文件摘要。`integrity.json` 不把自己
算进去，否则会形成“文件内容包含自己的摘要，而摘要又会改变文件内容”的循环。

### 5.7 原子替换输出目录

构建不会直接在正式 `dist/` 中边生成边覆盖，而是先写到同级 staging 目录：

```text
正式 dist 保持不动
  -> 在 .dist-stage-* 中完成全部构建和校验
  -> 旧 dist 临时改名为 backup
  -> staging 改名为 dist
  -> 成功后删除 backup
```

如果替换失败，CLI 会尝试恢复旧目录；如果前面的构建失败，则直接删除 staging。

这解决了一个实际问题：构建过程可能在中途报错，如果直接写正式目录，使用方可能读到一半新、一半旧
的残缺产物。staging 加 rename 能保证正式目录只暴露“上一次成功版本”或“这一次完整版本”。

## 6. `pack` 为什么强调“可复现”

同一份源码在不同时间或机器上构建，如果只是普通压缩，文件顺序、tar 时间、用户 ID 和 gzip 头都可能
不同，最终摘要也会变化。这会让缓存、发布校验和供应链审计变得不可靠。

当前 `pack` 做了这些稳定化处理：

- 每次先执行完整 `build`，不依赖未知状态的旧产物；
- 文件按产物路径排序；
- 不把已存在的 `.tgz` 再打进自己；
- tar 使用固定权限、uid、gid 和时间字段；
- gzip 使用固定压缩级别，并统一 OS 字段；
- 最后对整个压缩包计算 SHA-256。

因此它的目标是：相同输入应该得到相同产物和摘要。面试中可以把这概括为**确定性构建**或
**可复现构建**。

## 7. `dev` 怎样兼顾速度和稳定性

`dev` 不是另一套构建器，它只是给 `build` 加上开发期能力：

```text
首次完整 build
  -> 启动 HTTP 服务
  -> 监听插件 package
  -> 文件变化
  -> debounce 合并连续事件
  -> 再次 build
```

几个关键细节：

- 首次构建失败就不启动服务，避免提供一个不存在的插件；
- 默认监听 `127.0.0.1:4174`；
- `/` 返回 `plugin.manifest.json`；
- `/__ai_workflow_plugin/status` 返回 `ready`、`building` 或 `failed`；
- 忽略 `node_modules`、`.git`、输出目录以及 staging/backup，避免自己构建触发自己；
- 连续变化使用 120ms debounce 合并；
- 构建期间再次变化，只追加一次最新重建，不并发覆盖输出目录；
- 重建失败时保留最后一次成功产物；
- HTTP 请求路径必须留在输出目录内，避免通过 `..` 读取任意文件；
- 收到 `SIGINT` 或 `SIGTERM` 时关闭 watcher 和 HTTP server。

面试时可以将这里的设计概括为：**开发体验可以快，但不能牺牲产物一致性**。

## 8. 代码为什么这样分层

源码没有把所有逻辑堆进一个 CLI 文件，而是按变化原因拆分：

```text
src/
├── cli.ts                         解析参数、分发命令、处理输出和退出码
├── index.ts                       对外提供可复用的 Node API
├── commands/                      编排 init、check、build、pack、dev 用例
├── templates/                     basic、custom-ui、executor 和公共模板文件
├── config/                        临时编译并加载插件 Config
├── package/                       package 发现、exports 和路径安全
├── validation/                    文件、模块导出和版本范围检查
├── pipeline/                      Manifest、Artifact 和完整性构建
└── shared/                        公共类型和统一错误
```

依赖方向是：

```text
cli -> commands/init -> templates/package/shared
cli -> 其他 commands -> pipeline/config/package/validation -> shared
```

理解这套分层时，不必死记文件名，只要记住三层：

1. **交互层**：把命令行参数变成函数参数，再把结果或错误展示给用户；
2. **用例层**：决定一次 init/check/build/pack/dev 要按什么顺序做事；
3. **基础能力层**：分别处理模板、package、配置加载、校验、构建、摘要和错误。

这样拆分有三个好处：

- CLI 交互和业务逻辑解耦，将来平台构建服务可以直接调用 `buildPlugin()`；
- 四条构建命令能复用同一批能力，三个 init 模板也能复用公共项目文件；
- 路径、Manifest、Artifact、摘要等规则可以独立修改，不会让一个巨型文件承担所有职责。

## 9. 两种入口，以及两个容易混淆的 `dist`

### 9.1 两种入口

终端入口的调用链是：

```text
package.json#bin
  -> bin/ai-workflow-plugin.mjs
  -> workflow-plugin-cli/dist/cli.js
  -> runPluginCli()
  -> initPlugin()/checkPlugin()/buildPlugin()/packPlugin()/devPlugin()
```

代码也可以直接使用编程 API：

```ts
import { buildPlugin, checkPlugin, initPlugin } from '@ai-workflow/plugin-cli'
```

`src/index.ts` 只导出函数、错误和类型，不会自动读取 `process.argv`。因此“终端怎么交互”和“构建能力
怎么实现”是分开的。

当前 `package.json#exports["."]` 仍指向 `src/index.ts`，适合 workspace 内部的 TypeScript 工具链。
如果未来正式发布 npm 包，需要为编程 API 生成 JavaScript 和类型声明，并将 exports 切换到发布产物。

### 9.2 两个 `dist`

项目里会看到两个叫 `dist` 的目录，但含义完全不同：

- `packages/workflow-plugin-cli/dist/cli.js`：CLI 自己的可执行构建产物；
- `目标插件/dist/`：CLI 为某个插件生成的 Manifest 和 Artifact。

前者是“工具本身”，后者是“工具加工出来的产品”。

## 10. 错误为什么要统一包装

构建过程中可能出现参数错误、JSON 错误、Schema 错误、文件不存在、路径越界、esbuild 失败等多种异常。
如果直接把底层错误全部抛给用户，输出会不稳定，也很难定位插件配置中的具体位置。

所以 CLI 使用统一的 `PluginCliError`：

```ts
new PluginCliError('插件默认导出未通过 PluginConfig 校验', {
  code: 'INVALID_PLUGIN_CONFIG',
  details: ['nodes.0.config.initial.timeout: ...'],
  cause: originalError,
})
```

命令行层只负责统一格式化为：

```text
[INVALID_PLUGIN_CONFIG] 插件默认导出未通过 PluginConfig 校验
  nodes.0.config.initial.timeout: ...
```

这样既能给用户稳定、可读的错误码，又保留 Zod 的准确字段路径和底层 cause，方便继续排查。

## 11. 这个 CLI 明确不做什么

讲清边界比堆功能更能体现架构理解。当前 CLI 不负责：

- 向平台安装、启用、升级或发布插件；
- 把插件版本和状态持久化到 Server；
- 在 Web 中注册或运行远程 UI；
- 执行第三方 Executor；
- 充当 Marketplace 的安全沙箱；
- 生成或接收平台插件 UUID、publisher 身份。

它只负责从源码到标准产物。安装属于 Server/Web 插件运行时，Executor 执行属于独立强沙箱，平台发布
还需要在受控环境中重新构建或校验；服务端发布接口使用当前认证用户作为作者。

## 12. 面试时可以直接这样讲

### 12.1 30 秒版本

> 我们把插件 SDK 和构建工具拆成了两个包。SDK 定义 Config、Manifest、UI 和 Executor 契约，CLI
> 负责执行这些契约。CLI 会从 npm package 的根 exports 找到插件入口，把 TypeScript 临时编译成
> Node ESM，读取默认导出的 Config，再做 Schema、文件路径和模块导出检查。通过后，它会生成
> Manifest、Web Remote、Executor 和完整性摘要，最后用 staging 目录原子替换正式输出。对外提供
> init 脚手架以及 check、build、pack、dev 四条构建命令，四条构建命令复用的是同一条检查和构建
> 流水线。

### 12.2 3 分钟版本

> 这个 CLI 要解决的问题，是插件开发者写的是 TypeScript 配置和源码，但平台需要的是一套结构稳定、
> 可以校验和分发的产物。
>
> 整条链路从 package 开始。CLI 会向上找到最近的 package.json，解析根 exports，检查包名、版本和
> 路径边界。因为入口可能是 TS 或 TSX，所以先用 esbuild 临时编译成 Node ESM，然后动态加载默认
> 导出的 Config，并复用 SDK 的 pluginConfigSchema 做运行时校验。
>
> Schema 只能验证数据结构，所以后面还有一层源码检查，确认图标、UI 和 Executor 文件存在，并确认
> 模块包含声明的 export。Executor 这里只检查和编译，绝不执行。
>
> 检查通过后，CLI 先生成构建计划，把开发期路径转换成稳定的 Artifact 路径和节点 type，再构建
> 静态资源、浏览器 Remote 和 Node Executor。所有内容先写入 staging，成功后计算逐文件和聚合
> SHA-256，生成并再次校验 Manifest，最后原子替换 dist，所以失败不会留下半成品。
>
> 在这个主流程上，check 只做到校验，build 生成产物，pack 再做确定性压缩，dev 则增加监听和本地
> 静态服务。设计上最重要的是复用同一份 SDK 契约、构建结果可复现、输出原子更新，以及明确区分
> “加载可信配置”和“绝不执行第三方 Executor”的安全边界。
>
> 为了降低插件开发门槛，CLI 还提供 init。它从内置的 basic、custom-ui、executor 模板生成完整项目，
> 校验命名并拒绝覆盖非空目录，默认不安装依赖，确保脚手架行为明确可控。

## 13. 面试官常见追问

### 为什么不直接让 Node.js import 插件入口？

因为入口可能是 TypeScript、TSX，也可能引用 workspace 源码，原生 Node.js 不一定能解析。先用 esbuild
临时构建成 Node ESM，可以统一加载方式，并在完成后清理临时文件。

### TypeScript 已经有类型了，为什么还要 Zod？

TypeScript 类型只在编译期存在，运行时拿到的默认导出仍然可能是任意数据。Zod 能在真正构建前校验
数据，并给出准确的字段路径。CLI 还会分别校验输入 Config 和输出 Manifest，保证转换两端都合法。

### 为什么 Schema 校验以后还要检查源码引用？

Schema 只能知道 `entry` 是字符串，不能知道文件是否存在、是否越界、模块是否真的导出了指定成员。
这些必须结合真实文件系统和构建器检查。

### 为什么要先生成 BuildPlan？

BuildPlan 把纯数据转换和文件写入分开。Manifest 映射规则、远程导出名和 Artifact 路径可以先集中确定，
真正的构建器只按计划执行，职责更单一，也便于以后增加新的 Artifact 类型。

### 为什么 React 要 external？

插件 UI 应该复用宿主的 React、React DOM 和 SDK UI 门面。如果每个 Remote 都打包一份 React，可能
出现上下文不共享、Hook 失效和包体重复的问题。

### 为什么构建要用 staging？

直接写正式目录时，中途失败会留下残缺产物；HTTP 服务或其他进程还可能在构建过程中读到不一致状态。
staging 全部成功后再 rename，能让正式目录始终对应一次完整构建。

### 为什么 `integrity.json` 不包含自己的摘要？

因为文件一旦写入自己的摘要，内容就会变化，新的内容又会产生新的摘要，形成循环依赖。所以它只记录
Manifest 和 Artifact。

### CLI 是否安全地运行了第三方代码？

没有。为了取得 Config，CLI 确实会加载入口并执行其顶层代码，所以只适用于可信本地源码；这不是安全
沙箱。Executor 则始终不会在 CLI 中执行。Marketplace 仍需在隔离、受控环境中重新构建或校验。

### `dev` 构建失败为什么还能继续访问？

正式输出通过原子替换更新。失败只会删除本次 staging，不会破坏上一次成功的 `dist`，因此开发服务能
继续提供旧的可用版本，同时通过状态接口暴露失败信息。

### `init` 为什么默认不执行 `pnpm install`？

生成文件是确定、快速且不访问网络的操作；安装依赖可能耗时，也可能触发依赖包的生命周期脚本。因此
CLI 默认只创建项目，只有使用者明确传入 `--install` 才启动无 shell 的 pnpm 子进程。

### 未来要新增一种构建产物，应该改哪里？

先在 `pipeline/manifest.ts` 的 BuildPlan 中描述新的产物映射，再在 `pipeline/artifacts.ts` 中实现构建；
如果需要新的源码检查，就补到 `validation/`。命令层只负责编排，不应该塞入具体转换和文件规则。

## 14. 源码阅读地图

理解完整逻辑后，再按下面顺序看代码会更轻松：

1. `src/commands/init.ts` 和 `src/templates/`：看脚手架怎样校验并生成项目；
2. `src/commands/check.ts`：看最短构建主线；
3. `src/package/package-context.ts`：看 package 和路径是怎样确定的；
4. `src/config/load-config.ts`：看 Config 怎样加载和校验；
5. `src/validation/source-references.ts`：看 Schema 之外还检查什么；
6. `src/commands/build.ts`：看完整构建怎样编排；
7. `src/pipeline/manifest.ts`：看 Config 怎样转换成 BuildPlan 和 Manifest；
8. `src/pipeline/artifacts.ts`：看三类 Artifact 怎样生成；
9. `src/pipeline/integrity.ts`：看摘要怎样稳定计算；
10. `src/commands/pack.ts`：看确定性 tgz 怎样生成；
11. `src/commands/dev.ts`：看监听、排队重建和 HTTP 服务；
12. `src/cli.ts`：最后看参数、输出和退出码；
13. `src/index.ts`：确认哪些能力属于公共编程 API。

修改代码时，可以按下面的职责快速定位：

- 终端参数或帮助信息：`src/cli.ts`；
- 脚手架目录安全和安装流程：`src/commands/init.ts`；
- 插件模板内容：`src/templates/`；
- 某条命令的执行顺序：`src/commands/`；
- 插件入口加载方式：`src/config/`；
- package、exports 或路径安全：`src/package/`；
- 文件和模块导出检查：`src/validation/`；
- Manifest 转换：`src/pipeline/manifest.ts`；
- Web、Executor 或静态资源构建：`src/pipeline/artifacts.ts`；
- 文件摘要：`src/pipeline/integrity.ts`；
- 公共错误和类型：`src/shared/`；
- 新增对外 API：实现放进对应职责模块，再从 `src/index.ts` 导出。

## 15. 最后只记住这条主线

如果一时记不住所有细节，先牢牢记住下面这句话：

```text
找到 package
  -> 加载 Config
  -> 校验结构和源码引用
  -> 生成 BuildPlan
  -> 构建 Artifact
  -> 计算摘要并生成 Manifest
  -> 原子发布 dist
  -> 可选 pack 或 dev
```

这就是 `@ai-workflow/plugin-cli` 的核心构建逻辑；`init` 则负责生成能够进入这条主线的新项目。目录
划分、五条命令、安全检查和工程化设计都围绕这两个目标展开。
