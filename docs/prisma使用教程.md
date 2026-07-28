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
