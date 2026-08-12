import {
  createAppApiKey,
  getAppApiOverview,
  listAppApiKeys,
  revokeAppApiKey,
  updateAppApiShare,
  type AppApiKeyDto,
  type AppApiOverviewDto,
  type CreatedAppApiKeyDto,
} from '@/api/app-api'
import { Button } from '@ai-workflow/ui/components/button'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'
import { RootProvider } from 'fumadocs-ui/provider/react-router'
import { Copy, KeyRound, LoaderCircle, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { ApiDocsAnchorNav, type ApiDocsAnchorItem } from './api-docs-anchor-nav'
import { ApiKeyDialog } from './api-key-dialog'
import { ApiShareDialog } from './api-share-dialog'
import { CreatedApiKeyDialog } from './created-api-key-dialog'
import { DeleteApiKeyDialog } from './delete-api-key-dialog'
import { OpenAPIPage } from './openapi-page'
import { WorkflowVersionTable } from './workflow-version-table'
import {
  APP_API_BASE_URL,
  createWorkflowOpenApiPageProps,
  workflowOpenApiDocument,
  workflowOpenApiOperations,
  type AppApiDocumentContract,
} from '../openapi-schema'

const AUTH_HEADER = 'Authorization: Bearer {API_KEY}',
  overviewAnchorItems: ApiDocsAnchorItem[] = [
    {
      id: 'workflow-应用-api',
      title: 'Workflow 应用 API',
      description: 'Workflow 应用适用于自动化处理、内容生成与数据编排等场景。',
    },
    {
      id: 'base-url',
      title: 'Base URL',
      description: '调用 Service API 时使用的服务器基础地址。',
    },
    {
      id: 'authentication',
      title: 'Authentication',
      description: '使用 API-Key 鉴权，在 Authorization 请求头中携带密钥。',
    },
    {
      id: 'published-versions',
      title: '可用版本',
      description: '查看指定版本执行接口可用的版本号和 versionId。',
    },
  ]

type WorkflowPath = keyof typeof workflowOpenApiDocument.paths

function getOperationMeta(path: string, method: string) {
  if (!(path in workflowOpenApiDocument.paths)) return undefined
  const pathItem = workflowOpenApiDocument.paths[path as WorkflowPath]
  if (!(method in pathItem)) return undefined
  return pathItem[method as keyof typeof pathItem] as
    { summary?: string; description?: string } | undefined
}

const operationAnchorItems: ApiDocsAnchorItem[] = workflowOpenApiOperations.map((item) => {
    const operation = getOperationMeta(item.path, item.method),
      title = operation?.summary ?? item.path,
      description = operation?.description ?? '查看该接口的请求与响应说明。'

    return {
      id: title,
      title,
      description,
    }
  }),
  apiDocsAnchorItems: ApiDocsAnchorItem[] = [...overviewAnchorItems, ...operationAnchorItems]

interface AppApiDocsProps {
  appId?: string
  isResourceAvailable: boolean
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="bg-muted text-foreground border-border rounded-md border px-1.5 py-0.5 font-mono text-[13px] leading-none">
      {children}
    </code>
  )
}

function OverviewCodeBlock({ children }: { children: string }) {
  return (
    <CodeBlock title="Code" className="my-0">
      <Pre>
        <code>
          <span className="line">{children}</span>
        </code>
      </Pre>
    </CodeBlock>
  )
}

async function copyApiServerUrl() {
  try {
    await navigator.clipboard.writeText(APP_API_BASE_URL)
    showToast('success', '已复制 API 服务器地址')
  } catch {
    showToast('error', '复制失败，请稍后重试')
  }
}

export function AppApiDocs({ appId, isResourceAvailable }: AppApiDocsProps) {
  const [overview, setOverview] = useState<AppApiOverviewDto>(),
    [keys, setKeys] = useState<AppApiKeyDto[]>([]),
    [createdKey, setCreatedKey] = useState<CreatedAppApiKeyDto>(),
    [keyPendingRevocationId, setKeyPendingRevocationId] = useState<string>(),
    [keysOpen, setKeysOpen] = useState(false),
    [shareOpen, setShareOpen] = useState(false),
    [loadingOverview, setLoadingOverview] = useState(false),
    [loadingKeys, setLoadingKeys] = useState(false),
    [creatingKey, setCreatingKey] = useState(false),
    [revokingKeyId, setRevokingKeyId] = useState<string>(),
    [savingShare, setSavingShare] = useState(false)

  useEffect(() => {
    if (!appId || !isResourceAvailable) {
      setOverview(undefined)
      return
    }

    const controller = new AbortController()
    setLoadingOverview(true)
    void getAppApiOverview(appId, controller.signal)
      .then(setOverview)
      .catch(() => {
        if (!controller.signal.aborted) setOverview(undefined)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingOverview(false)
      })
    return () => controller.abort()
  }, [appId, isResourceAvailable])

  async function openKeys() {
    if (!appId || !isResourceAvailable || loadingKeys) return
    setLoadingKeys(true)
    try {
      const result = await listAppApiKeys(appId)
      setKeys(result)
      setKeysOpen(true)
    } catch {
      // 请求错误由统一 API Client 提示。
    } finally {
      setLoadingKeys(false)
    }
  }

  async function createKey() {
    if (!appId || creatingKey) return
    setCreatingKey(true)
    try {
      const created = await createAppApiKey(appId)
      setKeys((current) => [created, ...current])
      setCreatedKey(created)
    } catch {
      // 请求错误由统一 API Client 提示。
    } finally {
      setCreatingKey(false)
    }
  }

  async function revokeKey(apiKeyId: string) {
    if (!appId || revokingKeyId) return
    setRevokingKeyId(apiKeyId)
    try {
      await revokeAppApiKey(appId, apiKeyId)
      setKeys((current) => current.filter((key) => key.id !== apiKeyId))
      setKeyPendingRevocationId(undefined)
      showToast('success', 'API 密钥已删除')
    } catch {
      // 请求错误由统一 API Client 提示。
    } finally {
      setRevokingKeyId(undefined)
    }
  }

  async function saveShare(enabled: boolean) {
    if (!appId || savingShare) return
    setSavingShare(true)
    try {
      const updated = await updateAppApiShare(appId, enabled)
      setOverview(updated)
      showToast('success', enabled ? 'API 文档分享已开启' : 'API 文档分享已关闭')
    } catch {
      // 请求错误由统一 API Client 提示。
    } finally {
      setSavingShare(false)
    }
  }

  const controlsDisabled = !isResourceAvailable || !overview || loadingOverview,
    keyPendingRevocation = keys.find((key) => key.id === keyPendingRevocationId)

  return (
    <section className="min-h-full">
      <ApiKeyDialog
        open={keysOpen}
        keys={keys}
        creating={creatingKey}
        revokingKeyId={revokingKeyId}
        onOpenChange={setKeysOpen}
        onCreate={() => void createKey()}
        onRevoke={setKeyPendingRevocationId}
      >
        <CreatedApiKeyDialog createdKey={createdKey} onClose={() => setCreatedKey(undefined)} />
        <DeleteApiKeyDialog
          apiKey={keyPendingRevocation}
          deleting={Boolean(revokingKeyId && revokingKeyId === keyPendingRevocationId)}
          onOpenChange={(nextOpen) => !nextOpen && setKeyPendingRevocationId(undefined)}
          onDelete={() => {
            if (keyPendingRevocationId) void revokeKey(keyPendingRevocationId)
          }}
        />
      </ApiKeyDialog>
      <ApiShareDialog
        open={shareOpen}
        overview={overview}
        saving={savingShare}
        onOpenChange={setShareOpen}
        onSave={(enabled) => void saveShare(enabled)}
      />

      <div className="border-border/50 bg-background sticky top-0 z-20 mb-6 flex h-12.5 flex-wrap items-center justify-end gap-2 border-b px-6">
        <div className="bg-input text-muted-foreground flex h-8 max-w-full items-center gap-2 rounded-lg px-2.5 text-sm">
          <span className="shrink-0 text-xs">API 服务器</span>
          <span className="text-foreground truncate font-medium">{APP_API_BASE_URL}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground -mr-1 shrink-0"
            aria-label="复制 API 服务器地址"
            disabled={!isResourceAvailable}
            onClick={() => void copyApiServerUrl()}
          >
            <Copy aria-hidden className="size-3.5" />
          </Button>
        </div>

        {loadingOverview ? (
          <span
            role="status"
            className="bg-muted text-muted-foreground inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium"
          >
            <LoaderCircle
              aria-hidden
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
            加载中
          </span>
        ) : overview?.status === 'RUNNING' ? (
          <span className="bg-success/10 text-success inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[13px] font-medium">
            运行中
          </span>
        ) : overview ? (
          <span className="bg-primary/10 text-primary inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[13px] font-medium">
            未发布
          </span>
        ) : (
          <span className="bg-muted text-muted-foreground inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[13px] font-medium">
            状态未知
          </span>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-foreground shrink-0"
          disabled={controlsDisabled}
          onClick={() => setShareOpen(true)}
        >
          <Share2 aria-hidden data-icon="inline-start" />
          分享
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-foreground shrink-0"
          disabled={controlsDisabled || loadingKeys}
          onClick={() => void openKeys()}
        >
          {loadingKeys ? (
            <LoaderCircle
              aria-hidden
              data-icon="inline-start"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <KeyRound aria-hidden data-icon="inline-start" />
          )}
          {loadingKeys ? '加载中...' : 'API 密钥'}
        </Button>
      </div>

      <AppApiReference contract={overview} />
    </section>
  )
}

export function AppApiReference({ contract }: { contract?: AppApiDocumentContract }) {
  const workflowOpenApiPageProps = useMemo(
    () => createWorkflowOpenApiPageProps(contract),
    [contract],
  )

  return (
    <div className="relative">
      <aside className="pointer-events-none absolute inset-y-0 left-3 z-10 hidden w-8 [overflow-anchor:none] lg:block">
        <div className="pointer-events-auto sticky top-1/2 w-fit -translate-y-1/2">
          <ApiDocsAnchorNav items={apiDocsAnchorItems} />
        </div>
      </aside>

      <div className="mx-auto max-w-5xl px-6 pb-10">
        <RootProvider search={{ enabled: false }} theme={{ enabled: false }}>
          <h2
            id="workflow-应用-api"
            className="text-foreground scroll-mt-28 text-xl font-semibold tracking-tight"
          >
            Workflow 应用 API
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Workflow 应用适用于自动化处理、内容生成与数据编排等场景。
          </p>

          <div className="mt-8 space-y-8">
            <section>
              <h3 id="base-url" className="mb-3 scroll-mt-28 text-base font-semibold">
                Base URL
              </h3>
              <OverviewCodeBlock>{APP_API_BASE_URL}</OverviewCodeBlock>
            </section>

            <section>
              <h3 id="authentication" className="mb-2 scroll-mt-28 text-base font-semibold">
                Authentication
              </h3>
              <p className="text-muted-foreground mb-3 text-sm leading-6">
                Service API 使用 <InlineCode>API-Key</InlineCode> 进行鉴权。所有 API 请求都应在{' '}
                <InlineCode>Authorization</InlineCode> HTTP Header 中包含您的{' '}
                <InlineCode>API-Key</InlineCode>，如下所示。API Key 与创建它的应用绑定，切换应用
                文档后必须使用对应应用的 Key：
              </p>
              <OverviewCodeBlock>{AUTH_HEADER}</OverviewCodeBlock>
            </section>

            <WorkflowVersionTable
              versions={contract?.versions ?? []}
              currentVersionId={contract?.currentVersionId}
            />
          </div>

          <div className="app-api-openapi mt-8 space-y-6">
            <h3 className="not-prose text-base font-semibold">API 接口</h3>
            <div className="prose max-w-none min-w-0">
              <OpenAPIPage {...workflowOpenApiPageProps} />
            </div>
          </div>
        </RootProvider>
      </div>
    </div>
  )
}
