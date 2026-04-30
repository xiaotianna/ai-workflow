import { useMemo, useState } from 'react'
import { nodes } from '@ai-workflow/core'
import { FormRender } from '@ai-workflow/form'
import { renderNode } from '@ai-workflow/nodes-ui'

function getInitialData(definition: (typeof nodes)[number]['definition']) {
  return Object.entries(definition.inputs).reduce<Record<string, unknown>>(
    (acc, [fieldKey, field]) => {
      if (field.default !== undefined) {
        acc[fieldKey] = field.default
      }
      return acc
    },
    {},
  )
}

export default function App() {
  const firstNode = nodes[0]
  const { definition } = firstNode

  const [nodeData, setNodeData] = useState<Record<string, unknown>>(() =>
    getInitialData(definition),
  )

  const nodeElement = useMemo(
    () =>
      renderNode({
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
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Node Preview</h2>
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
