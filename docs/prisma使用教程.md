# Prisma 数据库入门

项目使用 Prisma 7 + PostgreSQL。以下命令都在仓库根目录执行。

## 1. 先理解三个东西

| 内容                                            | 可以理解成                        | 是否包含业务数据 |
| ----------------------------------------------- | --------------------------------- | ---------------- |
| `apps/server/prisma/schema.prisma`              | 数据库表结构的设计图              | 否               |
| `apps/server/prisma/migrations/*/migration.sql` | 修改数据库表结构的 SQL 操作记录   | 默认不包含       |
| `apps/server/src/generated/prisma`              | TypeScript 操作数据库的代码和类型 | 否               |

例如，在 `schema.prisma` 中新增一个 `User`：

```prisma
model User {
  id    String @id @default(uuid())
  email String @unique
}
```

Prisma 会生成类似的 SQL：

```sql
CREATE TABLE "users" (...);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

生成的 SQL 保存在 migration 目录中。开发数据库和生产数据库分别执行同一份 SQL，
得到相同的表结构。

## 2. 与原生 SQL 操作对比

| 目标                     | 原生操作数据库                           | 使用 Prisma                                       |
| ------------------------ | ---------------------------------------- | ------------------------------------------------- |
| 第一次创建表结构         | 手写并执行 `CREATE TABLE`                | 修改 schema，运行 `migrate:dev --name init`       |
| 后续修改表结构           | 手写并执行 `ALTER TABLE`、`CREATE INDEX` | 修改 schema，运行 `migrate:dev --name <变更名称>` |
| 执行别人提交的 SQL       | 按顺序执行尚未运行的 `.sql` 文件         | 运行不带 `--name` 的 `migrate:dev`                |
| 更新生产数据库           | 在生产数据库按顺序执行审核过的 SQL       | 运行 `migrate:deploy`                             |
| 在 TypeScript 查询数据库 | 使用 `pg` 并自己维护参数和返回类型       | 运行 `prisma:generate`，使用生成的 Prisma Client  |
| 查看和编辑数据           | 使用 `psql` 或数据库管理软件             | 运行 `prisma:studio`                              |

Prisma 没有把数据库整体搬到其他地方。它只是帮助生成、保存并执行数据库结构变化的
SQL。

## 3. migration 包含数据吗

默认不包含本地数据库中的用户、工作流等业务数据，也不会把开发数据复制到生产数据库。

migration SQL 会在目标数据库已有数据上执行，因此仍可能影响数据：

- `ADD COLUMN`：增加字段，原数据通常保留。
- `DROP COLUMN`：删除字段，该字段的数据会丢失。
- `DROP TABLE`：删除表，表中数据会丢失。
- `UPDATE`、`INSERT`：只有 migration 中明确写了这些 SQL，才会转换或新增数据。

涉及字段重命名、类型转换或旧数据处理时，先只生成 migration，不立即执行：

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev -- --create-only --name migrate_user_data
```

检查并补充生成的 `migration.sql`，确认不会误删数据后再执行：

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev
```

## 4. 常用命令

### 4.1 创建第一条迁移

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev --name init
```

- 生成第一份 migration SQL。
- 立即应用到本地开发数据库。
- 只用于没有任何 migration 的全新项目。

这个`init`也不是固定的，任何名称都可以，会生成`migrations/xxxxx_init/migration.sql`

### 4.2 schema 变化后创建后续迁移

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev --name add_user_status
```

- 根据 schema 的变化生成增量 SQL。
- 立即应用到本地开发数据库。
- 新增或修改表、字段、关系、索引后执行。
- 名称要描述变化，例如 `add_user_status`，不要继续使用 `init`，只是为了语义化。

### 4.3 执行尚未应用的 migration

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev
```

- 检查本地数据库的 `_prisma_migrations` 表。
- 只执行本地数据库还没有执行过的 migration。
- 首次拉取项目或拉取了其他成员的新 migration 后执行。
- 不会复制其他数据库的数据。

### 4.4 生成 Prisma Client

```bash
pnpm --filter @ai-workflow/server prisma:generate
```

- 生成 `src/generated/prisma` 中的 TypeScript 代码和类型。
- 不生成 migration，不修改数据库。
- 首次拉取项目或 schema、generator 配置变化后执行。
- Prisma 7 的 `migrate dev` 不会自动执行该命令。

### 4.5 打开 Prisma Studio

```bash
pnpm --filter @ai-workflow/server prisma:studio
```

打开数据库管理页面。查看不会修改数据，但在页面中新增、编辑或删除记录会直接修改
当前连接的数据库。

### 4.6 在测试或生产环境执行 migration

```bash
pnpm --filter @ai-workflow/server prisma:migrate:deploy
```

- 只执行仓库中已有且尚未执行的 migration。
- 不根据 schema 创建新 migration。
- 不生成 Prisma Client。
- 测试、预发布和生产环境使用，不在这些环境运行 `migrate:dev`。

## 5. 日常怎么用

### 第一次拉取当前项目

```bash
cp apps/server/.env.example apps/server/.env
pnpm docker:dev:up
pnpm --filter @ai-workflow/server run prisma:migrate:dev
pnpm --filter @ai-workflow/server prisma:generate
```

### 修改了 schema

```bash
pnpm --filter @ai-workflow/server run prisma:migrate:dev --name describe_change
pnpm --filter @ai-workflow/server prisma:generate
```

检查生成的 SQL，然后提交 `schema.prisma` 和 migration 目录。

### 部署到测试或生产环境

```bash
pnpm --filter @ai-workflow/server prisma:migrate:deploy
pnpm --filter @ai-workflow/server prisma:generate
```

部署的是 migration SQL 和应用代码，不是开发数据库中的业务数据。

## 6. 不要做

- 不要修改已经执行过的 migration SQL。
- 不要手动修改 `src/generated/prisma`。
- 不要在生产环境运行 `prisma:migrate:dev`。
- 执行可能删除字段或表的 migration 前，先检查 SQL 并备份重要数据。

## 7. `schema.prisma` 如何定义

`schema.prisma` 主要由 `generator`、`datasource`、`enum` 和 `model` 四类定义组成。
当前项目中的基础结构如下：

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

### 7.1 `generator`：定义如何生成 Prisma Client

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```

| 配置           | 作用                                                  |
| -------------- | ----------------------------------------------------- |
| `provider`     | 指定 Client 生成器，当前项目使用 `prisma-client`      |
| `output`       | 指定生成目录，路径相对于 `schema.prisma`              |
| `moduleFormat` | 指定生成代码的模块格式，当前 NestJS 项目使用 CommonJS |

修改 `generator` 后需要重新运行 `prisma:generate`。生成目录中的文件由 Prisma 管理，
不要手动编辑。

### 7.2 `datasource`：定义数据库类型

```prisma
datasource db {
  provider = "postgresql"
}
```

`provider` 表示数据库类型，当前项目使用 PostgreSQL。项目使用 Prisma 7，数据库连接地址
不写在 `schema.prisma` 中，而是在 `apps/server/prisma.config.ts` 中读取：

```ts
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

因此不要照搬旧教程，在 `datasource db` 中增加 `url = env("DATABASE_URL")`。

### 7.3 `model`：定义数据库表

一个 `model` 通常对应一张数据库表，基本语法为：

```prisma
model 模型名 {
  字段名 字段类型 字段属性

  块级属性
}
```

例如当前项目的 `User`：

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  phone     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

它表示：

| 定义                                 | 含义                                             |
| ------------------------------------ | ------------------------------------------------ |
| `model User`                         | Prisma Client 中的模型名是 `User`                |
| `id String`                          | `id` 是必填字符串                                |
| `@id`                                | `id` 是主键                                      |
| `@default(uuid())`                   | 新增记录时默认生成 UUID                          |
| `@db.Uuid`                           | PostgreSQL 中使用原生 `uuid` 类型                |
| `phone String @unique`               | `phone` 必填且不能重复                           |
| `name String?`                       | `name` 可以为 `NULL`                             |
| `createdAt DateTime @default(now())` | 创建时默认写入当前时间                           |
| `updatedAt DateTime @updatedAt`      | Prisma 更新记录时自动更新时间                    |
| `@@map("users")`                     | 数据库表名为 `users`，Prisma 模型名仍然是 `User` |

推荐模型名使用单数大驼峰，例如 `WorkflowVersion`；字段名使用小驼峰，例如
`createdAt`。数据库表名可以使用 `@@map` 映射为复数蛇形命名。

### 7.4 常用字段类型

| Prisma 类型 | 常见用途                     | PostgreSQL 中的常见类型   |
| ----------- | ---------------------------- | ------------------------- |
| `String`    | 名称、手机号、UUID、普通文本 | `text`、`varchar`、`uuid` |
| `Boolean`   | 是否启用、是否删除           | `boolean`                 |
| `Int`       | 整数、排序值                 | `integer`                 |
| `BigInt`    | 超出 `Int` 范围的整数        | `bigint`                  |
| `Float`     | 浮点数                       | `double precision`        |
| `Decimal`   | 金额等需要精确计算的小数     | `decimal`                 |
| `DateTime`  | 创建时间、更新时间、过期时间 | `timestamp`               |
| `Json`      | JSON 结构，例如工作流定义    | `jsonb`                   |
| `Bytes`     | 二进制数据                   | `bytea`                   |

字段类型后面的符号也属于定义的一部分：

```prisma
name      String    // 必填，数据库中不能为 NULL
nickname  String?   // 可选，数据库中可以为 NULL
tags      String[]  // 字符串数组，当前 PostgreSQL 数据源支持
workflows Workflow[] // 关联的多条 Workflow 记录
```

`String?` 表示数据库允许 `NULL`，它与空字符串 `""` 不是一回事。给已有数据的表增加
必填字段时，还要考虑旧数据如何获得该字段的值。

### 7.5 常用字段属性

| 属性                                       | 作用                               |
| ------------------------------------------ | ---------------------------------- |
| `@id`                                      | 将字段设为主键                     |
| `@default(...)`                            | 设置默认值                         |
| `@unique`                                  | 添加唯一约束                       |
| `@updatedAt`                               | 使用 Prisma 更新时自动写入当前时间 |
| `@map("column_name")`                      | 映射到不同的数据库列名             |
| `@relation(...)`                           | 定义模型之间的关系                 |
| `@db.Uuid`、`@db.Text`、`@db.Decimal(...)` | 指定 PostgreSQL 原生类型           |

常用默认值示例：

```prisma
id        String   @id @default(uuid()) @db.Uuid
sequence  Int      @default(0)
enabled   Boolean  @default(true)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### 7.6 枚举 `enum`

值的范围固定时可以定义枚举：

```prisma
enum WorkflowStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Workflow {
  id     String         @id @default(uuid()) @db.Uuid
  name   String
  status WorkflowStatus @default(DRAFT)

  @@map("workflows")
}
```

这样 `status` 只能保存枚举中声明的值，生成的 Prisma Client 也会提供对应的 TypeScript
类型。已经进入生产环境的枚举在删除值或改名之前，需要先处理数据库中的历史数据。

### 7.7 一对多关系

例如一个用户可以创建多个工作流：

```prisma
model User {
  id        String     @id @default(uuid()) @db.Uuid
  phone     String     @unique
  workflows Workflow[]

  @@map("users")
}

model Workflow {
  id      String @id @default(uuid()) @db.Uuid
  name    String
  ownerId String @db.Uuid

  owner User @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@map("workflows")
}
```

这里有两类字段：

- `ownerId` 是真正保存在 `workflows` 表中的外键字段。
- `owner` 和 `workflows` 是 Prisma 的关系字段，用于生成带类型的关联查询，本身不是
  独立的数据库列。
- `fields: [ownerId]` 指定当前模型中的外键字段。
- `references: [id]` 指定外键引用 `User.id`。
- `onDelete: Cascade` 表示删除用户时同时删除其工作流。是否使用级联删除必须根据业务
  决定，不能把它当作所有关系的默认选择。
- `@@index([ownerId])` 为按用户查询工作流添加索引。外键不等于查询索引，需要按查询
  场景明确声明。

如果关系允许为空，外键和关系字段要同时设为可选：

```prisma
ownerId String? @db.Uuid
owner   User?   @relation(fields: [ownerId], references: [id], onDelete: SetNull)
```

### 7.8 一对一和多对多关系

一对一关系需要让外键保持唯一：

```prisma
model User {
  id      String   @id @default(uuid()) @db.Uuid
  profile Profile?
}

model Profile {
  id     String @id @default(uuid()) @db.Uuid
  userId String @unique @db.Uuid
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

简单的多对多关系可以在两侧都使用列表关系：

```prisma
model Workflow {
  id     String @id @default(uuid()) @db.Uuid
  labels Label[]
}

model Label {
  id        String     @id @default(uuid()) @db.Uuid
  workflows Workflow[]
}
```

Prisma 会维护中间表。如果中间关系还需要保存创建时间、排序、创建人等字段，应显式
定义中间模型：

```prisma
model WorkflowLabel {
  workflowId String   @db.Uuid
  labelId    String   @db.Uuid
  createdAt  DateTime @default(now())

  workflow Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  label    Label    @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([workflowId, labelId])
  @@index([labelId])
  @@map("workflow_labels")
}
```

显式中间模型还需要在 `Workflow` 和 `Label` 中分别增加
`workflowLabels WorkflowLabel[]` 反向关系字段。

### 7.9 模型级属性

模型级属性以两个 `@` 开头：

```prisma
model WorkflowVersion {
  workflowId String @db.Uuid
  version    Int
  checksum   String
  definition Json
  createdAt  DateTime @default(now())

  @@id([workflowId, version])
  @@unique([workflowId, checksum])
  @@index([createdAt])
  @@map("workflow_versions")
}
```

| 属性                  | 作用               |
| --------------------- | ------------------ |
| `@@id([a, b])`        | 定义联合主键       |
| `@@unique([a, b])`    | 定义联合唯一约束   |
| `@@index([a, b])`     | 定义普通索引       |
| `@@map("table_name")` | 映射实际数据库表名 |

上例中的 `@@id([workflowId, version])` 已经保证两个字段组合唯一，因此不需要再为相同
字段组合声明 `@@unique`。

索引字段顺序会影响查询是否能有效使用索引。例如 `@@index([workflowId, version])`
适合按 `workflowId` 查询，或同时按 `workflowId`、`version` 查询，但通常不适合只按
`version` 查询。

### 7.10 字段和表名映射

Prisma 代码命名和数据库命名不一致时，可以使用 `@map` 和 `@@map`：

```prisma
model WorkflowVersion {
  id        String   @id @default(uuid()) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  @@map("workflow_versions")
}
```

TypeScript 中仍然使用 `createdAt`，数据库列名是 `created_at`；Prisma Client 中仍然
使用 `WorkflowVersion` 模型，数据库表名是 `workflow_versions`。

### 7.11 注释

使用 `//` 编写普通注释，使用 `///` 为模型或字段添加文档注释：

```prisma
/// 工作流定义
model Workflow {
  /// 全局唯一标识
  id String @id @default(uuid()) @db.Uuid
}
```

注释只用于说明结构，不会创建数据库约束。必须由数据库保证的规则仍要使用主键、外键、
唯一约束或检查过的 migration SQL。

### 7.12 一个较完整的定义示例

```prisma
enum WorkflowStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model User {
  id        String     @id @default(uuid()) @db.Uuid
  phone     String     @unique
  name      String?
  workflows Workflow[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@map("users")
}

model Workflow {
  id          String         @id @default(uuid()) @db.Uuid
  name        String
  description String?        @db.Text
  status      WorkflowStatus @default(DRAFT)
  definition  Json
  ownerId     String         @db.Uuid
  owner       User           @relation(fields: [ownerId], references: [id], onDelete: Restrict)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([ownerId, createdAt])
  @@map("workflows")
}
```

`Json` 只表示数据库可以保存 JSON，不会自动验证工作流的业务结构。工作流定义在写入
数据库前，仍要使用 `@ai-workflow/core` 的 schema 和校验函数进行验证。

定义或修改完成后：

1. 检查字段是否应该允许 `NULL`，是否需要默认值。
2. 检查唯一约束、外键删除行为和常用查询索引。
3. 创建 migration，并检查生成的 SQL。
4. 重新生成 Prisma Client。
