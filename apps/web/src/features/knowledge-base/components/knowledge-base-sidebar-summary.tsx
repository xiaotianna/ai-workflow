import {
  createKnowledgeApiKey,
  getKnowledgeApiOverview,
  getKnowledgeBaseStatistics,
  listKnowledgeApiKeys,
  revokeKnowledgeApiKey,
  updateKnowledgeApiAccess,
  type CreatedKnowledgeApiKeyDto,
  type KnowledgeApiKeyDto,
  type KnowledgeBaseStatisticsDto,
} from '@/api/knowledge-bases'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ai-workflow/ui/components/dropdown-menu'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { Switch } from '@ai-workflow/ui/components/switch'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { BookOpenText, ExternalLink, Info, KeyRound, Network } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { KnowledgeApiKeyDialog } from './knowledge-api-key-dialog'

interface KnowledgeBaseSidebarSummaryProps {
  knowledgeBaseId?: string
}

type StatisticsState =
  | { knowledgeBaseId: string | undefined; status: 'loading' | 'error' }
  | {
      knowledgeBaseId: string
      status: 'success'
      statistics: KnowledgeBaseStatisticsDto
    }

type ApiAccessState =
  | { knowledgeBaseId: string | undefined; status: 'loading' | 'error' }
  | { knowledgeBaseId: string; status: 'success'; enabled: boolean }

function SidebarMetric({
  value,
  label,
  loading,
}: {
  value?: number
  label: string
  loading: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-md px-1.5 py-0.5">
      {loading ? (
        <Skeleton className="mb-0.5 h-4 w-5" role="status" aria-label={`${label}统计加载中`} />
      ) : (
        <span className="text-foreground text-sm leading-4 font-semibold">{value ?? '—'}</span>
      )}
      <span className="text-muted-foreground flex min-w-0 items-center gap-0.5 text-[10px] leading-3 font-medium">
        <span className="truncate">{label}</span>
        {label === '个关联应用' ? (
          <Info
            role="img"
            aria-label="统计草稿或历史版本中引用此知识库的应用数量"
            className="size-3 shrink-0"
          />
        ) : undefined}
      </span>
    </div>
  )
}

export function KnowledgeBaseSidebarSummary({ knowledgeBaseId }: KnowledgeBaseSidebarSummaryProps) {
  const [statisticsState, setStatisticsState] = useState<StatisticsState>({
      knowledgeBaseId,
      status: 'loading',
    }),
    [apiAccessState, setApiAccessState] = useState<ApiAccessState>({
      knowledgeBaseId,
      status: 'loading',
    }),
    [updatingAccess, setUpdatingAccess] = useState(false),
    [keyDialogOpen, setKeyDialogOpen] = useState(false),
    [keysLoading, setKeysLoading] = useState(false),
    [keys, setKeys] = useState<KnowledgeApiKeyDto[]>([]),
    [creatingKey, setCreatingKey] = useState(false),
    [createdKey, setCreatedKey] = useState<CreatedKnowledgeApiKeyDto>(),
    [revokeTarget, setRevokeTarget] = useState<KnowledgeApiKeyDto>(),
    [revokingKeyId, setRevokingKeyId] = useState<string>()

  useEffect(() => {
    if (!knowledgeBaseId) {
      setStatisticsState({ knowledgeBaseId, status: 'loading' })
      return
    }

    const controller = new AbortController()
    setStatisticsState({ knowledgeBaseId, status: 'loading' })
    void getKnowledgeBaseStatistics(knowledgeBaseId, controller.signal)
      .then((statistics) => {
        setStatisticsState({ knowledgeBaseId, status: 'success', statistics })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatisticsState({ knowledgeBaseId, status: 'error' })
        }
      })

    return () => controller.abort()
  }, [knowledgeBaseId])

  useEffect(() => {
    if (!knowledgeBaseId) {
      setApiAccessState({ knowledgeBaseId, status: 'loading' })
      return
    }

    const controller = new AbortController()
    setApiAccessState({ knowledgeBaseId, status: 'loading' })
    void getKnowledgeApiOverview(knowledgeBaseId, controller.signal)
      .then(({ enabled }) => {
        setApiAccessState({ knowledgeBaseId, status: 'success', enabled })
      })
      .catch(() => {
        if (!controller.signal.aborted) setApiAccessState({ knowledgeBaseId, status: 'error' })
      })

    return () => controller.abort()
  }, [knowledgeBaseId])

  const isCurrentStatistics = statisticsState.knowledgeBaseId === knowledgeBaseId,
    statistics =
      isCurrentStatistics && statisticsState.status === 'success'
        ? statisticsState.statistics
        : undefined,
    loading = !isCurrentStatistics || statisticsState.status === 'loading',
    isCurrentAccess = apiAccessState.knowledgeBaseId === knowledgeBaseId,
    apiEnabled =
      isCurrentAccess && apiAccessState.status === 'success' ? apiAccessState.enabled : false,
    apiAccessLoading = !isCurrentAccess || apiAccessState.status === 'loading'

  async function toggleApiAccess(enabled: boolean) {
    if (!knowledgeBaseId || updatingAccess) return
    setUpdatingAccess(true)
    try {
      const overview = await updateKnowledgeApiAccess(knowledgeBaseId, enabled)
      setApiAccessState({ knowledgeBaseId, status: 'success', enabled: overview.enabled })
      showToast('success', overview.enabled ? '知识库 API 已启用' : '知识库 API 已关闭')
    } catch {
      // 请求层已展示错误，保留服务端返回前的状态。
    } finally {
      setUpdatingAccess(false)
    }
  }

  async function openKeyDialog() {
    if (!knowledgeBaseId) return
    setKeyDialogOpen(true)
    setKeysLoading(true)
    try {
      setKeys(await listKnowledgeApiKeys(knowledgeBaseId))
    } catch {
      // 请求层已展示错误，弹窗保留以便重试。
    } finally {
      setKeysLoading(false)
    }
  }

  async function createKey() {
    if (!knowledgeBaseId || creatingKey) return
    setCreatingKey(true)
    try {
      const key = await createKnowledgeApiKey(knowledgeBaseId)
      setKeys((current) => [key, ...current])
      setCreatedKey(key)
    } catch {
      // 请求层已展示错误。
    } finally {
      setCreatingKey(false)
    }
  }

  async function revokeKey() {
    if (!knowledgeBaseId || !revokeTarget || revokingKeyId) return
    setRevokingKeyId(revokeTarget.id)
    try {
      await revokeKnowledgeApiKey(knowledgeBaseId, revokeTarget.id)
      setKeys((current) => current.filter((key) => key.id !== revokeTarget.id))
      setRevokeTarget(undefined)
      showToast('success', 'API 密钥已删除')
    } catch {
      // 请求层已展示错误。
    } finally {
      setRevokingKeyId(undefined)
    }
  }

  return (
    <div className="px-2.5 pb-2">
      <div className="flex items-start py-1.5" aria-label="知识库统计">
        <SidebarMetric value={statistics?.documentCount} label="文档" loading={loading} />
        <div className="flex h-9 w-4 shrink-0 items-center justify-center" aria-hidden>
          <div className="bg-border h-6 w-px rotate-[15deg]" />
        </div>
        <SidebarMetric value={statistics?.relatedAppCount} label="个关联应用" loading={loading} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!knowledgeBaseId}>
          <button
            type="button"
            className="border-border/70 hover:bg-muted focus-visible:bg-muted aria-expanded:bg-muted text-foreground flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border bg-transparent px-2.5 text-left text-[13px] font-medium outline-hidden transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="访问知识库 API"
            disabled={!knowledgeBaseId}
          >
            <Network aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">访问 API</span>
            <span
              className={
                apiEnabled
                  ? 'border-success/40 bg-success/40 size-2 shrink-0 rounded-[3px] border shadow-xs'
                  : 'border-muted-foreground/30 bg-muted-foreground/30 size-2 shrink-0 rounded-[3px] border shadow-xs'
              }
              role="status"
              aria-label={apiEnabled ? 'API 已启用' : 'API 未启用'}
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-(--radix-dropdown-menu-trigger-width) overflow-hidden p-0"
        >
          <div className="space-y-1.5 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div
                className={`flex items-center gap-1.5 text-[13px] font-semibold ${apiEnabled ? 'text-success' : 'text-muted-foreground'}`}
                role="status"
              >
                <span
                  className={
                    apiEnabled
                      ? 'border-success/40 bg-success/40 size-2 rounded-[3px] border shadow-xs'
                      : 'border-muted-foreground/30 bg-muted-foreground/30 size-2 rounded-[3px] border shadow-xs'
                  }
                  aria-hidden
                />
                <span>{apiAccessLoading ? '读取中' : apiEnabled ? '已启用' : '未启用'}</span>
              </div>
              <Switch
                size="sm"
                checked={apiEnabled}
                disabled={!knowledgeBaseId || apiAccessLoading || updatingAccess}
                aria-label={apiEnabled ? '关闭知识库 API' : '启用知识库 API'}
                onCheckedChange={(checked) => void toggleApiAccess(checked)}
              />
            </div>
            <p className="text-muted-foreground text-xs leading-4">
              {apiEnabled ? '此知识库可通过服务 API 访问' : '启用后可使用 API 密钥检索此知识库'}
            </p>
          </div>

          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem
            className="rounded-none px-3 py-2 text-[13px]"
            onSelect={() => void openKeyDialog()}
          >
            <KeyRound aria-hidden className="size-3.5" />
            <span className="min-w-0 flex-1 truncate">管理 API 密钥</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-none px-3 py-2 text-[13px]">
            <Link to="/docs/ai-workflow/rag-api" target="_blank" rel="noreferrer">
              <BookOpenText aria-hidden className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">查阅 API 文档</span>
              <ExternalLink aria-hidden className="text-muted-foreground size-3.5" />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <KnowledgeApiKeyDialog
        open={keyDialogOpen}
        loading={keysLoading}
        keys={keys}
        creating={creatingKey}
        revokingKeyId={revokingKeyId}
        revokeTarget={revokeTarget}
        createdKey={createdKey}
        onOpenChange={setKeyDialogOpen}
        onCreate={() => void createKey()}
        onRequestRevoke={setRevokeTarget}
        onRevoke={() => void revokeKey()}
        onCreatedKeyClose={() => setCreatedKey(undefined)}
      />
    </div>
  )
}
