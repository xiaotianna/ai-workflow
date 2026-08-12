import type { PluginManifest, PluginManifestNode } from '@ai-workflow/plugin'
import type { PluginWebModule } from '@ai-workflow/plugin/ui'
import type { NodeConfigRendererMap } from '@ai-workflow/form/components/node-config-section'
import type { NodeUIRegistration } from '@ai-workflow/nodes-ui'

function nodeRequiresRemoteUi(node: PluginManifestNode): boolean {
  return node.ui.node.custom || node.ui.node.remoteExport !== undefined || node.ui.form.custom
}

export function manifestHasUnresolvedRemoteUi(
  manifest: PluginManifest,
  webModule: PluginWebModule | undefined,
): boolean {
  return manifest.nodes.some((node) => {
    if (!nodeRequiresRemoteUi(node)) return false

    const moduleForNode = webModule?.nodes[node.key]
    if (node.ui.node.custom) return !moduleForNode?.renderer
    if (node.ui.node.remoteExport !== undefined) return !moduleForNode?.content
    if (node.ui.form.custom) return !moduleForNode?.configRenderer
    return false
  })
}

export function createPluginUiRegistrations(
  manifest: PluginManifest,
  webModule: PluginWebModule,
): {
  readonly uiRegistrations: readonly NodeUIRegistration[]
  readonly configRenderers: NodeConfigRendererMap
} {
  const uiRegistrations: NodeUIRegistration[] = [],
    configRenderers: Record<string, NodeConfigRendererMap[string]> = {}

  for (const node of manifest.nodes) {
    const moduleForNode = webModule.nodes[node.key]
    if (!moduleForNode) continue

    if (node.ui.node.custom) {
      if (!moduleForNode.renderer) {
        throw new Error(`插件节点 ${node.type} 缺少 renderer 导出`)
      }

      uiRegistrations.push({
        kind: 'renderer',
        type: node.type,
        component: moduleForNode.renderer,
      })
      continue
    }

    if (node.ui.node.remoteExport !== undefined) {
      if (!moduleForNode.content) {
        throw new Error(`插件节点 ${node.type} 缺少 content 导出`)
      }

      uiRegistrations.push({
        kind: 'content',
        type: node.type,
        component: moduleForNode.content,
      })
    }

    if (node.ui.form.custom) {
      if (!moduleForNode.configRenderer) {
        throw new Error(`插件节点 ${node.type} 缺少 configRenderer 导出`)
      }

      configRenderers[node.type] = moduleForNode.configRenderer
    }
  }

  return {
    uiRegistrations,
    configRenderers,
  }
}
