# `@ai-workflow/form`

## 职责

计划提供基于 Core 字段契约的节点配置表单渲染、字段注册、错误展示和 UI 控件映射。

## 当前状态

- `src/index.ts` 为空，没有可用公共 API。
- 包依赖 `@ai-workflow/core`、`@ai-workflow/ui` 和 `@ai-workflow/shared`。
- 不要编造导入方式，也不要把规划中的 renderer 当成已实现能力。

## 已有上游契约

Core 当前提供 `FieldSchemaMap<TConfig>`、`FIELD_UI_TYPES` 以及 string、number、boolean、select、code 字段定义。节点默认配置来自 `NodeType.createInitialConfig()`，不使用已废弃的字段 `defaultValue`。

## 目标边界

- 将 Core 字段定义映射到 UI 控件。
- 接收外部值、字段错误和变更回调，不自行保存到服务端。
- 通过 registry 扩展字段 renderer，不在单个组件中无限堆积分支。
- 复用 UI `Form` 和 `Form.Field` 的标签、说明、可选提示与错误展示。
- 不承载工作流保存、网络请求、路由或节点执行逻辑。

## 首次实现注意事项

1. 只创建任务需要的 contracts、registry、renderers 或 components 目录。
2. 先使用节点 Zod schema 校验配置，再把结构化错误映射到字段。
3. 为实际控件提供 `aria-label`，提交可用性由上层配置编辑器判断。
4. 缺少 switch 或 code editor renderer 时返回明确状态，不静默替换成不等价控件。
5. 建立首个根导出后，在本文件增加最小真实用法和扩展方式。
