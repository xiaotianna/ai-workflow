// const nodeMap = new Map<string, NodePlugin>()

// export function registerNode(plugin: NodePlugin) {
//   const {type} = plugin.definition

//   if (nodeMap.has(type)) {
//     console.warn(`Node "${type}" 已覆盖`)
//   }

//   nodeMap.set(type, plugin)
// }

// export function getNode(type: string) {
//   const node = nodeMap.get(type)

//   if (!node) {
//     throw new Error(`Node "${type}" 未注册`)
//   }

//   return node
// }

/**
 * 使用
 * 
// 渲染节点

import { getNode } from '@my/workflow-core'

export function NodeRenderer({ node, onChange }) {
  const plugin = getNode(node.type)

  const UI = plugin.ui

  if (!UI) {
    return <div>No UI</div>
  }

  return <UI data={node.data} onChange={onChange} />
}
 */

/**
 * Runtime使用
// workflow-runtime

import { getNode } from '@my/workflow-core'

export async function runNode(node, ctx) {
  const plugin = getNode(node.type)

  if (!plugin.runtime) {
    throw new Error(`Node "${node.type}" 没有 runtime`)
  }

  return plugin.runtime(ctx, node.data)
}
 */
