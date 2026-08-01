# 工作流节点配置请求整改记录

## 背景

打开工作流页面时，即使尚未打开任何节点配置面板，前端也会请求知识库目录和 Chat 模型分组；
草稿加载期间还会各请求两次。本文持续记录本次整改的原因、完成项、未完成项和验证结果。

## 根因

1. 工作流草稿返回前，`AppWorkflowPage` 会先渲染一个禁用的临时编辑器；临时编辑器仍挂载
   `WorkflowModelCatalogProvider` 和 `WorkflowKnowledgeBaseCatalogProvider`，因此先请求一次目录。
2. 草稿返回后，临时编辑器被正式编辑器替换，两个 Provider 重新挂载并再次请求，形成截图中的
   两组相同请求。
3. 两个 Provider 把目录请求放在顶层挂载 Effect 中，同时为画布摘要和配置字段提供数据，导致
   请求生命周期错误地与“编辑器打开”绑定，而不是与“对应节点配置面板打开”绑定。
4. RAG 与 LLM 的画布摘要依赖目录接口补齐名称和图标；节点持久化配置目前只保存资源 ID，无法
   独立展示已保存配置。

## 处理进度

### 已完成

- [x] 定位重复请求的两次组件挂载链路。
- [x] 第一阶段：禁用/临时编辑器不再触发知识库目录和模型分组请求，消除草稿加载前的第一组
      重复请求。
- [x] 抽取 `useLazyWorkflowCatalog`，统一目录的空闲、加载、成功、失败、缓存和显式重试状态。
- [x] 知识库目录改为只在 RAG 节点配置字段挂载时加载。
- [x] Chat 模型分组改为只在 LLM 节点配置字段挂载时加载。
- [x] 同一编辑器生命周期内重复打开同类配置面板复用已加载目录，普通 `load()` 不重复请求。
- [x] RAG 持久化 `knowledgeBases` 引用快照，包含稳定 ID 和可选名称、图标；旧
      `knowledgeBaseId` / `knowledgeBaseIds` 自动迁移为兼容引用。
- [x] LLM 持久化模型组名称、模型标识、显示名称和供应商类型快照，同时保留运行时稳定 ID。
- [x] RAG 与 LLM 画布摘要只读取草稿中的持久化快照，不再消费完整候选目录。
- [x] 服务端知识库删除保护同时识别新 `knowledgeBases: [{ id }]` 与两种历史字段。
- [x] 排查所有内置节点的画布与配置 renderer 请求行为。
- [x] 完成 Web、Server TypeScript 检查与仓库 Lint。

### 未完成

- [ ] 按仓库约束本次未启动 `dev` 或执行 `build`，因此浏览器 Network 面板的运行时验收仍需在
      已启动的本地环境中手动确认；检查步骤见下文。

## 最终方案

目录数据与节点数据分为两个生命周期：

- 节点配置是工作流草稿事实数据。RAG 保存所选知识库引用快照，LLM 保存所选模型展示快照，
  草稿接口随节点完整返回，画布只渲染这部分数据。
- 候选目录只服务配置交互。Catalog Provider 负责同一编辑器生命周期的缓存，但初始状态为
  `idle`；只有对应字段挂载后调用 `load()`。重复调用只把 `requested` 保持为 `true`，不会增加
  请求修订号；只有用户点击“重试”调用 `reload()` 才重新请求。
- 旧 RAG 草稿缺少名称与图标时，Core 仍保留稳定 ID，画布显示“待刷新展示信息”；用户打开
  RAG 配置并确认选择后，目录中的最新名称与图标写入草稿。旧 LLM 草稿使用相同兼容策略。

## 全节点请求审计

| 节点         | 配置数据来源                                  | 配置面板前是否请求 | 整改结论                                               |
| ------------ | --------------------------------------------- | ------------------ | ------------------------------------------------------ |
| Start        | 草稿中的输入变量                              | 否                 | 无目录请求                                             |
| End          | 草稿中的输出绑定                              | 否                 | 无目录请求                                             |
| LLM          | 草稿模型快照；面板内 Chat 模型目录            | 否                 | 仅 `LlmModelField` 挂载后加载一次                      |
| RAG          | 草稿知识库快照；面板内知识库目录              | 否                 | 仅 `KnowledgeBaseField` 挂载后加载一次                 |
| Code         | 草稿代码                                      | 否                 | 只在字段挂载时按需加载 Monaco 代码分块，不调用配置 API |
| HTTP         | 草稿 URL、Method、Headers、Params、Body、超时 | 否                 | 无目录请求                                             |
| Loop         | 草稿循环次数与终止条件                        | 否                 | 无目录请求                                             |
| Loop Start   | 系统节点数据                                  | 否                 | 无配置目录                                             |
| Loop Exit    | 系统节点数据                                  | 否                 | 无配置目录                                             |
| Condition    | 草稿结构化条件                                | 否                 | 无目录请求                                             |
| Sub Workflow | 草稿节点配置                                  | 否                 | 当前无配置目录请求                                     |

审计范围覆盖：

- `apps/web/src/features/workflow/node-config-renderers`
- `apps/web/src/components/workflow`
- `packages/workflow-form/src/fields`
- `packages/workflow-nodes-ui/src/nodes`

上述目录中只有两个工作流候选 API 调用：知识库 Catalog 与模型 Catalog；请求入口均已受字段
挂载后的显式 `load()` 控制。节点运行、测试运行、导入和自动保存属于用户操作或持久化流程，
不属于配置候选预取。

## 验证结果

- `pnpm --filter @ai-workflow/web exec tsc -b --pretty false`：通过。
- `pnpm --filter @ai-workflow/server exec tsc --noEmit --pretty false`：通过。
- `pnpm lint`：通过，0 error；保留一条与本次无关的既有 `apps/web/vite.config.ts` Node `path`
  导入警告。
- 未执行 `dev`、`build`、Git 命令或新增测试文件，符合仓库操作约束。

## 浏览器手动验收

1. 清空 Network，进入工作流页面并等待 `workflow-draft` 完成：不应出现
   `knowledge-bases` 或 `groups?modelType=chat`。
2. 打开 RAG 节点配置：只出现一次 `knowledge-bases`；关闭并再次打开其他 RAG 节点配置，不应
   再请求。点击失败态“重试”时允许新增一次请求。
3. 刷新页面后打开 LLM 节点配置：只出现一次 `groups?modelType=chat`；重复打开 LLM 配置不应
   再请求。此时不应同时请求知识库目录。
4. 只浏览包含已配置 RAG/LLM 节点的画布：摘要应直接显示草稿快照；历史节点缺少快照时显示
   “待刷新展示信息”，且不得因此请求目录。

## 验收目标

- 工作流草稿加载过程中不请求知识库目录和模型分组。
- 只浏览画布、不打开节点配置面板时，不请求任何节点配置选项目录。
- 打开 RAG 配置面板时只加载知识库目录；打开 LLM 配置面板时只加载 Chat 模型分组。
- 同一编辑器生命周期内重复打开同类节点配置面板时复用已加载目录；手动重试除外。
- RAG 与 LLM 节点摘要使用草稿中保存的展示信息，旧数据缺少展示快照时提供明确的兼容文案。
