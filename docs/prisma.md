# Prisma 入门

项目使用 Prisma 7 + PostgreSQL。配置和模型在
`apps/server/prisma`，NestJS 通过 `PrismaService` 访问数据库。

## 1. 首次使用

准备环境变量并启动 PostgreSQL：

```bash
cp apps/server/.env.example apps/server/.env
pnpm docker:dev:up
```

创建数据库表并生成 Prisma Client：

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev --name init
pnpm --filter @ai-workflow/server prisma:generate
```

常用命令：

```bash
# 修改 schema 后创建开发迁移
pnpm --filter @ai-workflow/server run prisma:migrate:dev --name change_name

# 只重新生成类型安全的 Client
pnpm --filter @ai-workflow/server prisma:generate

# 打开数据库可视化管理界面
pnpm --filter @ai-workflow/server prisma:studio

# 生产环境执行已有迁移
pnpm --filter @ai-workflow/server prisma:migrate:deploy
```

## 2. 修改数据模型

编辑 `apps/server/prisma/schema.prisma`。当前示例模型：

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

字段变化后执行：

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev --name describe_change
pnpm --filter @ai-workflow/server prisma:generate
```

不要手改迁移已经执行过的 SQL，也不要修改 `src/generated/prisma`。

## 3. 在 NestJS 中使用

业务模块导入 `PrismaModule`：

```ts
import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infrastructure/prisma/prisma.module'
import { UsersService } from './users.service'

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
})
export class UsersModule {}
```

在 Service 或 Repository 中注入 `PrismaService`，不要在 Controller
里直接操作数据库。

## 4. 基础 CRUD

```ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { email: string; name?: string }) {
    return this.prisma.user.create({ data })
  }

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  update(id: string, data: { email?: string; name?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
    })
  }

  remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    })
  }
}
```

常见查询：

```ts
// 条件查询、分页、只返回指定字段
const users = await this.prisma.user.findMany({
  where: {
    email: { contains: '@example.com', mode: 'insensitive' },
  },
  skip: 0,
  take: 20,
  select: {
    id: true,
    email: true,
    name: true,
  },
})

// 存在则更新，不存在则创建
const user = await this.prisma.user.upsert({
  where: { email: 'alice@example.com' },
  update: { name: 'Alice' },
  create: { email: 'alice@example.com', name: 'Alice' },
})
```

`findUnique` 查不到时返回 `null`；`update` 和 `delete` 查不到记录时会抛
Prisma 异常，业务 Service 应把它转换成对应的 NestJS HTTP 异常。
