# 项目全局规范

## 操作约束

- 不要自动执行 `dev`、`build` 相关命令，除非用户主动要求。
- 不要自动执行任何 git 命令，除非用户主动要求。
- 不要新建测试文件，除非用户明确要求补充测试。
- 修改现有文件时保留用户未要求调整的内容，不顺手扩大改动范围。

## 项目技能路由

仓库的详细项目规范维护在 `.agents/skills`。开始修改对应范围前，必须读取相应技能的 `SKILL.md`，再按其中导航渐进式加载必要引用文件。

| 范围                                                              | 技能                    | 路径                                           |
| ----------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| `apps/web` 前端页面、路由、布局、业务功能、组件、Hooks 与设计规范 | `$app-web`              | `.agents/skills/app-web/SKILL.md`              |
| `apps/server` 后端框架、接口、模块、数据访问与工作流接入          | `$app-server`           | `.agents/skills/app-server/SKILL.md`           |
| `packages/*` 所有子包的职责、公开 API、用法、依赖与注意事项       | `$ai-workflow-packages` | `.agents/skills/ai-workflow-packages/SKILL.md` |

### 读取规则

- 只读取当前任务需要的引用文件，不要默认加载某个技能下的全部内容。
- 涉及多个范围时组合读取多个技能；例如 Web 使用或修改 UI package 时，同时读取 `$app-web` 和 `$ai-workflow-packages` 的 UI 引用。
- 如果子目录后续增加自己的 `AGENTS.md`，进入该目录工作前也必须读取；更具体的目录规范优先，但不得违反用户明确指令和本文件的全局操作约束。

## 技能同步责任

- 架构、目录职责、设计规范、组件用法、Hooks 约定、后端框架、公开 API、导出路径、包依赖或注意事项变化时，必须在同一任务中更新对应技能。
- 新增 workspace package 时，在 `$ai-workflow-packages` 中增加独立引用文件，并在其 `SKILL.md` 中登记加载条件。
- 技能适用范围变化时，同时更新 `SKILL.md` 顶部 `description` 和 `agents/openai.yaml`。
- 根 `AGENTS.md` 只维护全局约束和技能路由；项目或子包细节放入对应技能，避免重复和内容漂移。

## Monorepo 通用约束

- 使用根 `package.json` 声明的 Node.js 与 pnpm 版本，依赖安装和 workspace 管理由 pnpm 负责。
- 应用可以依赖 workspace package，package 不得反向依赖 `apps/*`。
- 跨包调用使用包名和 `package.json#exports` 公开入口，不深层引用其他包的 `src` 物理路径。
- 每个 package 声明自己的直接运行时依赖，不依赖根目录依赖提升的偶然结果。
- 新增抽象、公共组件或共享工具前，先确认存在明确职责和真实复用场景。

## Git 提交信息

提交信息使用以下格式：

```text
<type>: <subject>
```

允许的 `type`：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`build`、`ci`。

- `subject` 使用中文，简短明确，不超过 72 个字符。
- 不以句号结尾。
- 禁止使用 `update`、`fix bug`、`test`、`wip` 等无意义描述。
- 一次提交只包含一类变更。

示例：

```text
feat: 新增登录页面
fix: 修复令牌过期处理
docs: 补充工作流节点使用说明
```
