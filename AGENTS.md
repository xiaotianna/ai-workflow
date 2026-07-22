## 项目操作约束

- 不要自动执行 `dev`、`build` 相关命令，除非用户主动要求
- 不要自动执行任何 `git` 命令，除非用户主动要求

## 多项目规范读取

- 根目录 `AGENTS.md` 提供仓库通用规范
- 如果前端、后端或其他子项目目录下存在自己的 `AGENTS.md`，进入对应子项目工作前必须读取并遵守该子项目规范
- 子项目规范可以补充更具体的技术约束；与根目录规范冲突时，优先遵守更具体的子项目规范，但不得违反用户明确指令
- 涉及前后端联动时，需要同时参考根目录规范和对应前端/后端子项目规范

## 设计规范

- 前端界面及 shadcn 组件的新增、修改必须遵守 [`docs/design-system.md`](docs/design-system.md)
- 交互态不得直接套用 shadcn 默认 ring；必须使用设计规范中的边框、背景与阴影反馈

## 通用表单组件规范

- 页面表单优先使用 `@ai-workflow/ui/components/form` 提供的 `Form` 与 `Form.Field`，保持字段标签、间距、说明和错误态一致。
- 标准写法为 `<Form><Form.Field required label="名称">{外部表单控件}</Form.Field></Form>`；`Form` 负责容器样式，`Form.Field` 负责字段布局，值、校验、提交及具体控件仍由业务侧管理。
- `Form.Field` 未传 `required` 时会在标签后自动显示 `（可选）`。字段标题不触发子控件展开或聚焦，外部控件需自行提供准确的 `aria-label`。
- 登录、创建、保存、确认等有提交含义的按钮使用 `Button` 的 `confirm` variant；表单未填写完整或校验未通过时必须传入 `disabled`，不可点击并显示统一浅蓝禁用态。取消、返回等次级操作使用 `secondary` variant，不在页面内重复拼接背景、边框、阴影和交互态。
- 表单控件继续遵守 [`docs/design-system.md`](docs/design-system.md) 的默认、Hover、Focus visible、Invalid 与 Disabled 状态规范，不得使用 ring。
- 需要单文件点击选择与拖拽上传时使用 `@ai-workflow/ui/components/file-dropzone`；文件扩展名、大小和业务内容校验保留在对应 Feature，错误通过 `Form.Field error` 展示。

## Web 业务 Feature 规范

- `apps/web/src/pages` 只负责路由页面骨架与页面级状态编排；可独立复用、包含业务语义的组件放入 `apps/web/src/features/<feature-name>`。
- Feature 内按职责维护 `components`、业务类型与数据，使用根目录 `index.ts` 暴露公共入口；页面不得跨层引用 Feature 的内部文件。
- 仅服务单一业务域的组件保留在对应 Feature；跨业务复用的 Web 组件放入 `apps/web/src/components`，无业务语义的通用基础组件放入 `packages/ui/src/components`。

## Git Commit Message 约束

提交信息必须使用以下格式：

```bash
<type>: <subject>
```

示例：

```bash
feat: add login page
fix: resolve token expiration issue
docs: update usage guide
```

### type 允许值

- `feat`：新增功能
- `fix`：修复问题
- `docs`：文档更新
- `style`：格式调整
- `refactor`：代码重构
- `perf`：性能优化
- `test`：测试相关
- `chore`：配置、依赖、脚本等杂项
- `build`：构建相关
- `ci`：CI/CD 相关

### 规则

- 使用中文提交信息
- `subject` 简短明确，不超过 72 个字符
- 不以句号结尾
- 禁止使用 `update`、`fix bug`、`test`、`wip` 等无意义描述
- 一次提交只包含一类变更
