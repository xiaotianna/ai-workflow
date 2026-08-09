# @examples/remote-render

用于验证 Web Remote、自定义 UI、宿主字段和本地插件 Executor 的示例插件：

| 节点         | 模式             | 说明                                                       |
| ------------ | ---------------- | ---------------------------------------------------------- |
| 富文本卡片   | `content`        | 在 BaseNode 内渲染渐变卡片、状态徽章与实时预览             |
| 指标面板     | `content`        | 网格化指标块，展示配置中的 KPI 与趋势                      |
| 全自定义外壳 | `renderer`       | 完整接管节点外壳、端口与拖拽区域                           |
| 可视化构建器 | `configRenderer` | 完整自定义配置面板，含主题预览、调色板与宿主异常处理字段   |
| 模型配置回显 | `sandbox-js`     | 使用宿主模型选择器，并通过固定 `response` 输出回显执行结果 |
| 插件 LLM     | `host-llm`       | 通过插件声明复用宿主 LLM 执行器并输出真实模型回答          |

## 本地开发

```bash
pnpm install
pnpm plugin:check
pnpm plugin:build
pnpm plugin:dev
```

构建产物位于 `dist/`，其中 `web/remoteEntry.js` 会被工作流编辑器动态加载。

## 测试步骤

1. 执行 `pnpm plugin:pack` 生成 `.tgz`
2. 在插件 Marketplace 发布并安装
3. 在工作流中添加本插件节点，确认画布 content / renderer 与配置面板 configRenderer 均正常渲染
4. 添加“模型配置回显”节点，选择已配置的模型并传入可选 JSON 输入
5. 确认输出变量区域自动出现不可删除的 `response`
6. 运行工作流，确认 `response` 包含 `selectedModel`、`prompt`、`input` 和运行上下文
7. 添加“插件 LLM”节点并配置模型与上下文，确认它和内置 LLM 一样输出字符串 `result`

“模型配置回显”只验证模型选择字段和插件执行链路，不会调用模型供应商接口。

“插件 LLM”不读取模型凭证，也不直接请求供应商。它通过 `host-llm` 执行声明交给宿主已有的
LLM Executor，复用模型解析、上下文变量替换、参数、异常处理和供应商适配器。
