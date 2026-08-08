import { CodeXml, Globe2, KeyRound, type LucideIcon } from 'lucide-react'

import type { PluginPermission } from '@/api/plugins'

interface PluginPermissionDetails {
  title: string
  description: string
  icon: LucideIcon
}

export const pluginPermissionDetails: Record<PluginPermission, PluginPermissionDetails> = {
  'web:execute': {
    title: '运行插件界面代码',
    description: '允许插件在页面中运行自定义界面和交互代码，并访问当前页面上下文。',
    icon: CodeXml,
  },
  'network:public': {
    title: '访问公网',
    description: '允许插件向公开的互联网地址发起网络请求。',
    icon: Globe2,
  },
  'secrets:read': {
    title: '读取工作流密钥',
    description: '允许插件在运行时读取已授权给当前工作流的密钥。',
    icon: KeyRound,
  },
}
