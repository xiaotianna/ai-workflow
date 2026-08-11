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
  - rabbitmq
- 工程化：
  - monorepo
  - docker
  - turborepo
  - oxlint
  - prettier

## 本地开发基础设施

开发环境的 PostgreSQL、Redis 和 RabbitMQ 由仓库根目录的
`compose.dev.yaml` 统一管理，应用仍直接在本机运行。

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
- RabbitMQ AMQP：`localhost:5672`
- RabbitMQ Management：`http://localhost:15672`
- 数据库名和用户名：`ai_workflow`
- RabbitMQ 用户名：`ai_workflow`，默认开发密码：`ai_workflow_dev`

端口或开发数据库凭据可通过执行 Compose 命令时设置
`POSTGRES_PORT`、`POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD`、
`REDIS_PORT`、`RABBITMQ_PORT`、`RABBITMQ_MANAGEMENT_PORT`、`RABBITMQ_USER`、
`RABBITMQ_PASSWORD` 和 `RABBITMQ_VHOST` 覆盖。开发数据保存在 Docker named volume 中，
执行 `docker:dev:down` 不会删除数据。

## 应用开发

通过 Turborepo 从仓库根目录启动应用：

```bash
# 同时启动 Web 和 Server
pnpm dev

# 只启动 Web
pnpm dev:web

# 只启动 Server
pnpm dev:server
```

启动 Go Executor：

```bash
cd apps/executor-go/cmd/executor/main.go
go run .
```

## Docker Compose 一键部署

默认的 `compose.yaml` 会同时启动以下服务：

- 一个统一应用镜像，由三个容器分别运行 Nginx + Web、NestJS Server 和 Go Executor；
- Web 容器对外只开放 `APP_PORT`，Server 启动前自动执行已提交的 Prisma migration；
- Executor 与 Server 共用应用镜像，镜像内包含 Code 节点需要的 Node.js 22；
- PostgreSQL、Redis、RabbitMQ 和 OpenSearch，数据写入 Docker named volume。

应用进程共用一个构建产物，但仍分别运行在独立容器中，避免进程互相影响。数据库、缓存、消息队列和
搜索服务继续使用独立官方镜像与数据卷，便于持久化、升级和故障恢复。

仓库不要求手动填写密码。首次部署直接执行：

```bash
docker compose up -d
```

`secrets-init` 初始化容器会生成随机的 PostgreSQL、RabbitMQ、OpenSearch、JWT、Executor 内部认证和
模型凭证加密密钥，并保存在只挂载给对应服务的 Docker named volume 中。以后再次执行 Compose 会复用
已有密钥，不会自动轮换。该初始化容器完成后显示为 `Exited (0)` 属于正常状态。

如果需要指定端口、用户名或自行管理密钥，可以再复制可选配置模板；所有密钥留空时仍会自动生成：

```bash
cp .env.example .env
```

首次启动会在本机从源码构建一次统一应用镜像。代码更新后重建并滚动启动：

```bash
docker compose up -d --build
```

Go 依赖默认通过 `https://goproxy.cn,direct` 下载，避免服务器访问 `proxy.golang.org` 超时；如需
使用其他代理，可在可选的 `.env` 中覆盖 `GOPROXY`。

查看状态和日志：

```bash
docker compose ps
docker compose logs -f web server executor
```

默认只监听宿主机的 `127.0.0.1:8080`，避免占用已有 OpenResty/Nginx 的 80 端口。外层 OpenResty
需要把站点请求转发到这个地址，例如：

```nginx
location / {
  proxy_pass http://127.0.0.1:8080;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

修改配置后重载 OpenResty，502 会在上游地址可访问后消失。如果不使用外层网关、需要直接公开应用，
把 `.env` 中的 `APP_PORT` 改为 `8080`，再访问 `http://服务器地址:8080`。数据库、缓存、消息队列、
OpenSearch 和 Server 均不映射宿主机端口；Executor 也通过独立 Docker 网络与数据服务隔离。

停止服务使用 `docker compose down`，不会删除 named volume 中的数据。只有明确需要清空全部业务数据时
才使用 `docker compose down -v`；该命令也会删除自动生成的密钥卷，下次启动会生成一套新密钥。备份或
迁移时必须同时保留业务数据卷和密钥卷，不要单独删除 `*_secrets` volume。

## 后端文档

- [Prisma 入门与基础 CRUD](docs/prisma.md)
