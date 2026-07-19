import { useEffect, useMemo, useState } from 'react'
import { nodes } from '@ai-workflow/core'
import { FormRender } from '@ai-workflow/form'
import { RenderNode } from '@ai-workflow/nodes-ui'

export default function App() {
  const [selectedNodeType, setSelectedNodeType] = useState<string>(
    () => nodes[0]?.definition.type ?? '',
  )

  const selectedNode = useMemo(
    () => nodes.find((node) => node.definition.type === selectedNodeType) ?? nodes[0],
    [selectedNodeType],
  )

  const { definition } = selectedNode

  const [nodeData, setNodeData] = useState<Record<string, unknown>>(() =>
    selectedNode.createInitialConfig(),
  )

  useEffect(() => {
    setNodeData(selectedNode.createInitialConfig())
  }, [selectedNode])

  const nodeElement = useMemo(
    () =>
      RenderNode({
        id: 'demo-node-1',
        type: definition.type,
        definition,
        data: nodeData,
        onChange: (next) => setNodeData(next as Record<string, unknown>),
      }),
    [definition, nodeData],
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Node Preview</h2>
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={definition.type}
              onChange={(event) => setSelectedNodeType(event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node.definition.type} value={node.definition.type}>
                  {node.definition.label}
                </option>
              ))}
            </select>
          </div>
          {nodeElement}
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Node Config</h2>
          <FormRender definition={definition} value={nodeData} onChange={setNodeData} />
        </section>
      </div>
    </div>
  )
}
