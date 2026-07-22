import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { WorkflowEditor } from '@/features/workflow/components/workflow-editor'
import { createDemoWorkflowDocument } from '@/features/workflow/data'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

interface WorkflowPageSessionProps {
  appId: string
}

/** 为一个 appId 建立独立的页面级编辑会话。 */
function WorkflowPageSession({ appId }: WorkflowPageSessionProps) {
  const [snapshot, setSnapshot] = useState<WorkflowEditorSnapshot>(() =>
    createDemoWorkflowDocument(appId),
  )

  return <WorkflowEditor initialSnapshot={snapshot} onSave={setSnapshot} />
}

/** 读取路由 appId，并在缺少参数时提供可诊断错误。 */
export default function AppWorkflowPage() {
  const { id: appId } = useParams<{ id: string }>()

  if (!appId) {
    return (
      <div className="text-destructive p-6 text-sm" role="alert">
        缺少应用 ID
      </div>
    )
  }

  return <WorkflowPageSession key={appId} appId={appId} />
}
