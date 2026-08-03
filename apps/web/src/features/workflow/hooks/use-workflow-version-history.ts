import {
  deleteStudioWorkflowVersion,
  listStudioWorkflowVersions,
  renameStudioWorkflowVersion,
  type StudioWorkflowVersionDto,
} from '@/api/studio'
import { useEffect, useState } from 'react'

export function useWorkflowVersionHistory(appId: string) {
  const [versions, setVersions] = useState<StudioWorkflowVersionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)

    void listStudioWorkflowVersions(appId, controller.signal)
      .then((result) => setVersions(result.items))
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [appId, reloadKey])

  async function rename(versionId: string, name: string) {
    const renamed = await renameStudioWorkflowVersion(appId, versionId, { name })
    setVersions((currentVersions) =>
      currentVersions.map((version) => (version.id === renamed.id ? renamed : version)),
    )
    return renamed
  }

  async function remove(versionId: string) {
    await deleteStudioWorkflowVersion(appId, versionId)
    setVersions((currentVersions) => currentVersions.filter((version) => version.id !== versionId))
  }

  return {
    versions,
    loading,
    loadError,
    reload: () => setReloadKey((currentKey) => currentKey + 1),
    remove,
    rename,
  }
}
