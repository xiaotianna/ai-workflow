# NestJS 框架与目录规范

## 当前状态

`apps/server` 当前为空。以下内容是首次实现时的默认方向，不是已经存在的代码事实。

## 技术方向

- 使用仓库 Node.js 22+ 与 TypeScript 基线。
- 首选 NestJS，沿用根 `README.md` 的技术方向。
- 使用 PostgreSQL 作为主数据存储，使用 Prisma 作为数据访问层。
- Redis 只用于明确的缓存、幂等、限流、短期锁或事件协调需求。
- 只有工作流编排确实需要时才接入 LangGraph，并隔离在运行时适配层。
- 初始化时明确 ESM 或 CommonJS 策略，让 `package.json`、TypeScript 与 Nest 配置保持一致。

## 建议目录

```text
apps/server/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   ├── config/
│   ├── infrastructure/
│   └── modules/
│       └── <domain>/
│           ├── <domain>.module.ts
│           ├── <domain>.controller.ts
│           ├── <domain>.service.ts
│           ├── dto/
│           └── repositories/
├── prisma/
└── package.json
```

只创建当前任务需要的目录，不预先生成空模块。

## 模块职责

- Controller 负责 HTTP 传输、认证信息和 DTO，不承载业务流程。
- Service 编排用例与事务边界，不直接拼接 HTTP 响应。
- Repository 或基础设施适配器封装 Prisma、Redis 和第三方服务。
- Nest Module 显式声明 imports、providers、controllers 和 exports，只导出其他模块确实需要的 provider。
- 不跨模块深层导入私有文件，通过模块公开 provider 或共享 package 传递契约。
- `common` 只放真正跨模块的基础设施，不作为杂物目录。
