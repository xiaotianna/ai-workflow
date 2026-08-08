# `@ai-workflow/plugin-cli` 实施流程

## 1. 目标与边界

`@ai-workflow/plugin-cli` 是第三方插件的开发期构建工具，负责把插件源码转换为可校验、可复现、
可打包的插件产物。它复用 `@ai-workflow/plugin` 已提供的源码配置和 Manifest 契约，不重新定义
插件领域模型。

CLI 负责：

- 从内置 basic、custom-ui、executor 模板生成新的插件 package；
- 从插件 package 定位并加载根入口的默认导出；
- 使用 `pluginConfigSchema` 检查源码配置；
- 生成并使用 `pluginManifestSchema` 校验 `plugin.manifest.json`；
- 复制静态资源，按需构建 Web Remote 和 Executor ESM；
- 生成文件完整性信息和不可变压缩包；
- 在本地开发期间监听文件并重新执行检查或构建。

CLI 不负责：

- 安装、启用、升级或发布插件版本；
- 在 Web 中注册或运行插件节点和远程 UI；
- 在 Server 中持久化插件、工作流插件锁或 Artifact；
- 执行第三方 Executor 代码；`sandbox-js` 产物只能交给后续独立强沙箱。

## 2. 总体流程

```text
插件 package
  -> 查找 package.json
  -> 解析 exports["."]
  -> 临时编译根入口
  -> import() 默认导出
  -> pluginConfigSchema 校验
  -> 模块引用与 package 元数据检查
  -> 生成 Manifest 数据
  -> 按需构建 Web Remote / Executor ESM
  -> 复制静态资源
  -> 计算 SHA-256 完整性信息
  -> pluginManifestSchema 最终校验
  -> 写入 dist
  -> 可选打包
```

所有写入先进入 package 内的临时输出目录，全部检查成功后再替换目标输出。临时编译文件放入独立
系统临时目录，并在命令结束时清理。路径检查基于解析后的真实路径，禁止绝对路径、`..` 越界和
符号链接逃逸。

## 3. 命令实施顺序

### 3.1 `init`

命令：

```text
ai-workflow-plugin init <directory> [--template <basic|custom-ui|executor>] [--package-name <name>] [--local] [--install]
```

`init` 负责创建一个符合当前 SDK 契约的最小插件项目：

1. 目标目录必须不存在或为空，拒绝覆盖非空目录和写入符号链接；
2. package 名默认使用目标目录名，可通过 `--package-name` 覆盖；
3. CLI 不生成平台插件 UUID，也不接受 publisher；UUID 与上传作者在服务端发布时绑定；
4. basic 生成 Schema 表单与 `execution: none`，custom-ui 增加 React content，executor 增加
   `sandbox-js` 源码；
5. 所有模板文件先写入同级 staging，成功后再 rename 为目标目录；
6. 默认只生成文件；`--install` 明确启用后才使用无 shell 子进程执行 `pnpm install`。
7. `--local` 从当前目录向上定位 SDK 和 CLI workspace package，再根据最终目标目录生成可迁移层级的
   `link:` 相对路径；默认模式保留 registry 版本范围。

安装失败不会删除已经生成的项目。生成后的 package 提供 `plugin:check`、`plugin:build`、
`plugin:pack`、`plugin:dev` 和 `typecheck` scripts。

仓库根目录使用 `pnpm plugin:init <directory>` 作为项目内快捷入口。该脚本每次先构建 CLI，再使用
`--local` 执行 `init`；根 `prepare` 也会在依赖安装完成后构建 CLI。因此既不会运行旧的
`dist/cli.js`，也不会尝试下载尚未发布的 SDK/CLI。`preinstall` 不用于此处，因为首次安装时构建所需
依赖尚未保证可用。

### 3.2 `check`

命令：

```text
ai-workflow-plugin check [--cwd <directory>]
```

处理顺序：

1. 从 `cwd` 向上查找最近的 `package.json`，该目录作为插件 package 根目录；
2. 校验 package 名称和 SemVer `version`；
3. 解析 `package.json#exports["."]`：
   - 字符串值直接使用；
   - 条件对象按 `source`、`import`、`default` 顺序选择；
   - 拒绝数组、通配根导出和无法唯一确定的声明；
4. 确认入口存在且位于 package 根目录内；
5. 使用 bundler 将 TypeScript/TSX 根入口临时编译成 Node ESM；
6. 动态导入临时模块并读取唯一配置入口 `default`；
7. 使用 `pluginConfigSchema` 校验默认导出；
8. 检查 icon、UI renderer、content 和 Executor 的模块引用真实存在；
9. 检查声明的 export、权限、宿主字段和宿主版本范围；
10. 输出稳定、带配置路径的诊断信息，不产生正式构建目录。

验收标志：一个只有静态端口、静态配置、默认表单且 `execution.kind: "none"` 的插件能通过检查；
缺少默认导出、非法初始配置和越界模块路径会明确失败。

### 3.3 `build`

命令：

```text
ai-workflow-plugin build [--cwd <directory>] [--out-dir <directory>]
```

`build` 复用完整 `check` 管线，在校验通过后生成：

```text
dist/
├── plugin.manifest.json
├── integrity.json
├── assets/
├── web/                 # 仅声明自定义 UI 时存在
└── executor/            # 仅声明 sandbox-js 时存在
```

Manifest 转换规则：

- `plugin.packageName` 只来自 `package.json#name`；
- `plugin.displayName` 和可选描述来自 `PluginConfig`；
- `plugin.version` 只来自 `package.json#version`；
- Manifest 不包含平台 UUID 或发布者身份；
- 节点 type 统一生成为 `plugin:<package-name>/<node-key>`；
- `config.schemaVersion/schema/initial/form` 转为
  `configSchemaVersion/configSchema/initialConfig/form`；
- 源码模块引用转换为构建产物中的 `remoteExport` 或 `artifact`；
- 每个节点的初始配置在生成时深拷贝，避免共享引用；
- Manifest 和所有 Artifact 使用稳定路径、稳定排序和稳定 JSON 格式。

第一实现里程碑先完成声明式插件：只生成 Manifest、静态资源和完整性信息。随后在同一命令中按需
加入 Web Remote 与 Executor ESM 构建。

### 3.4 `pack`

命令：

```text
ai-workflow-plugin pack [--cwd <directory>] [--out-dir <directory>]
```

`pack` 必须先执行与 `build` 相同的全量检查和确定性构建，然后：

1. 按稳定路径顺序收集构建文件；
2. 拒绝源码、source map、环境文件、密钥和越界文件；
3. 生成不可变压缩包；
4. 计算压缩包 SHA-256；
5. 输出压缩包路径和摘要。

### 3.5 Web Remote 构建

当任一节点声明 `node.content`、`node.custom: true` 或 `form.custom: true` 时，`build` 和 `dev`
生成 Web Remote。构建器创建虚拟入口，将各节点模块聚合为稳定的 `PluginWebModule`：

```ts
interface PluginWebModule {
  nodes: Readonly<
    Record<
      string,
      {
        content?: PluginNodeContentComponent
        renderer?: PluginNodeRendererComponent
        configRenderer?: PluginConfigRendererComponent
      }
    >
  >
}
```

React、React DOM 和 `@ai-workflow/plugin/ui` 必须作为宿主共享依赖，不能重复打入 Remote。CLI 只
生成 Remote 及 Manifest 引用，不负责由 Web 加载和执行它；Web 侧加载机制见
[远程组件动态加载方案](<./远程组件(远程插件)动态加载方案.md>)。自定义 UI 必须由配置提前声明
`web:execute` 权限。

### 3.6 `dev`

命令：

```text
ai-workflow-plugin dev [--cwd <directory>] [--out-dir <directory>]
```

开发服务负责：

- 首次运行完整检查和开发构建；
- 监听入口、配置引用模块和静态资源；
- 连续变更合并为最新一次待执行任务，并在当前构建结束后重新检查；
- 构建成功后原子更新开发产物；
- 构建失败时保留最后一次成功产物并输出诊断；
- 为 Manifest、静态资源和可选 Web Remote 提供本地 HTTP 地址；
- 暴露健康状态和最新构建状态，但不模拟 Server 安装、权限授予或 Executor 沙箱。

`dev` 不自动打开浏览器，也不修改 Web 应用配置。

## 4. 公共模块划分

CLI 内部按职责拆分：

```text
src/
├── cli.ts                         参数解析、命令分发和退出码
├── index.ts                       可复用 Node API 导出
├── commands/
│   ├── init.ts                    脚手架参数校验、staging 发布和可选依赖安装
│   ├── check.ts                   检查命令编排
│   ├── build.ts                   构建、原子输出编排
│   ├── pack.ts                    确定性压缩包编排
│   └── dev.ts                     监听和本地服务
├── templates/
│   ├── basic/                     声明式基础插件模板
│   ├── custom-ui/                 React content 插件模板
│   ├── executor/                  sandbox-js Executor 插件模板
│   └── shared.ts                  package、tsconfig、README、图标和入口生成
├── pipeline/
│   ├── manifest.ts                源码配置到 Manifest 的纯数据转换
│   ├── artifacts.ts               静态资源、Web、Executor 产物
│   └── integrity.ts               稳定遍历和 SHA-256
├── config/
│   └── load-config.ts             临时编译、动态导入和配置校验
├── package/
│   └── package-context.ts         package 查找、exports 和安全路径
├── validation/
│   └── source-references.ts       模块、导出与宿主版本检查
└── shared/
    ├── diagnostics.ts             稳定错误结构和用户输出
    └── types.ts                   跨流程公共输入输出类型
```

脚手架模板生成、纯数据转换、路径解析、文件写入和命令输出保持分离。`check`、`build`、`pack`、`dev`
共享同一套配置加载与验证入口，不复制规则。依赖方向保持为
`cli -> commands -> pipeline/config/package/validation -> shared`；
基础模块不得反向依赖命令编排层。

CLI 自身构建时必须把 `@ai-workflow/plugin` 及其可打包依赖内联到 Node ESM 产物，不能通过
`--packages=external` 把 workspace SDK 的 TypeScript 源码入口留给 Node.js 原生 ESM 解析。
`esbuild` 作为临时编译插件入口和 Artifact 的运行时工具保持 external，并由 CLI package 直接声明。

## 5. 错误和安全边界

- 参数错误、插件配置错误、构建错误分别使用稳定的非零退出码；
- Zod issue 保留准确路径，例如 `nodes.0.config.initial.timeout`；
- 日志不输出环境变量、源码正文、密钥或完整节点配置；
- 默认不执行依赖安装；使用者明确传入 `init --install` 时才调用 `pnpm install`，其依赖生命周期行为与
  直接执行 pnpm 一致；
- 配置入口只在临时 Node ESM 中加载，CLI 构建环境仍不是安全沙箱，因此只能用于开发者主动构建的
  本地源码；Marketplace 上传后必须由平台重新构建或在隔离环境重新校验；
- Executor 只作为模板源码生成或被打包，不在 `init`、`check`、`build`、`pack` 或 `dev` 中调用；
- 输出目录不得位于 package 根目录之外，默认只允许 package 内的 `dist`。

## 6. 验收顺序

1. `init` 的三套模板能生成完整项目，拒绝覆盖非空目录，默认不安装依赖；
2. `check` 能加载合法默认导出并给出结构化错误；
3. 声明式 `build` 生成可由 `pluginManifestSchema` 重新解析的 Manifest；
4. 相同输入连续构建得到相同 JSON 与 Artifact 摘要；
5. `pack` 只包含白名单产物，并输出稳定摘要；
6. 自定义 content、节点 renderer 和表单 renderer 能生成 Web Remote；
7. `dev` 能监听并提供最后一次成功产物；
8. `sandbox-js` 只生成 Executor ESM，不在宿主进程执行；
9. 包 README、项目架构文档和 `.agents/skills` 同步记录稳定公开行为。

完成上述流程只代表阶段一“SDK、Schema 与构建工具”闭环。Web 插件运行时、Server 插件模型、
Workflow 插件锁、声明式执行适配器和第三方强沙箱仍按后续阶段单独实施。
