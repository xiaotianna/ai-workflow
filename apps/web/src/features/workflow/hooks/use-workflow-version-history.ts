import {
  deleteStudioWorkflowVersion,
  listStudioWorkflowVersions,
  renameStudioWorkflowVersion,
  type StudioWorkflowVersionDto,
} from '@/api/studio'
import { getAuthUser } from '@/features/auth/session'
import { useEffect, useRef, useState } from 'react'

export const PUBLISHING_VERSION_ID = '__publishing__'

export interface WorkflowVersionHistoryPublishSync {
  pending?: boolean
  publishedAt?: string
  version?: number
  versionId?: string
}

export function isPublishingVersion(versionId: string) {
  return versionId === PUBLISHING_VERSION_ID
}

export function useWorkflowVersionHistory(
  appId: string,
  publishSync?: WorkflowVersionHistoryPublishSync,
) {
  const [versions, setVersions] = useState<StudioWorkflowVersionDto[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [reloadKey, setReloadKey] = useState(0),
    publishSessionRef = useRef<{ active: boolean; baselineVersionId?: string }>({
      active: false,
    })

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)

    void listStudioWorkflowVersions(appId, controller.signal)
      .then((result) => {
        setVersions((currentVersions) => mergeFetchedVersions(result.items, currentVersions))
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [appId, reloadKey])

  useEffect(() => {
    const pending = publishSync?.pending ?? false,
      versionId = publishSync?.versionId,
      version = publishSync?.version,
      publishedAt = publishSync?.publishedAt

    if (pending) {
      if (!publishSessionRef.current.active) {
        publishSessionRef.current = { active: true, baselineVersionId: versionId }
      }

      setVersions((currentVersions) => {
        if (currentVersions.some((item) => item.id === PUBLISHING_VERSION_ID)) {
          return currentVersions
        }

        return [createOptimisticPublishedVersion(currentVersions), ...currentVersions]
      })
      return
    }

    if (!publishSessionRef.current.active) {
      return
    }

    const baselineVersionId = publishSessionRef.current.baselineVersionId
    publishSessionRef.current.active = false

    setVersions((currentVersions) => {
      const withoutPublishing = currentVersions.filter((item) => item.id !== PUBLISHING_VERSION_ID)

      if (versionId && versionId !== baselineVersionId) {
        if (withoutPublishing.some((item) => item.id === versionId)) {
          return withoutPublishing
        }

        return [
          createPublishedVersionFromDeployment({
            versionId,
            version,
            publishedAt,
            fallbackVersions: withoutPublishing,
          }),
          ...withoutPublishing,
        ]
      }

      return withoutPublishing
    })
  }, [publishSync?.pending, publishSync?.publishedAt, publishSync?.version, publishSync?.versionId])

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

function createOptimisticPublishedVersion(
  currentVersions: readonly StudioWorkflowVersionDto[],
): StudioWorkflowVersionDto {
  const authUser = getAuthUser()

  return {
    id: PUBLISHING_VERSION_ID,
    version: getNextWorkflowVersionNumber(currentVersions),
    createdAt: new Date().toISOString(),
    createdBy: authUser ? { id: '', username: authUser.username } : undefined,
  }
}

function createPublishedVersionFromDeployment({
  versionId,
  version,
  publishedAt,
  fallbackVersions,
}: {
  versionId: string
  version?: number
  publishedAt?: string
  fallbackVersions: readonly StudioWorkflowVersionDto[]
}): StudioWorkflowVersionDto {
  const authUser = getAuthUser()

  return {
    id: versionId,
    version: version ?? getNextWorkflowVersionNumber(fallbackVersions),
    createdAt: publishedAt ?? new Date().toISOString(),
    createdBy: authUser ? { id: '', username: authUser.username } : undefined,
  }
}

function getNextWorkflowVersionNumber(versions: readonly StudioWorkflowVersionDto[]): number {
  return versions.reduce((maxVersion, item) => Math.max(maxVersion, item.version), 0) + 1
}

function mergeFetchedVersions(
  fetchedVersions: readonly StudioWorkflowVersionDto[],
  currentVersions: readonly StudioWorkflowVersionDto[],
): StudioWorkflowVersionDto[] {
  const publishingVersion = currentVersions.find((item) => item.id === PUBLISHING_VERSION_ID)
  if (!publishingVersion) {
    return [...fetchedVersions]
  }

  return [publishingVersion, ...fetchedVersions.filter((item) => item.id !== PUBLISHING_VERSION_ID)]
}
