import { z } from 'zod'

export const PLUGIN_PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
export const PLUGIN_NODE_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
export const PLUGIN_PORT_ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/
export const PLUGIN_NODE_TYPE_PATTERN =
  /^plugin:(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export const pluginPackageNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(214)
  .regex(PLUGIN_PACKAGE_NAME_PATTERN, '插件 package 名称必须是合法的小写 npm package 名称')

export const pluginNodeKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(PLUGIN_NODE_KEY_PATTERN, '节点 Key 只能使用小写字母、数字和连字符')

export const pluginPortIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(PLUGIN_PORT_ID_PATTERN, '端口 ID 格式不正确')

export const pluginNodeTypeSchema = z
  .string()
  .trim()
  .regex(PLUGIN_NODE_TYPE_PATTERN, '插件节点类型格式不正确')

export function createPluginNodeType(packageName: string, nodeKey: string) {
  return `plugin:${packageName}/${nodeKey}` as const
}
