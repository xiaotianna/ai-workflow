# AI Workflow

技术栈

- 前端：
  - react19
  - ts
  - tailwind
  - shadcn
- 后端：
  - nestjs
  - postgresql
  - prisma
  - redis
  - langgraph
- 工程化：
  - monorepo
  - docker
  - turborepo
  - oxlint
  - prettier

## 本地开发基础设施

开发环境的 PostgreSQL 和 Redis 由仓库根目录的
`compose.dev.yaml` 统一管理，应用仍直接在本机运行。

首次使用时复制服务端环境变量示例：

```bash
cp apps/server/.env.example apps/server/.env
```

启动基础设施：

```bash
pnpm docker:dev:up
```

常用命令：

```bash
pnpm docker:dev:status
pnpm docker:dev:logs
pnpm docker:dev:down
```

默认连接信息：

- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`
- 数据库名和用户名：`ai_workflow`

端口或开发数据库凭据可通过执行 Compose 命令时设置
`POSTGRES_PORT`、`POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`
和 `REDIS_PORT` 覆盖。开发数据保存在 Docker named volume 中，
执行 `docker:dev:down` 不会删除数据。

## 后端文档

- [Prisma 入门与基础 CRUD](docs/prisma.md)
