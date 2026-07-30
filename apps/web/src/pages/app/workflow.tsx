import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { WorkflowEditorProvider } from '@/features/workflow/components/workflow-editor'
import { createEmptyWorkflowDocument } from '@/features/workflow/data'
import { useState } from 'react'

export default function AppWorkflowPage() {
  // const { id: appId } = useParams<{ id: string }>()

  // if (!appId) {
  //   return (
  //     <div className="text-destructive p-6 text-sm" role="alert">
  //       缺少应用 ID
  //     </div>
  //   )
  // }

  const [snapshot, setSnapshot] = useState<WorkflowEditorSnapshot>(() =>
    createEmptyWorkflowDocument('appId'),
  )

  return <WorkflowEditorProvider initialSnapshot={snapshot} onSave={setSnapshot} />
}
