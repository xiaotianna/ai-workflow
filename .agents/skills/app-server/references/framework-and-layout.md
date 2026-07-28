# NestJS 框架与目录规范

## 当前状态

`apps/server` 已初始化，包名为 `@ai-workflow/server`，基于 NestJS 11 脚手架，使用 oxlint 替代 ESLint，与 monorepo 工程化配置对齐。

## 技术方向

- 使用仓库 Node.js 22+ 与 TypeScript 6 基线。
- 首选 NestJS 11（CommonJS + `module: nodenext`），沿用根 `README.md` 的技术方向。
- `tsconfig.json` 显式加载 `node` 与 `jest` 类型，不依赖 TypeScript 自动发现环境类型；显式设置 `rootDir: "./src"` 与 `outDir: "./dist"`，无路径映射时不设置已在 TypeScript 6 弃用的 `baseUrl`。
- Lint 使用 oxlint，继承 `configs/oxc/.oxlintrc.json` 并在 `apps/server/.oxlintrc.json` 补充 Node/NestJS 规则。
- 格式化使用根目录 `configs/prettier` 共享配置。
- 测试默认使用 Jest（NestJS v12 将切换为 Vitest + oxlint 原生模板，届时再评估升级）。
- 使用 PostgreSQL 作为主数据存储，使用 Prisma 作为数据访问层。
- Redis 只用于明确的缓存、幂等、限流、短期锁或事件协调需求。
- 只有工作流编排确实需要时才接入 LangGraph，并隔离在运行时适配层。

## 当前目录

```text
apps/server/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── generated/prisma/
│   └── infrastructure/prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
│   └── app.controller.spec.ts
├── test/
│   └── app.e2e-spec.ts
├── .oxlintrc.json
├── nest-cli.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── tsconfig.build.json
```

后续按需扩展 `common/`、`config/`、`infrastructure/`、`modules/`、`prisma/`，不预先生成空模块。

## 常用命令

在 `apps/server` 目录或通过 `pnpm -F @ai-workflow/server <script>` 执行：

| 命令                      | 说明                   |
| ------------------------- | ---------------------- |
| `start:dev`               | 开发模式启动（watch）  |
| `build`                   | 编译到 `dist/`         |
| `prisma:generate`         | 生成 Prisma Client     |
| `prisma:migrate:dev`      | 创建并执行开发迁移     |
| `prisma:migrate:deploy`   | 执行已有生产迁移       |
| `prisma:studio`           | 打开 Prisma Studio     |
| `lint` / `lint:fix`       | oxlint 检查 / 自动修复 |
| `format` / `format:check` | Prettier 格式化 / 检查 |
| `check`                   | format:check + lint    |
| `test` / `test:e2e`       | 单元测试 / E2E 测试    |

根目录 `pnpm lint` 会递归 lint 整个 monorepo，包括 `apps/server`。

## oxlint 约定

- 继承 monorepo 基础规则：`extends: ["../../configs/oxc/.oxlintrc.json"]`。
- 启用 `node` 插件，`env.node: true`。
- NestJS 装饰器场景关闭 `eslint/new-cap`，允许 `@Module()` 等装饰器空类。
- 关闭 `typescript/parameter-properties`，保留 NestJS 构造函数注入写法。
- 测试文件 override 关闭 `eslint/init-declarations`（`let app` 等 Jest 惯用法）。

## 模块职责

- Controller 负责 HTTP 传输、认证信息和 DTO，不承载业务流程。
- Service 编排用例与事务边界，不直接拼接 HTTP 响应。
- Repository 或基础设施适配器封装 Prisma、Redis 和第三方服务。
- Nest Module 显式声明 imports、providers、controllers 和 exports，只导出其他模块确实需要的 provider。
- 不跨模块深层导入私有文件，通过模块公开 provider 或共享 package 传递契约。
- `common` 只放真正跨模块的基础设施，不作为杂物目录。
