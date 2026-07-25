import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { conditionNode, startNode } from '@ai-workflow/core'

/**
 * 为指定应用创建一份本地演示文档。
 * appId 只用于描述归属，Workflow.id 始终单独生成。
 */
export function createDemoWorkflowDocument(appId: string): WorkflowEditorSnapshot {
  const workflowId = crypto.randomUUID()
  const startId = crypto.randomUUID()
  const codeId = crypto.randomUUID()
  const conditionId = crypto.randomUUID()
  const startOutputs = [
    {
      key: 'assetList',
      label: '资源列表',
      dataType: 'json' as const,
      description: '等待处理的资源对象数组',
    },
  ]

  return {
    workflow: {
      id: workflowId,
      name: '未命名工作流',
      description: `应用 ${appId} 的本地演示工作流`,
      nodes: [
        {
          id: startId,
          type: startNode.definition.type,
          inputs: {},
          outputs: startOutputs,
          config: {
            variables: startOutputs.map((output) => ({
              ...output,
              required: true,
            })),
          },
        },
        {
          id: codeId,
          type: 'code',
          inputs: {
            assetList: {
              type: 'reference',
              reference: {
                scope: 'node',
                nodeId: startId,
                outputKey: 'assetList',
                path: [],
              },
            },
          },
          outputs: [
            {
              key: 'assetId',
              label: '资源 ID',
              dataType: 'string',
            },
            {
              key: 'fileName',
              label: '文件名',
              dataType: 'string',
            },
            {
              key: 'fileExt',
              label: '文件扩展名',
              dataType: 'string',
            },
          ],
          config: {
            code: `async function main({ assetList }) {
  const asset = Array.isArray(assetList) ? assetList[0] : undefined

  if (!asset) {
    throw new Error('assetList 至少需要包含一个资源')
  }

  const fileName = String(asset.name ?? '')
  const extensionIndex = fileName.lastIndexOf('.')

  return {
    assetId: String(asset.id ?? ''),
    fileName,
    fileExt: extensionIndex >= 0 ? fileName.slice(extensionIndex + 1) : '',
  }
}

return main(inputs)`,
          },
        },
        {
          id: conditionId,
          type: conditionNode.definition.type,
          inputs: {
            codeResult: {
              type: 'reference',
              reference: {
                scope: 'node',
                nodeId: codeId,
                outputKey: 'assetId',
                path: [],
              },
            },
          },
          outputs: [],
          config: conditionNode.createInitialConfig(),
        },
      ],
      edges: [
        {
          id: crypto.randomUUID(),
          source: startId,
          sourceHandle: 'variables',
          target: codeId,
          targetHandle: 'input',
        },
        {
          id: crypto.randomUUID(),
          source: codeId,
          sourceHandle: 'result',
          target: conditionId,
          targetHandle: 'entry',
        },
      ],
      outputs: [],
    },
    layout: {
      positions: {
        [startId]: { x: 120, y: 180 },
        [codeId]: { x: 460, y: 180 },
        [conditionId]: { x: 800, y: 180 },
      },
    },
  }
}
