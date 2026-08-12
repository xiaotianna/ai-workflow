import { ActionMenuContent } from '@/components/action-menu-content'
import type { StudioWorkflowVersionDto } from '@/api/studio'
import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

import {
  isPublishingVersion,
  useWorkflowVersionHistory,
  type WorkflowVersionHistoryPublishSync,
} from '../hooks/use-workflow-version-history'
import { DeleteWorkflowVersionDialog } from './delete-workflow-version-dialog'
import { WorkflowVersionNameDialog } from './workflow-version-name-dialog'

interface WorkflowVersionHistoryPanelProps {
  appId: string
  publishSync?: WorkflowVersionHistoryPublishSync
  selectedVersionId?: string
  onRestore: (versionId: string) => Promise<void>
  onSelectCurrentDraft: () => void
}

export function WorkflowVersionHistoryPanel({
  appId,
  publishSync,
  selectedVersionId,
  onRestore,
  onSelectCurrentDraft,
}: WorkflowVersionHistoryPanelProps) {
  const history = useWorkflowVersionHistory(appId, publishSync),
    [pendingVersionId, setPendingVersionId] = useState<string>(),
    [namingVersion, setNamingVersion] = useState<StudioWorkflowVersionDto>(),
    [deletingVersion, setDeletingVersion] = useState<StudioWorkflowVersionDto>(),
    draftSelected = !selectedVersionId,
    hasVersions = !history.loading && !history.loadError && history.versions.length > 0

  async function handleRestore(version: StudioWorkflowVersionDto) {
    if (pendingVersionId) return

    setPendingVersionId(version.id)
    try {
      await onRestore(version.id)
      showToast('success', `已恢复版本“${version.name ?? '未命名'}”`)
    } catch {
      showToast('error', '恢复版本失败')
    } finally {
      setPendingVersionId(undefined)
    }
  }

  async function handleRename(name: string) {
    if (!namingVersion) return

    await history.rename(namingVersion.id, name)
    showToast('success', '版本名称已保存')
  }

  async function handleDelete() {
    if (!deletingVersion || deletingVersion.id === selectedVersionId) return

    await history.remove(deletingVersion.id)
    showToast('success', '版本已删除')
  }

  return (
    <>
      <div className="px-4 py-4">
        <ol className="relative">
          {hasVersions ? (
            <div
              className="bg-border/70 pointer-events-none absolute top-[calc(0.5rem+0.625rem)] bottom-[calc(0.5rem+0.125rem+1rem+0.625rem)] left-[calc(0.5rem+9px)] w-0.5"
              aria-hidden
            />
          ) : null}
          <li>
            <button
              type="button"
              className={cn(
                'group/draft relative flex w-full gap-1 rounded-lg p-2 text-left transition-colors outline-none',
                draftSelected
                  ? 'bg-primary/10 cursor-not-allowed'
                  : 'hover:bg-muted/70 focus-visible:bg-muted/70 cursor-pointer',
              )}
              disabled={draftSelected || Boolean(pendingVersionId)}
              aria-current={draftSelected ? 'true' : undefined}
              onClick={onSelectCurrentDraft}
            >
              <VersionTimelineDot active={draftSelected} />
              <div className="flex min-w-0 grow flex-col gap-0.5 overflow-hidden">
                <div className="flex h-5 items-center gap-1">
                  <span
                    className={cn(
                      'truncate py-px text-[13px] leading-4 font-semibold',
                      draftSelected ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    当前草稿
                  </span>
                </div>
              </div>
            </button>
          </li>

          {history.loading ? (
            <li className="text-muted-foreground py-4 pl-[26px] text-xs leading-4" role="status">
              正在加载版本…
            </li>
          ) : history.loadError ? (
            <li className="flex items-center justify-between gap-3 py-3 pl-[26px]">
              <span className="text-muted-foreground text-xs leading-4">版本加载失败</span>
              <Button type="button" variant="secondary" size="sm" onClick={history.reload}>
                重试
              </Button>
            </li>
          ) : history.versions.length === 0 ? (
            <li className="text-muted-foreground py-4 pl-[26px] text-xs leading-4">暂无历史版本</li>
          ) : (
            history.versions.map((version, index) => {
              const selected = version.id === selectedVersionId,
                pending = version.id === pendingVersionId,
                publishing = isPublishingVersion(version.id)

              return (
                <li key={version.id}>
                  <div
                    className={cn(
                      'group/version relative flex gap-1 rounded-lg p-2 transition-colors',
                      selected
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/70 focus-within:bg-muted/70 has-[[data-state=open]]:bg-muted/70',
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        'flex min-w-0 grow cursor-pointer gap-1 rounded-lg text-left outline-none disabled:cursor-not-allowed',
                        selected && 'text-primary',
                      )}
                      aria-current={selected ? 'true' : undefined}
                      disabled={Boolean(pendingVersionId) || publishing}
                      onClick={() => void handleRestore(version)}
                    >
                      <VersionTimelineDot active={selected} />
                      <div className="flex min-w-0 grow flex-col gap-0.5 overflow-hidden">
                        <div className="mr-6 flex h-5 items-center gap-1">
                          <span
                            className={cn(
                              'truncate py-px text-[13px] leading-4 font-semibold',
                              selected ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {publishing
                              ? '发布中…'
                              : pending
                                ? '恢复中…'
                                : (version.name ?? '未命名')}
                          </span>
                          {index === 0 ? <LatestVersionBadge /> : null}
                        </div>
                        {!publishing ? (
                          <span className="text-muted-foreground truncate text-xs leading-4">
                            {formatVersionTime(version.createdAt)} ·{' '}
                            {version.createdBy?.username ?? '系统'}
                          </span>
                        ) : null}
                      </div>
                    </button>

                    {!publishing ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground data-[state=open]:bg-button-secondary-bg-active absolute top-2 right-2 shrink-0 opacity-0 group-focus-within/version:opacity-100 group-hover/version:opacity-100 data-[state=open]:opacity-100"
                            aria-label={`管理版本${version.name ?? '未命名'}`}
                            disabled={Boolean(pendingVersionId)}
                          >
                            <MoreHorizontal className="size-3.5" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <ActionMenuContent
                          sideOffset={4}
                          actions={[
                            {
                              id: 'restore',
                              label: '恢复',
                              disabled: Boolean(pendingVersionId),
                              onSelect: () => void handleRestore(version),
                            },
                            {
                              id: 'name',
                              label: '命名',
                              disabled: Boolean(pendingVersionId),
                              onSelect: () => setNamingVersion(version),
                            },
                            {
                              id: 'delete',
                              label: '删除',
                              destructive: true,
                              separatorBefore: true,
                              disabled: Boolean(pendingVersionId) || selected,
                              onSelect: () => setDeletingVersion(version),
                            },
                          ]}
                        />
                      </DropdownMenu>
                    ) : null}
                  </div>
                </li>
              )
            })
          )}
        </ol>
      </div>

      <WorkflowVersionNameDialog
        open={Boolean(namingVersion)}
        version={namingVersion}
        onOpenChange={(open) => {
          if (!open) setNamingVersion(undefined)
        }}
        onSubmit={handleRename}
      />

      <DeleteWorkflowVersionDialog
        open={Boolean(deletingVersion)}
        version={deletingVersion}
        onDelete={handleDelete}
        onOpenChange={(open) => {
          if (!open) setDeletingVersion(undefined)
        }}
      />
    </>
  )
}

function VersionTimelineDot({ active }: { active: boolean }) {
  return (
    <div
      className="relative z-1 flex h-5 w-[18px] shrink-0 items-center justify-center"
      aria-hidden
    >
      <div
        className={cn(
          'bg-background size-2 rounded-lg border-2',
          active ? 'border-primary' : 'border-muted-foreground/40',
        )}
      />
    </div>
  )
}

function LatestVersionBadge() {
  return (
    <span className="border-primary/40 bg-primary/5 text-primary flex h-5 shrink-0 items-center rounded-md border px-[5px] text-[10px] leading-3 font-medium">
      最新
    </span>
  )
}

function formatVersionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return `${date.getFullYear()}-${padVersionTime(date.getMonth() + 1)}-${padVersionTime(date.getDate())} ${padVersionTime(date.getHours())}:${padVersionTime(date.getMinutes())}`
}

function padVersionTime(number: number): string {
  return String(number).padStart(2, '0')
}
