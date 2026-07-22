import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas'
import { WorkflowConfigPanel } from '@/components/workflow/workflow-config-panel'
import { Button } from '@ai-workflow/ui/components/button'
import { ReactFlowProvider } from '@xyflow/react'
import { useWorkflowEditor } from '../hooks/use-workflow-editor'

interface WorkflowEditorProps {
  initialSnapshot: WorkflowEditorSnapshot
  onSave: (document: WorkflowEditorSnapshot) => void | Promise<void>
}

/** 在 ReactFlowProvider 内消费编辑会话 Hook，并组合各展示区域。 */
function WorkflowEditorSession({ initialSnapshot, onSave }: WorkflowEditorProps) {
  const editor = useWorkflowEditor({ initialSnapshot, onSave })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border flex shrink-0 items-center justify-between gap-3 border-b p-3">
        <div className="flex flex-wrap items-center gap-2">
          {editor.availableNodeTypes.map((nodeType) => (
            <Button
              key={nodeType.definition.type}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => editor.addNode(nodeType.definition.type)}
            >
              添加{nodeType.definition.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs" role="status">
            {editor.dirty ? '有未保存修改' : '已保存'}
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!editor.selectedNodeId}
            onClick={editor.deleteSelectedNode}
          >
            删除节点
          </Button>
          <Button
            type="button"
            variant="confirm"
            size="sm"
            disabled={!editor.dirty || editor.saving}
            onClick={editor.saveWorkflow}
          >
            {editor.saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </header>

      {editor.errors.length > 0 ? (
        <ul
          className="text-destructive border-border shrink-0 border-b px-4 py-2 text-sm"
          role="alert"
        >
          {editor.errors.map((error, index) => (
            <li key={`${error}-${index}`}>{error}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <WorkflowCanvas
            nodes={editor.nodes}
            edges={editor.edges}
            initialViewport={editor.initialViewport}
            onNodesChange={editor.handleNodesChange}
            onEdgesChange={editor.handleEdgesChange}
            onConnect={editor.handleConnect}
            isValidConnection={editor.isValidConnection}
            onNodesDelete={editor.handleNodesDelete}
            onSelectedNodeChange={editor.selectNode}
            onViewportChange={editor.handleViewportChange}
          />
        </div>

        <aside className="border-border bg-background w-80 shrink-0 overflow-y-auto border-l p-4">
          <WorkflowConfigPanel node={editor.selectedNode} onApply={editor.applyNodeConfig} />
        </aside>
      </div>
    </div>
  )
}

/** 为编辑会话提供 React Flow 上下文。 */
export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorSession {...props} />
    </ReactFlowProvider>
  )
}
