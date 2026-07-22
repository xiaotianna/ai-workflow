# `@ai-workflow/runtime`

## 职责

计划承载与 NestJS、数据库和界面无关的工作流执行计划、节点执行器、运行上下文、依赖调度、重试、超时、取消和检查点契约。

## 当前状态

- `index.ts` 为空，没有可用公共 API。
- `package.json` 仍是初始化占位配置，`main` 指向不存在的 `index.js`。
- 当前没有 `type: module`、`exports`、TypeScript 配置或 Core 依赖。
- 占位 `test` 脚本固定失败，不能视为有效验证入口。

## 首次实现顺序

1. 统一包的 ESM、TypeScript 和真实 exports 配置。
2. 声明对 `@ai-workflow/core` 的直接 workspace 依赖。
3. 定义最小的节点执行器、运行上下文、执行结果和错误契约。
4. 接受已经通过 `validateExecutorWorkflow` 的 Workflow 和 NodeRegistry。
5. 先实现确定性依赖调度，再逐步增加并发、重试、取消和检查点。
6. 首个公共 API 落地后，用真实用法替换本文件中的规划说明。

## 目标边界

- 执行器通过注册表扩展，不在调度循环中硬编码节点类型。
- 使用 edge 的 source、target 和 handle 显式传值，不依赖数组顺序。
- 运行时不修改已保存的 Workflow 或节点配置。
- 外部副作用、日志、持久化和检查点通过显式接口注入。
- NestJS 负责应用生命周期和依赖注入；Prisma、Redis、LangGraph 通过适配器接入。
- Runtime 不依赖 React、UI、Web Feature 或 Nest HTTP 类型。

## 执行注意事项

- 节点只有在依赖满足后执行，条件分支只激活选中的输出路径。
- 并发、失败传播、超时和取消语义必须显式且可预测。
- 只重试声明为可重试的失败；有副作用的节点需要幂等键或补偿策略。
- LangGraph 如果采用，应作为可替换适配器，不能反向定义 Core 领域模型。
