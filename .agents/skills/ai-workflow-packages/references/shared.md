# `@ai-workflow/shared`

## 职责

承载前端、后端或多个 package 共同使用的纯 TypeScript 类型、可序列化协议、常量和无副作用工具。

## 当前状态

- `src/index.ts` 仅导出占位常量 `hello`，尚无正式公共 API。
- 包使用 ESM，只暴露根入口 `@ai-workflow/shared`。
- 当前没有运行时依赖，应继续保持浏览器和 Node 双端可用。

## 适合放入

- 前后端共同使用的请求、响应和事件协议。
- 不依赖 DOM、React、NestJS、Prisma 或 Node 专属 API 的类型。
- 稳定、无环境状态、无副作用的小型常量和工具。

## 不适合放入

- 工作流节点、端口和校验模型：放入 `@ai-workflow/core`。
- React 组件与 Hook：放入 `@ai-workflow/ui` 或应用业务功能。
- Prisma model、Nest DTO class、Redis client 或环境变量读取。
- 只有一个调用方使用、尚未形成共享契约的便利类型。

## 使用与维护

- 从 `@ai-workflow/shared` 根入口导入，不深层引用源码。
- 新增正式 API 时按领域建立内部文件，再由 `src/index.ts` 显式导出。
- 协议字段使用可序列化值，不传递 class instance、函数或浏览器对象。
- 跨版本数据使用明确的判别字段或版本字段。
- 首个正式 API 落地时删除 `hello` 占位内容，并更新本文件的真实示例。
