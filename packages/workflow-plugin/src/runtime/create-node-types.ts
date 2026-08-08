import type { NodeType } from '@ai-workflow/core'

import type { PluginManifest } from '../contracts/manifest'
import { compilePluginSchemaToZod } from '../schema/compiler'

export const PLUGIN_HOST_VERSION = '1.0.0'

/**
 * 将已经过 manifest 校验的插件节点编译成宿主 Core 可以注册的静态节点类型。
 * 自定义 Remote UI 和沙箱执行由各宿主分别装载，不在此处执行第三方代码。
 */
export function createNodeTypesFromPluginManifest(manifest: PluginManifest): readonly NodeType[] {
  return manifest.nodes.map((node) => {
    const schema = compilePluginSchemaToZod(node.configSchema)

    return {
      schema,
      definition: {
        type: node.type,
        label: node.label,
        description: node.description,
        icon: node.icon,
        ports: node.ports,
      },
      form: node.form,
      fixedOutputs: node.fixedOutputs,
      createInitialConfig: () => structuredClone(node.initialConfig),
    } as unknown as NodeType
  })
}
