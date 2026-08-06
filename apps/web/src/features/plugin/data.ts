import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Brain,
  Cloud,
  Database,
  GitBranch,
  Globe,
  Hammer,
  Mail,
  MessageCircle,
  Package,
  Puzzle,
  Search,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'

import { pluginCategories } from './constants'
import type { PluginDetail, PluginListItem, PluginVersionHistory } from './types'

type PluginCategoryItemId = PluginListItem['categoryId']

function getCategoryLabel(categoryId: PluginCategoryItemId) {
  return pluginCategories.find((category) => category.id === categoryId)?.label ?? categoryId
}

const pluginAuthors = ['langgenius', 'community', 'dify-labs', 'open-source'] as const

const pluginTagPool = [
  'RAG',
  'LLM',
  'Search',
  'Agent',
  'Code',
  'Email',
  'Storage',
  'Docs',
  'Messaging',
  'Scraper',
  'Bundle',
  'API',
  'Workflow',
  'Analytics',
] as const

const categoryIconMap: Record<PluginCategoryItemId, LucideIcon> = {
  'agent-strategies': Bot,
  bundles: Package,
  'data-sources': Database,
  extensions: Puzzle,
  models: Brain,
  tools: Hammer,
  triggers: Zap,
}

const seedPlugins: Omit<PluginListItem, 'categoryLabel'>[] = [
  {
    id: 'github',
    slug: 'github_datasource',
    title: 'GitHub',
    author: 'langgenius',
    verified: true,
    installCount: 20_088,
    description: 'GitHub 仓库数据源 - 访问仓库、问题、拉取请求和 Wiki 页面',
    categoryId: 'data-sources',
    tags: ['RAG'],
    icon: GitBranch,
  },
  {
    id: 'google-search',
    title: 'Google Search',
    author: 'langgenius',
    installCount: 15_342,
    description: '通过 Google 搜索 API 获取实时网页搜索结果，为 Agent 提供联网检索能力',
    categoryId: 'tools',
    tags: ['Search'],
    icon: Search,
  },
  {
    id: 'openai',
    title: 'OpenAI',
    author: 'langgenius',
    installCount: 42_156,
    description: '接入 OpenAI 对话与嵌入模型，支持 GPT-4o、GPT-4o mini 等主流模型',
    categoryId: 'models',
    tags: ['LLM'],
    icon: Sparkles,
  },
  {
    id: 'slack',
    title: 'Slack',
    author: 'langgenius',
    installCount: 8741,
    description: 'Slack 消息与频道集成 - 发送通知、读取频道消息并触发自动化工作流',
    categoryId: 'triggers',
    tags: ['Messaging'],
    icon: MessageCircle,
  },
  {
    id: 'notion',
    title: 'Notion',
    author: 'community',
    installCount: 12_603,
    description: 'Notion 数据库与页面读写 - 同步知识库内容并在工作流中检索文档',
    categoryId: 'data-sources',
    tags: ['RAG', 'Docs'],
    icon: Database,
  },
  {
    id: 'code-interpreter',
    title: 'Code Interpreter',
    author: 'langgenius',
    installCount: 9874,
    description: '在沙箱环境中执行 Python 代码，支持数据分析、图表生成与文件处理',
    categoryId: 'tools',
    tags: ['Code'],
    icon: Hammer,
  },
  {
    id: 'deepseek',
    title: 'DeepSeek',
    author: 'langgenius',
    installCount: 18_920,
    description: 'DeepSeek 对话模型接入，支持思考模式与多轮对话场景',
    categoryId: 'models',
    tags: ['LLM'],
    icon: Brain,
  },
  {
    id: 'react-agent',
    title: 'ReAct Agent',
    author: 'langgenius',
    installCount: 11_245,
    description: '基于 ReAct 框架的 Agent 策略，支持工具调用、推理链与多步任务规划',
    categoryId: 'agent-strategies',
    tags: ['Agent'],
    icon: Bot,
  },
  {
    id: 'web-scraper',
    title: 'Web Scraper',
    author: 'community',
    installCount: 6532,
    description: '抓取网页正文内容并提取结构化数据，适用于资讯聚合与竞品监控',
    categoryId: 'extensions',
    tags: ['Scraper'],
    icon: Globe,
  },
  {
    id: 'smtp-email',
    title: 'SMTP Email',
    author: 'langgenius',
    installCount: 7318,
    description: '通过 SMTP 发送邮件通知，支持 HTML 模板与附件，适用于告警与报告推送',
    categoryId: 'triggers',
    tags: ['Email'],
    icon: Mail,
  },
  {
    id: 'aws-s3',
    title: 'AWS S3',
    author: 'community',
    installCount: 5489,
    description: 'Amazon S3 对象存储集成 - 上传、下载与管理文件，支持预签名 URL',
    categoryId: 'data-sources',
    tags: ['Storage'],
    icon: Cloud,
  },
  {
    id: 'workflow-bundle',
    title: 'Customer Support Bundle',
    author: 'langgenius',
    installCount: 3210,
    description: '客服场景集成包 - 包含 Slack、Notion 与邮件触发器的预置工作流模板',
    categoryId: 'bundles',
    tags: ['Bundle'],
    icon: Puzzle,
  },
]

const generatedPluginPrefixes = [
  'Smart',
  'Auto',
  'Cloud',
  'Data',
  'AI',
  'Pro',
  'Quick',
  'Sync',
  'Open',
  'Hyper',
] as const

const generatedPluginSubjects = [
  'Connector',
  'Toolkit',
  'Bridge',
  'Assistant',
  'Pipeline',
  'Monitor',
  'Loader',
  'Exporter',
  'Trigger',
  'Analyzer',
  'Hub',
  'Gateway',
  'Parser',
  'Scheduler',
  'Indexer',
  'Resolver',
  'Translator',
  'Summarizer',
  'Classifier',
  'Orchestrator',
] as const

const categoryIds = pluginCategories
  .map((category) => category.id)
  .filter((id): id is PluginCategoryItemId => id !== 'all')

const categoryDescriptions: Record<PluginCategoryItemId, string> = {
  'agent-strategies': 'Agent 策略插件 - 支持多步推理、工具编排与任务规划',
  bundles: '集成包 - 预置多插件组合与工作流模板，开箱即用',
  'data-sources': '数据源插件 - 连接外部系统并同步结构化或非结构化数据',
  extensions: '扩展插件 - 增强平台能力并接入第三方服务',
  models: '模型插件 - 接入对话、嵌入或多模态模型能力',
  tools: '工具插件 - 为 Agent 和工作流提供可调用工具能力',
  triggers: '触发器插件 - 监听外部事件并自动启动工作流',
}

const extraIcons = [Wrench, Globe, Cloud, Mail, Sparkles, Search, Puzzle, Package] as const

function toPluginListItem(plugin: Omit<PluginListItem, 'categoryLabel'>): PluginListItem {
  return {
    ...plugin,
    categoryLabel: getCategoryLabel(plugin.categoryId),
  }
}

function createGeneratedPlugin(index: number): PluginListItem {
  const categoryId = categoryIds[index % categoryIds.length]
  const prefix = generatedPluginPrefixes[index % generatedPluginPrefixes.length]
  const subject =
    generatedPluginSubjects[
      Math.floor(index / generatedPluginPrefixes.length) % generatedPluginSubjects.length
    ]
  const title = `${prefix} ${subject}`
  const tagCount = (index % 3) + 1
  const tags = Array.from({ length: tagCount }, (_, tagIndex) => {
    return pluginTagPool[(index + tagIndex) % pluginTagPool.length]
  })

  return toPluginListItem({
    id: `plugin-${index + 1}`,
    title,
    author: pluginAuthors[index % pluginAuthors.length],
    installCount: 1200 + ((index * 1379) % 48_000),
    description: `${title} - ${categoryDescriptions[categoryId]}`,
    categoryId,
    tags: [...new Set(tags)],
    icon: extraIcons[index % extraIcons.length] ?? categoryIconMap[categoryId],
  })
}

function createMockPlugins(count: number): PluginListItem[] {
  const plugins = seedPlugins.map(toPluginListItem)

  for (let index = plugins.length; index < count; index += 1) {
    plugins.push(createGeneratedPlugin(index))
  }

  return plugins
}

export const mockPlugins = createMockPlugins(100)

const githubVersions: PluginVersionHistory = [
  {
    version: '0.4.7',
    publishedAt: '2026-08-06T10:30:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 新增 GitHub Wiki 页面同步能力
- 优化大型仓库的增量索引性能
- 修复 OAuth 令牌刷新失败后无法重试的问题
`,
  },
  {
    version: '0.4.5',
    publishedAt: '2026-05-06T09:20:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 支持拉取请求评论和 Review 内容
- 增加私有仓库访问状态提示
`,
  },
  {
    version: '0.4.3',
    publishedAt: '2026-04-02T15:45:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 新增 Issue 内容过滤选项
- 改进 API 限流后的自动恢复策略
`,
  },
  {
    version: '0.4.2',
    publishedAt: '2026-02-18T11:10:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 支持按分支读取仓库文件
- 修复部分 Markdown 文件编码异常
`,
  },
  {
    version: '0.4.1',
    publishedAt: '2026-02-03T14:00:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 增加 GitHub Enterprise 地址配置
- 优化仓库连接校验反馈
`,
  },
  {
    version: '0.4.0',
    publishedAt: '2025-12-06T11:20:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 新增仓库文件与 Issue 的统一数据源配置
- 支持增量同步仓库内容
`,
  },
  {
    version: '0.3.3',
    publishedAt: '2025-10-06T16:40:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 优化大型仓库的首次同步性能
- 修复部分分支无法读取的问题
`,
  },
  {
    version: '0.3.2',
    publishedAt: '2025-10-01T09:15:00+08:00',
    publisher: 'langgenius',
    changelog: `
- 支持 GitHub 仓库基础内容同步
- 增加连接状态检查
`,
  },
]

const githubContent = `
# GitHub Datasource Plugin

将 GitHub 仓库、Issue、Pull Request 和 Wiki 页面作为数据源接入 AI Workflow，并提供完整的身份验证支持。

## 功能特性

- **仓库访问：** 浏览并下载公开或私有仓库中的文件
- **Issue 与 Pull Request：** 获取 Issue、PR 正文以及评论内容
- **多种身份验证：** 支持 Personal Access Token 和 OAuth
- **限流处理：** 自动检测 GitHub API 限流并在可用后恢复
- **内容处理：** 自动处理 Markdown 内容并提取可索引文本
- **多内容类型：** 支持代码、文档、Issue、PR 与 Wiki 页面

## 支持的内容类型

- 仓库文件（Markdown、代码与文档）
- 包含评论的 GitHub Issue
- Pull Request 正文、Review 与讨论
- GitHub Wiki 页面

## 使用方式

1. 安装插件并创建 GitHub 连接。
2. 选择需要同步的组织、仓库和分支。
3. 配置内容范围后开始首次同步。

> 私有仓库的可见范围由所使用的 GitHub 凭证决定。建议为生产环境使用最小权限令牌。
`

function createDefaultVersions(plugin: PluginListItem): PluginVersionHistory {
  return [
    {
      version: '1.4.0',
      publishedAt: '2026-07-28T16:30:00+08:00',
      publisher: plugin.author,
      changelog: `
- 改进插件运行稳定性
- 优化配置项说明和错误反馈
- 更新运行时依赖
`,
    },
    {
      version: '1.3.1',
      publishedAt: '2026-05-16T10:00:00+08:00',
      publisher: plugin.author,
      changelog: `
- 修复边界场景下的连接失败问题
- 优化请求重试策略
`,
    },
    {
      version: '1.2.0',
      publishedAt: '2026-02-21T13:15:00+08:00',
      publisher: plugin.author,
      changelog: `
- 新增批量处理能力
- 补充配置示例与使用说明
`,
    },
  ]
}

function createDefaultContent(plugin: PluginListItem) {
  return `
# ${plugin.title} Plugin

${plugin.description}。

## 功能特性

- 提供与 AI Workflow 工作流一致的节点配置体验
- 支持在运行时安全地读取连接配置
- 为常见失败场景提供明确的错误反馈
- 支持在工作流中与其他插件组合使用

## 快速开始

1. 安装 **${plugin.title}** 插件。
2. 根据配置说明创建连接。
3. 在工作流中添加对应节点并完成必要参数。
4. 运行工作流并检查节点输出。

## 注意事项

请根据实际业务需要配置最小权限，并在生产环境中妥善管理访问凭证。
`
}

function toPluginDetail(plugin: PluginListItem): PluginDetail {
  if (plugin.id === 'github' && plugin.author === 'langgenius') {
    return {
      ...plugin,
      content: githubContent,
      versions: githubVersions,
    }
  }

  return {
    ...plugin,
    content: createDefaultContent(plugin),
    versions: createDefaultVersions(plugin),
  }
}

export const mockPluginDetails = mockPlugins.map(toPluginDetail)

export function findMockPluginDetail(author: string, pluginId: string) {
  return mockPluginDetails.find((plugin) => plugin.author === author && plugin.id === pluginId)
}

export function formatPluginInstallCount(count: number) {
  return count.toLocaleString('zh-CN')
}

export function filterMockPlugins(search: string, categoryId: string) {
  const normalizedSearch = search.trim().toLowerCase()

  return mockPlugins.filter((plugin) => {
    const matchesCategory = categoryId === 'all' || plugin.categoryId === categoryId
    const matchesSearch =
      !normalizedSearch ||
      plugin.title.toLowerCase().includes(normalizedSearch) ||
      plugin.description.toLowerCase().includes(normalizedSearch) ||
      plugin.author.toLowerCase().includes(normalizedSearch) ||
      plugin.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))

    return matchesCategory && matchesSearch
  })
}
