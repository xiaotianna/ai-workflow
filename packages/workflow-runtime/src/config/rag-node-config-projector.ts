import { ragNodeSchema } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { parseJsonObject } from '../utils/json-value'
import type { RuntimeNodeConfigProjector } from './runtime-node-config-resolver'
import { projectVariableTemplate } from './variable-template-projector'

export const projectRagNodeConfig: RuntimeNodeConfigProjector = (node, context) => {
  const parsed = ragNodeSchema.safeParse(node.config)
  if (!parsed.success) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG,
      `知识库节点 ${node.id} 的配置无效`,
      {
        nodeId: node.id,
        issues: parsed.error.issues.map((issue) => issue.message),
      },
    )
  }

  return parseJsonObject(
    {
      ...parsed.data,
      query: projectVariableTemplate(
        node.id,
        parsed.data.query,
        context,
        `知识库节点 ${node.id} 的检索内容变量格式无效`,
      ),
    },
    `node.${node.id}.resolvedConfig`,
  )
}
