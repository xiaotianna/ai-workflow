import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { WorkflowEditorProvider } from '@/features/workflow/components/workflow-editor'
import { createEmptyWorkflowDocument } from '@/features/workflow/data'
import type { StudioAppListItem } from '@/features/studio'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { AppDetailOutletContext } from '.'

interface AppWorkflowEditorProps {
  app: StudioAppListItem
  disabled: boolean
}

function AppWorkflowEditor({ app, disabled }: AppWorkflowEditorProps) {
  const [snapshot, setSnapshot] = useState<WorkflowEditorSnapshot>(() =>
    createEmptyWorkflowDocument(app.id, {
      name: app.title,
      description: app.description,
    }),
  )

  return (
    <WorkflowEditorProvider
      applicationMetadata={{
        id: app.id,
        title: app.title,
        description: app.description,
        icon: app.icon,
      }}
      initialSnapshot={snapshot}
      disabled={disabled}
      onSave={setSnapshot}
    />
  )
}

function UnavailableWorkflowEditor() {
  const [snapshot, setSnapshot] = useState<WorkflowEditorSnapshot>(() =>
    createEmptyWorkflowDocument('unavailable'),
  )

  return <WorkflowEditorProvider initialSnapshot={snapshot} disabled onSave={setSnapshot} />
}

export default function AppWorkflowPage() {
  const { app, isResourceAvailable } = useOutletContext<AppDetailOutletContext>()

  if (!app) {
    return <UnavailableWorkflowEditor />
  }

  return <AppWorkflowEditor key={app.id} app={app} disabled={!isResourceAvailable} />
}
