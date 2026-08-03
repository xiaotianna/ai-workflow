import {
  getStudioWorkflowDraft,
  restoreStudioWorkflowVersion,
  saveStudioWorkflowDraft,
  type StudioWorkflowDraftDto,
} from '@/api/studio'
import type { WorkflowEditorSnapshot } from '@/components/workflow/types'
import { WorkflowEditorProvider } from '@/features/workflow/components/workflow-editor'
import { createEmptyWorkflowDocument } from '@/features/workflow/data'
import { useWorkflowPublish } from '@/features/workflow/hooks/use-workflow-publish'
import { useWorkflowTestRun } from '@/features/workflow/hooks/use-workflow-test-run'
import type { StudioAppListItem } from '@/features/studio'
import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { AppDetailOutletContext } from '.'

interface AppWorkflowEditorProps {
  app: StudioAppListItem
  disabled: boolean
}

type WorkflowDraftState =
  | {
      appId: string
      status: 'loading' | 'error'
    }
  | {
      appId: string
      status: 'success'
      draft: StudioWorkflowDraftDto
    }

function AppWorkflowEditor({ app, disabled }: AppWorkflowEditorProps) {
  const [draftState, setDraftState] = useState<WorkflowDraftState>({
    appId: app.id,
    status: 'loading',
  })
  const [selectedVersionId, setSelectedVersionId] = useState<string>()
  const revisionRef = useRef<number | undefined>(undefined)
  const workflowPublish = useWorkflowPublish(app.id)
  const testRun = useWorkflowTestRun(app.id)
  const draft =
    draftState.appId === app.id && draftState.status === 'success' ? draftState.draft : undefined

  useEffect(() => {
    const controller = new AbortController()
    revisionRef.current = undefined
    setSelectedVersionId(undefined)
    setDraftState({
      appId: app.id,
      status: 'loading',
    })

    void getStudioWorkflowDraft(app.id, controller.signal)
      .then((loadedDraft) => {
        revisionRef.current = loadedDraft.revision
        setDraftState({
          appId: app.id,
          status: 'success',
          draft: loadedDraft,
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDraftState({
            appId: app.id,
            status: 'error',
          })
        }
      })

    return () => controller.abort()
  }, [app.id])

  if (!draft) {
    return <UnavailableWorkflowEditor workflowId={app.id} />
  }

  async function handleSave(snapshot: WorkflowEditorSnapshot) {
    const revision = revisionRef.current
    if (revision === undefined) {
      throw new Error('工作流草稿尚未加载完成')
    }

    const savedDraft = await saveStudioWorkflowDraft(app.id, {
      revision,
      definition: snapshot.workflow,
      layout: snapshot.layout,
    })
    revisionRef.current = savedDraft.revision
  }

  async function handleRestoreVersion(versionId: string) {
    const restoredDraft = await restoreStudioWorkflowVersion(app.id, versionId)
    revisionRef.current = restoredDraft.revision
    setSelectedVersionId(versionId)
    setDraftState({
      appId: app.id,
      status: 'success',
      draft: restoredDraft,
    })
  }

  return (
    <WorkflowEditorProvider
      key={`${app.id}:${draft.revision}`}
      applicationMetadata={{
        id: app.id,
        title: app.title,
        description: app.description,
        icon: app.icon,
      }}
      initialSnapshot={{
        workflow: draft.definition,
        layout: draft.layout,
      }}
      initialSavedAt={new Date(draft.updatedAt)}
      disabled={disabled}
      onSave={handleSave}
      onPauseTestRun={testRun.pause}
      onPublish={workflowPublish.publish}
      onRestoreVersion={handleRestoreVersion}
      onSelectedVersionChange={setSelectedVersionId}
      onTestRun={testRun.run}
      publishedAt={workflowPublish.deployment?.publishedAt}
      publishLoadError={workflowPublish.loadError}
      publishLoading={workflowPublish.loading}
      publishPending={workflowPublish.pending}
      selectedVersionId={selectedVersionId}
      testRunCanPause={testRun.canPause}
      testRunPausing={testRun.pausing}
      testRunPending={testRun.pending}
      testRunResult={testRun.result}
      nodeExecutionStatuses={testRun.nodeExecutionStatuses}
    />
  )
}

function UnavailableWorkflowEditor({ workflowId = 'unavailable' }: { workflowId?: string }) {
  const [snapshot, setSnapshot] = useState<WorkflowEditorSnapshot>(() =>
    createEmptyWorkflowDocument(workflowId),
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
