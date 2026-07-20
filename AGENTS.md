## 项目操作约束

- 不要自动执行 `dev`、`build` 相关命令，除非用户主动要求
- 不要自动执行任何 `git` 命令，除非用户主动要求

## 多项目规范读取

- 根目录 `AGENTS.md` 提供仓库通用规范
- 如果前端、后端或其他子项目目录下存在自己的 `AGENTS.md`，进入对应子项目工作前必须读取并遵守该子项目规范
- 子项目规范可以补充更具体的技术约束；与根目录规范冲突时，优先遵守更具体的子项目规范，但不得违反用户明确指令
- 涉及前后端联动时，需要同时参考根目录规范和对应前端/后端子项目规范

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
