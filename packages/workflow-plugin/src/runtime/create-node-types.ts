import {
  errorHandlingSchema,
  llmNodeSchema,
  resolveErrorHandlingPorts,
  type NodeType,
} from '@ai-workflow/core'

import { getPluginErrorHandlingFieldName } from '../contracts/error-handling'
import type { PluginManifest } from '../contracts/manifest'
import { compilePluginSchemaToZod } from '../schema/compiler'

export const PLUGIN_HOST_VERSION = '1.0.0'

/**
 * 将已经过 manifest 校验的插件节点编译成宿主 Core 可以注册的节点类型。
 * 普通端口保持静态；异常处理端口只通过宿主可信规则确定性派生。
 * 自定义 Remote UI 和插件执行由各宿主分别装载，不在此处执行第三方代码。
 */
export function createNodeTypesFromPluginManifest(manifest: PluginManifest): readonly NodeType[] {
  return manifest.nodes.map((node) => {
    const schema =
      node.execution.kind === 'host-llm'
        ? llmNodeSchema
        : compilePluginSchemaToZod(node.configSchema)
    const initialConfig = schema.parse(node.initialConfig)
    const errorHandlingFieldName = getPluginErrorHandlingFieldName(node.form)

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
      ...(node.ui.form.custom ? { configRenderer: node.type } : {}),
      fixedOutputs: node.fixedOutputs,
      createInitialConfig: () => structuredClone(initialConfig),
      ...(errorHandlingFieldName
        ? {
            resolvePorts: (config: Record<string, unknown>) =>
              resolveErrorHandlingPorts(
                node.ports,
                errorHandlingSchema.parse(config[errorHandlingFieldName]),
              ),
          }
        : {}),
    } as unknown as NodeType
  })
}
