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
import type { PluginListItem } from './types'

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
    title: 'GitHub',
    author: 'langgenius',
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
