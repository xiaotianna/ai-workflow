import { ActionMenuContent } from '@/components/action-menu-content'
import type { StudioWorkflowVersionDto } from '@/api/studio'
import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import { Circle, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

import { useWorkflowVersionHistory } from '../hooks/use-workflow-version-history'
import { DeleteWorkflowVersionDialog } from './delete-workflow-version-dialog'
import { WorkflowVersionNameDialog } from './workflow-version-name-dialog'

interface WorkflowVersionHistoryPanelProps {
  appId: string
  selectedVersionId?: string
  onRestore: (versionId: string) => Promise<void>
  onSelectCurrentDraft: () => void
}

export function WorkflowVersionHistoryPanel({
  appId,
  selectedVersionId,
  onRestore,
  onSelectCurrentDraft,
}: WorkflowVersionHistoryPanelProps) {
  const history = useWorkflowVersionHistory(appId)
  const [pendingVersionId, setPendingVersionId] = useState<string>()
  const [namingVersion, setNamingVersion] = useState<StudioWorkflowVersionDto>()
  const [deletingVersion, setDeletingVersion] = useState<StudioWorkflowVersionDto>()

  async function handleRestore(version: StudioWorkflowVersionDto) {
    if (pendingVersionId) return

    setPendingVersionId(version.id)
    try {
      await onRestore(version.id)
      showToast('success', `已恢复版本“${version.name ?? '未命名'}”`)
    } catch {
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
        <ol className="border-border/70 relative ml-2 border-l">
          <li className="relative pb-2 pl-5">
            <Circle
              className={cn(
                'bg-background absolute top-4 -left-2 size-4 stroke-[3]',
                selectedVersionId ? 'text-muted-foreground/60' : 'text-primary',
              )}
              aria-hidden
            />
            <button
              type="button"
              className={cn(
                'focus-visible:bg-muted/70 flex min-h-12 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold transition-colors outline-none',
                selectedVersionId
                  ? 'text-foreground hover:bg-muted/70'
                  : 'bg-primary/10 text-primary',
              )}
              disabled={Boolean(pendingVersionId)}
              onClick={onSelectCurrentDraft}
            >
              当前草稿
            </button>
          </li>

          {history.loading ? (
            <li className="text-muted-foreground py-6 pl-5 text-sm" role="status">
              正在加载版本…
            </li>
          ) : history.loadError ? (
            <li className="flex items-center justify-between gap-3 py-4 pl-5">
              <span className="text-muted-foreground text-sm">版本加载失败</span>
              <Button type="button" variant="secondary" size="sm" onClick={history.reload}>
                重试
              </Button>
            </li>
          ) : history.versions.length === 0 ? (
            <li className="text-muted-foreground py-6 pl-5 text-sm">暂无历史版本</li>
          ) : (
            history.versions.map((version, index) => {
              const selected = version.id === selectedVersionId
              const pending = version.id === pendingVersionId

              return (
                <li key={version.id} className="group/version relative pb-2 pl-5">
                  <Circle
                    className={cn(
                      'bg-background absolute top-5 -left-2 size-4 stroke-[3]',
                      selected ? 'text-primary' : 'text-muted-foreground/60',
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      'flex min-h-20 items-start rounded-xl transition-colors',
                      selected ? 'bg-primary/10' : 'hover:bg-muted/70 focus-within:bg-muted/70',
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        'min-w-0 flex-1 cursor-pointer px-3 py-3 text-left outline-none',
                        selected && 'text-primary',
                      )}
                      aria-current={selected ? 'true' : undefined}
                      disabled={Boolean(pendingVersionId)}
                      onClick={() => void handleRestore(version)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm leading-5 font-semibold">
                          {pending ? '恢复中…' : (version.name ?? '未命名')}
                        </span>
                        {index === 0 ? (
                          <span className="border-primary text-primary shrink-0 rounded-md border px-1.5 py-0.5 text-xs leading-4 font-medium">
                            最新
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground mt-1 block truncate text-xs leading-5">
                        {formatVersionTime(version.createdAt)} ·{' '}
                        {version.createdBy?.username ?? '系统'}
                      </span>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground data-[state=open]:bg-button-secondary-bg-active mt-2 mr-2 shrink-0 opacity-0 group-focus-within/version:opacity-100 group-hover/version:opacity-100 data-[state=open]:opacity-100"
                          aria-label={`管理版本${version.name ?? '未命名'}`}
                          disabled={Boolean(pendingVersionId)}
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
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

function formatVersionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return `${date.getFullYear()}-${padVersionTime(date.getMonth() + 1)}-${padVersionTime(date.getDate())} ${padVersionTime(date.getHours())}:${padVersionTime(date.getMinutes())}`
}

function padVersionTime(number: number): string {
  return String(number).padStart(2, '0')
}
