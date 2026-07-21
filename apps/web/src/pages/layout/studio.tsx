import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import { createBuiltinNodeUIRegistry, RenderNode } from '@ai-workflow/nodes-ui'
import { useMemo, useState } from 'react'

// 注册node
const nodeUIRegistry = createBuiltinNodeUIRegistry(nodeRegistry)

export default function StudioPage() {
  const [node, setNode] = useState<WorkflowNode>()
  const nodeTypes = useMemo(() => nodeRegistry.list(), [])

  return (
    <div className="space-y-4 p-6">
      <select
        value={node?.type ?? ''}
        disabled={nodeTypes.length === 0}
        onChange={(event) => {
          const nextType = nodeRegistry.get(event.target.value)

          if (!nextType) {
            return
          }

          setNode({
            id: node?.id ?? 'demo-node-1',
            type: nextType.definition.type,
            config: nextType.createInitialConfig(),
          })
        }}
      >
        <option value="">{nodeTypes.length === 0 ? '暂无可用节点' : '请选择节点'}</option>

        {nodeTypes.map((nodeType) => (
          <option key={nodeType.definition.type} value={nodeType.definition.type}>
            {nodeType.definition.label}
          </option>
        ))}
      </select>

      {node && (
        <RenderNode
          node={node}
          nodeRegistry={nodeRegistry}
          uiRegistry={nodeUIRegistry}
          selected
          onSelect={(nodeId) => console.log('select', nodeId)}
          onDelete={(nodeId) => console.log('delete', nodeId)}
        />
      )}
    </div>
  )
}
