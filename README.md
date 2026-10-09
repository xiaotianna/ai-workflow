# AI Workflow

AI Workflow 是一个可视化 AI 工作流平台。你可以在画布上把大模型、知识库、接口请求和代码处理连起来，做成一个能反复使用的流程。调试好之后，再把它发布成 API，让自己的网站、应用或后端服务来调用。

比如做一个客服助手：先判断用户想咨询什么，再分给售前、售后或技术支持；需要查资料时，从知识库找出相关内容，再让模型组织回答。整个过程能在页面里配置，也能看到每一步的输入、输出和报错。

![工作流编辑器与 AI 助手](docs/img/workflow-editor.png)

## 内容导航

- [项目能做什么](#项目能做什么)
- [插件功能](#插件功能)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [如何启动](#如何启动)
- [更多文档](#更多文档)

## 项目能做什么

### 管理自己的工作流应用

工作室是所有工作流的入口。你可以创建应用、修改名称和图标、搜索和排序，也可以把工作流导出成 JSON 文件，或导入已有配置继续编辑。

![工作室](docs/img/studio.png)

### 在画布上搭流程

添加节点、连线、填写配置，就能把一个任务拆成几步来做。上一步的结果可以作为下一步的输入，也可以放进提示词、请求参数或代码里使用。

目前提供这些内置节点：

| 节点        | 用来做什么                                                    |
| ----------- | ------------------------------------------------------------- |
| 开始 / 结束 | 声明流程需要哪些输入，最后返回哪些结果                        |
| 大语言模型  | 调用模型，生成回答、总结内容或判断用户意图                    |
| 知识检索    | 从选定的知识库找出相关文档片段，交给后面的模型使用            |
| HTTP 请求   | 调用其他系统的接口，获取数据或提交处理结果                    |
| 代码        | 写 JavaScript，做数据清洗、格式转换或自定义处理，支持异步代码 |
| 条件分支    | 根据条件走不同路线，比如把问题分给售前或售后                  |
| 循环        | 重复执行内部节点，用循环开始和退出节点控制每轮处理            |
| 子工作流    | 调用另一个已发布的工作流，把常用流程拆出来复用                |

编辑器还支持自动保存、撤销重做、节点复制、自动布局、环境变量、密钥变量和配置检查。支持异常处理的节点可以在出错时停止、返回默认值，或走单独的错误分支。

### 让 AI 帮你搭建和修改

画布右下角可以打开 AI 助手。你可以直接描述需求，例如“帮我做一个按用户意图分流的客服工作流”，也可以让它检查现有流程、分析运行报错。

助手能读取当前画布、查找可用节点、查看模型和知识库等资源、检查运行记录，并生成通过校验的工作流候选。你可以先看结果，再点击“应用到画布”，应用后也能撤销，然后照常测试和发布。

AI 助手使用模型管理页面中启用的对话模型。支持给当前对话添加图片；所选模型也需要支持图片输入。

### 边运行边看结果

可以测试整个草稿，也可以单独测试支持独立运行的业务节点。运行面板会显示最终结果、节点输入输出、耗时和错误，帮助你找到流程在哪一步出了问题。

草稿用于编辑和测试，发布版本用于正式调用。版本历史和运行日志会保留下来，便于查看过去的配置和执行情况。

![工作流测试运行](docs/img/workflow-test-run.png)

### 统一管理模型

在模型页面配置供应商地址、API Key 和模型列表，再在工作流或 AI 助手里选择使用。

- 支持 OpenAI 兼容接口、DeepSeek 和 Ollama。
- 分开管理对话模型和嵌入模型。对话模型负责生成内容，嵌入模型负责把知识库文本转换成可检索的数据。
- 可以启用或停用模型、检查供应商连接、测试模型对话。
- 模型 API Key 在服务端加密保存，工作流通过模型引用调用它。

使用其他提供 OpenAI 兼容接口的模型服务时，可以选择 OpenAI 类型，并填写对应的 Base URL 和 API Key。

### 把自己的资料放进知识库

上传资料后，系统会提取文字、拆成分段，再建立搜索索引。工作流里的知识检索节点可以先找到相关资料，再交给模型回答，适合产品手册问答、内部文档助手和客服知识库。

支持 Markdown、TXT、文本型 PDF、DOCX、PPTX、XLSX、CSV 和 HTML。

![知识库文档管理](docs/img/knowledge-documents.png)

你可以查看文档处理状态，调整分段长度和重叠长度，编辑、新增、删除或停用分段，也可以给文档添加元数据，例如分类和标签。

![知识库分段管理](docs/img/knowledge-chunks.png)

知识库同时使用语义搜索和关键词搜索，再合并结果。你可以设置返回数量、筛选条件和检索方式，并通过“召回测试”查看某个问题能找到哪些片段。

知识库也提供独立的检索 API。在知识库里开启“访问 API”并创建密钥后，其他服务可以调用 `POST /v1/knowledge/retrieve` 获取检索结果。

### 发布成 API，接到自己的系统里

工作流发布后，可以在“访问 API”页面查看接口文档、创建应用 API Key，也可以分享只读的 API 文档给需要接入的人。

![工作流 API 文档](docs/img/app-api.png)

接口支持运行当前发布版本、运行指定历史版本、查询运行结果和查看日志。执行进度通过 SSE 持续返回，也就是一次请求中不断收到新的运行状态。

例如，工作流的开始节点定义了一个 `userInput` 输入，就可以这样调用本地开发服务：

```bash
curl -N --request POST 'http://localhost:3000/v1/workflows/run' \
  --header 'Authorization: Bearer YOUR_APP_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"userInput":"我想了解产品的价格"}'
```

将 `YOUR_APP_API_KEY` 换成该应用创建的密钥，并按开始节点的定义填写 JSON 输入。使用 Docker 部署时，默认接口地址是 `http://localhost:8080/api/v1`；页面会显示当前环境对应的地址。

应用 API Key 只用于它所属的应用；知识库检索使用单独的知识库 API Key。创建后请及时保存完整密钥，后续页面只显示掩码。

## 插件功能

内置节点不够用时，可以用插件增加自己的节点。一个插件可以同时带有多个节点、配置表单、自定义界面和执行逻辑，比如专用的数据处理工具、业务系统连接器或模型节点。

### 在插件市场里安装和管理

![插件 Marketplace](docs/img/plugin-marketplace.png)

插件市场支持搜索名称、描述、包名或发布者，并按“所有集成”“已安装”“已使用”“我发布的插件”查看。

打开插件详情，可以查看介绍、节点能力、版本记录和权限要求，安装后还可以更新、切换指定版本、启用、停用或卸载。安装和切换版本时会显示该版本申请的权限，由你确认。

插件升级后，编辑中的草稿会在下次加载时使用当前启用的安装版本。已经发布的工作流、历史版本和已有运行仍使用各自锁定的插件版本，避免一次更新影响过去的流程。仍被工作流引用的插件会阻止卸载，详情里会显示引用情况。

### 插件可以扩展哪些地方

![插件节点和自定义配置面板](docs/img/plugin-nodes.png)

| 能力           | 你可以做什么                                                              |
| -------------- | ------------------------------------------------------------------------- |
| 节点定义       | 设置节点名称、说明、图标、输入输出端口和固定输出变量                      |
| 配置规则       | 定义字段类型、默认值和校验规则，让配置在编辑和执行时保持一致              |
| 声明式表单     | 组合文本框、选择框、开关、滑块、代码编辑器、键值表、条件规则等现成控件    |
| 宿主字段       | 复用平台的模型选择、知识库选择、子工作流选择、变量选择和异常处理等能力    |
| 自定义内容     | 保留平台的节点外壳，在卡片内部显示自己的 React 内容，例如富文本和指标卡片 |
| 自定义节点     | 自己绘制完整节点外观、交互和端口                                          |
| 自定义配置面板 | 用 React 编写自己的设置界面，修改后同步到节点配置                         |
| 自定义执行     | 编写 JavaScript 执行函数，接收配置和输入，返回节点输出                    |
| 复用平台模型   | 声明 `host-llm` 节点，直接使用平台已有的模型配置和 LLM 执行能力           |

插件有三种执行方式：

- `none`：提供节点定义或展示界面，不包含服务端执行逻辑。
- `sandbox-js`：执行插件自己的 JavaScript，适合自定义处理逻辑。
- `host-llm`：交给平台的 LLM 执行器调用模型，插件无需处理供应商地址和 API Key。

### 开发、打包和发布自己的插件

项目提供两个工具包：`@ai-workflow/plugin` 用来描述插件，`@ai-workflow/plugin-cli` 用来创建、检查、构建和打包插件。

先按后面的本地开发步骤安装项目依赖，再在仓库根目录创建插件：

```bash
# 默认模板：声明式节点和表单
pnpm plugin:init ./examples/my-plugin

# 也可以选择自定义界面或执行逻辑模板
pnpm plugin:init ./examples/my-ui-plugin --template custom-ui
pnpm plugin:init ./examples/my-executor-plugin --template executor
```

以上三个命令按需要选择。仓库内生成的插件会自动连接本地 SDK 和 CLI。

进入刚创建的插件目录：

```bash
cd examples/my-plugin
pnpm install
pnpm plugin:check
```

常用命令：

| 命令                | 用途                                                           |
| ------------------- | -------------------------------------------------------------- |
| `pnpm plugin:check` | 检查插件配置、模块路径和导出是否正确                           |
| `pnpm plugin:dev`   | 监听源码变化并更新开发产物，默认地址为 `http://127.0.0.1:4174` |
| `pnpm plugin:build` | 生成插件描述文件、界面和执行代码等产物                         |
| `pnpm plugin:pack`  | 重新构建并生成可上传的 `.tgz` 压缩包和 SHA-256 摘要            |

执行 `pnpm plugin:pack` 后，在插件市场上传 `dist/` 中的 `.tgz`，选择公开发布或仅自己可见，填写版本说明，再安装使用。服务端会检查压缩包、插件描述和文件摘要，已发布的同一版本不能被覆盖；后续更新需要修改插件的版本号再打包。

仓库里的 [remote-render 示例](examples/remote-render/README.md) 包含富文本卡片、指标面板、全自定义节点、可视化配置面板、模型配置回显和插件 LLM 六个节点，可以直接参考：

```bash
# 从仓库根目录进入示例
cd examples/remote-render
pnpm install
pnpm plugin:check
pnpm plugin:pack
```

“模型配置回显”用于展示配置和执行链路；“插件 LLM”会实际调用选定模型。

插件可以声明运行页面代码、访问公网和读取工作流密钥等权限。目前 `secrets:read` 的密钥代理尚未接通，申请该权限的 `sandbox-js` 节点会被阻止执行。

自定义 React 界面运行在当前页面上下文中，自定义 JavaScript 使用独立的 Node.js 子进程。当前默认执行方式适合自己开发或确认可信的插件，子进程本身不提供强安全隔离。

## 技术栈

| 部分       | 使用的技术                                                         | 在项目里负责什么                                 |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| 前端应用   | React 19、TypeScript 6、Vite 8、React Router 7                     | 页面、路由和业务交互                             |
| 界面与画布 | Tailwind CSS 4、shadcn/ui、Radix UI、React Flow、Motion            | 通用组件、工作流连线、节点展示和动画             |
| 服务端     | NestJS 11、Prisma 7                                                | 登录、模型与知识库管理、工作流保存发布和 API     |
| 数据存储   | PostgreSQL 17、pgvector、Redis 7                                   | 业务数据、知识库向量和登录会话                   |
| 搜索       | OpenSearch 3                                                       | 知识库关键词搜索，与向量搜索配合                 |
| 任务队列   | RabbitMQ 4                                                         | 把节点执行任务交给执行器，并接收结果             |
| 工作流执行 | TypeScript Runtime、Go 1.25.1、Node.js 22.19+                      | 决定下一步执行什么，并运行模型、HTTP、代码等节点 |
| AI 助手    | Pi Agent Core、独立 Node.js Runtime、SSE                           | 对话、工具调用和工作流候选生成                   |
| 插件开发   | TypeScript SDK、CLI、esbuild、React                                | 插件声明、界面扩展和产物打包                     |
| 工程与部署 | pnpm Workspace、Turborepo、Docker Compose、Nginx、Oxlint、Prettier | 管理多个应用和公共包、部署、检查代码与格式       |

整体可以这样理解：浏览器负责编辑和展示，Server 负责管理数据和推进工作流，RabbitMQ 传递任务，Go Executor 负责真正执行业务节点，Agent Runtime 负责 AI 助手的对话和工具调用。

## 目录结构

```text
ai-workflow/
├── apps/
│   ├── web/                   前端页面、工作流编辑器和内置文档
│   ├── server/                NestJS 接口、业务逻辑和 Prisma 数据库迁移
│   ├── executor-go/           Go 节点执行器，以及代码和插件运行环境
│   └── agent-runtime/         AI 助手的模型调用和工具执行
├── packages/
│   ├── ui/                    公共 UI 组件和样式
│   ├── shared/                共享类型、工具和表单能力
│   ├── workflow-core/         工作流结构、节点定义和校验规则
│   ├── workflow-form/         节点配置表单和变量编辑
│   ├── workflow-nodes-ui/     内置节点的画布展示
│   ├── workflow-runtime/      工作流调度、变量解析和运行状态
│   ├── workflow-protocol/     Server 与 Go Executor 的消息协议
│   ├── agent-protocol/        AI 助手的请求、工具和事件协议
│   ├── workflow-plugin/       插件开发 SDK
│   └── workflow-plugin-cli/   插件脚手架、检查、构建和打包工具
├── examples/
│   └── remote-render/         自定义界面和执行节点的完整插件示例
├── configs/                   TypeScript、代码检查和格式化等公共配置
├── scripts/                   开发辅助脚本
├── deploy/                    Nginx 配置、密钥初始化和容器入口
├── docs/                      架构与开发文档，img/ 存放 README 截图
├── compose.dev.yaml           本地开发用的数据库、缓存、队列和搜索服务
├── compose.yaml               完整应用的 Docker 部署配置
├── Dockerfile                 Web、Server、Executor、Agent 共用的应用镜像
├── .env.example               Docker 部署的可选环境变量模板
└── package.json               根目录命令、Node.js 和 pnpm 版本要求
```

## 如何启动

可以按用途选择：想把整套应用跑起来，使用 Docker Compose；需要改代码和实时调试，使用本地开发方式。下面的命令默认都从仓库根目录执行，进入其他目录时会单独标明。

### 方式一：Docker Compose 部署

准备好 Docker 和 Docker Compose，并启动 Docker 服务。

> 当前 `Dockerfile` 的 `workspace-runtime-dependencies` 阶段缺少 `COPY apps/agent-runtime ./apps/agent-runtime`。全新构建时会找不到 Agent Runtime 的依赖目录，需要先在该阶段的 `pnpm install` 之前补上这一行，再执行部署命令。

```bash
docker compose up -d
```

首次启动会从源码构建应用镜像，并启动 Web、Server、Go Executor、Agent Runtime、PostgreSQL、Redis、RabbitMQ 和 OpenSearch。Server 会自动执行数据库迁移。

等服务启动完成后，访问 [http://localhost:8080](http://localhost:8080)。默认端口只绑定本机的 `127.0.0.1:8080`。

首次部署不用手动填写密码，`secrets-init` 会生成数据库密码、内部认证令牌和模型凭证加密密钥，并保存到 Docker 数据卷中。它完成后显示为 `Exited (0)` 是正常状态，后续启动会复用这些密钥。

如需改端口或使用自己的配置，首次启动前复制模板并编辑：

```bash
cp .env.example .env
```

例如，把 `APP_PORT` 改为 `127.0.0.1:9090` 就会使用本机 9090 端口；改为 `8080` 则允许通过 `http://服务器地址:8080` 访问。手动设置密钥时，应在首次初始化之前填写，已有密钥卷不会因为修改 `.env` 自动更新。

常用维护命令：

```bash
# 查看状态
docker compose ps

# 查看应用日志
docker compose logs -f web server executor agent-runtime

# 代码更新后重新构建并启动
docker compose up -d --build

# 停止服务，保留数据
docker compose down
```

数据库、缓存、队列和搜索服务都不直接开放宿主机端口。需要通过域名访问时，可以让现有的 Nginx / OpenResty 转发到应用端口：

```nginx
location / {
  proxy_pass http://127.0.0.1:8080;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_buffering off;
  proxy_read_timeout 3600s;
}
```

业务数据、知识库源文件、插件产物和密钥保存在 Docker 数据卷中。备份和迁移时应一起保留数据卷和密钥卷；`docker compose down -v` 会删除这些卷，仅在明确要清空整个环境时使用。

### 方式二：本地开发

#### 1. 准备工具并安装依赖

- Node.js **22.19.0 或更高版本**。
- pnpm **10.33.2**，与根 `package.json` 中的 `packageManager` 保持一致。
- Go **1.25.1 或更高版本**。
- Docker 和 Docker Compose，用来运行数据库等基础服务。

```bash
corepack enable
pnpm install
```

正常安装依赖时，根目录的 `prepare` 会同时准备插件 CLI。

#### 2. 启动数据库等基础服务

```bash
pnpm docker:dev:up
pnpm docker:dev:status
```

等待服务就绪。默认连接信息如下，仅供本地开发使用：

| 服务              | 地址                     | 默认开发配置                                                         |
| ----------------- | ------------------------ | -------------------------------------------------------------------- |
| PostgreSQL        | `127.0.0.1:5432`         | 数据库和用户名为 `ai_workflow`，密码为 `ai_workflow_dev`             |
| Redis             | `127.0.0.1:6379`         | 无密码                                                               |
| RabbitMQ          | `127.0.0.1:5672`         | 用户名 `ai_workflow`，密码 `ai_workflow_dev`，vhost 为 `ai_workflow` |
| RabbitMQ 管理页面 | `http://127.0.0.1:15672` | 使用同一组 RabbitMQ 用户名和密码                                     |
| OpenSearch        | `http://127.0.0.1:9200`  | 开发编排关闭安全插件，无需用户名和密码                               |

端口、数据库名和开发凭据可以通过 `compose.dev.yaml` 中对应的环境变量覆盖。下载 Go 依赖较慢时，可以为当前命令设置 `GOPROXY=https://goproxy.cn,direct`。

#### 3. 配置本地应用

在 `apps/server/.env` 中填写以下配置。已有文件时补齐缺项即可；修改了基础服务的端口或密码，也要同步修改这里。

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://ai_workflow:ai_workflow_dev@127.0.0.1:5432/ai_workflow?schema=public
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace-with-your-own-random-string
JWT_EXPIRES_IN=7d
RABBITMQ_URL=amqp://ai_workflow:ai_workflow_dev@127.0.0.1:5672/ai_workflow
OPENSEARCH_URL=http://127.0.0.1:9200
KNOWLEDGE_SOURCE_STORAGE_DRIVER=local
```

把 `JWT_SECRET` 示例值换成自己的随机字符串。建议在第一次保存模型配置前，再生成一个独立的模型凭证加密密钥：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

将输出填到 `apps/server/.env` 的 `MODEL_CREDENTIAL_ENCRYPTION_KEY`。保存过模型 API Key 后请保留这把密钥，随意更换会导致原有凭证无法解密。开发环境省略该配置时会从 `JWT_SECRET` 派生密钥，因此同样需要保留原来的 `JWT_SECRET`。

在 `apps/web/.env` 中填写：

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

根目录的 `.env.example` 用于 Docker 部署；本地应用配置分别放在上面两个文件中。

#### 4. 准备数据库

```bash
pnpm prisma:generate
pnpm --filter @ai-workflow/server prisma:migrate:deploy
```

第一个命令生成 Prisma Client，第二个把仓库已有的迁移应用到开发数据库。

#### 5. 启动应用和执行器

第一个终端，在仓库根目录运行：

```bash
# 同时启动 Web、Server 和 Agent Runtime
pnpm dev
```

第二个终端，从仓库根目录进入 Go Executor 并启动：

```bash
cd apps/executor-go
go mod download
go run ./cmd/executor
```

Go Executor 负责实际执行模型、知识检索、HTTP、代码和条件等业务节点，测试运行时需要同时保持它运行。代码和插件执行会使用本机的 Node.js。

默认地址：

- Web：[http://localhost:5173](http://localhost:5173)，若端口被占用，以 Vite 终端输出为准。
- Server：`http://localhost:3000`。
- Agent Runtime：`http://127.0.0.1:3100`，供 Server 内部调用。

本地启动脚本会自动配置 Server 和 Agent Runtime 的连接，并把共用认证令牌保存在根目录的 `.agent-runtime.auth.local` 中。已有连接配置会优先使用。

如果只需要启动某个应用，可以在仓库根目录使用：

```bash
pnpm dev:web
pnpm dev:server
pnpm dev:agent
```

使用 AI 助手时，Server 和 Agent Runtime 都需要运行。

开发基础服务的常用命令：

```bash
pnpm docker:dev:logs
pnpm docker:dev:status
pnpm docker:dev:down
```

`docker:dev:down` 会停止基础服务并保留开发数据。

### 启动后，跑通第一个流程

1. 打开页面，用手机号和密码登录。首次使用的手机号会自动创建账号。
2. 到“模型”页面添加供应商和一个对话模型，测试连接并启用。
3. 到“工作室”创建工作流，连接“开始 → 大语言模型 → 结束”。
4. 在开始节点添加 `userInput`，在模型节点里引用它，在结束节点里选择模型返回的 `result`。
5. 点击“测试运行”，填写输入，查看结果。
6. 测试通过后发布，在“访问 API”中创建应用密钥，按页面文档接入自己的系统。

需要知识库问答时，先添加可用的嵌入模型，创建知识库并上传文档，等处理完成后，把知识检索节点接到模型前面即可。

Docker 中的 `localhost` 指向容器自身。如果使用宿主机上的 Ollama，模型地址需要填写容器能够访问到的宿主机地址；Docker Desktop 通常可使用 `http://host.docker.internal:11434`。

## 更多文档

- [插件 SDK](packages/workflow-plugin/README.md) / [插件 CLI](packages/workflow-plugin-cli/README.md) / [完整插件示例](examples/remote-render/README.md)
- [Go Executor](apps/executor-go/README.md) / [代码节点运行方式](apps/executor-go/internal/executors/code/README.md)
- [工作流 Runtime](packages/workflow-runtime/README.md) / [执行消息协议](packages/workflow-protocol/README.md)
- [AI 助手设计](docs/ai-agent-runtime-design.md)
- [插件开发架构](docs/plugin-development-architecture.md)
- [知识库与 RAG 学习指南](docs/knowledge-base-rag-learning-guide.md)
- [Prisma 使用教程](docs/prisma使用教程.md)

前端还内置了平台使用和插件开发文档，可以从页面中的帮助入口打开。
