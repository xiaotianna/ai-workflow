import { Button } from '@ai-workflow/ui/components/button'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'
import { RootProvider } from 'fumadocs-ui/provider/react-router'
import { Copy, KeyRound } from 'lucide-react'
import type { ReactNode } from 'react'

import { ApiDocsAnchorNav, type ApiDocsAnchorItem } from './api-docs-anchor-nav'
import { OpenAPIPage } from './openapi-page'
import {
  workflowOpenApiDocument,
  workflowOpenApiOperations,
  workflowOpenApiPageProps,
} from '../openapi-schema'

const API_BASE_URL = workflowOpenApiDocument.servers[0]?.url ?? 'https://api.example.com/v1'
const AUTH_HEADER = 'Authorization: Bearer {API_KEY}'

const overviewAnchorItems: ApiDocsAnchorItem[] = [
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
]

type WorkflowPath = keyof typeof workflowOpenApiDocument.paths

function getOperationMeta(path: string, method: string) {
  if (!(path in workflowOpenApiDocument.paths)) return undefined
  const pathItem = workflowOpenApiDocument.paths[path as WorkflowPath]
  if (!(method in pathItem)) return undefined
  return pathItem[method as keyof typeof pathItem] as
    | { summary?: string; description?: string }
    | undefined
}

const operationAnchorItems: ApiDocsAnchorItem[] = workflowOpenApiOperations.map((item) => {
  const operation = getOperationMeta(item.path, item.method)
  const title = operation?.summary ?? item.path
  const description = operation?.description ?? '查看该接口的请求与响应说明。'

  return {
    id: title,
    title,
    description,
  }
})

const apiDocsAnchorItems: ApiDocsAnchorItem[] = [...overviewAnchorItems, ...operationAnchorItems]

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
    await navigator.clipboard.writeText(API_BASE_URL)
    showToast('success', '已复制 API 服务器地址')
  } catch {
    showToast('error', '复制失败，请稍后重试')
  }
}

export function AppApiDocs() {
  return (
    <section className="min-h-full">
      <div className="border-border/50 mb-6 flex h-12.5 flex-wrap items-center justify-end gap-2 border-b px-6">
        <div className="bg-input text-muted-foreground flex h-8 max-w-full items-center gap-2 rounded-lg px-2.5 text-sm">
          <span className="shrink-0 text-xs">API 服务器</span>
          <span className="text-foreground truncate font-medium">{API_BASE_URL}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground -mr-1 shrink-0"
            aria-label="复制 API 服务器地址"
            onClick={() => void copyApiServerUrl()}
          >
            <Copy aria-hidden className="size-3.5" />
          </Button>
        </div>

        <span className="bg-success/10 text-success inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[13px] font-medium">
          运行中
        </span>

        <Button type="button" variant="ghost" size="sm" className="text-foreground shrink-0">
          <KeyRound aria-hidden data-icon="inline-start" />
          API 密钥
        </Button>
      </div>
      <div className="relative">
        <aside className="pointer-events-none absolute inset-y-0 left-3 z-10 hidden w-8 lg:block">
          <div className="pointer-events-auto sticky top-1/2 w-fit -translate-y-1/2">
            <ApiDocsAnchorNav items={apiDocsAnchorItems} />
          </div>
        </aside>

        <div className="mx-auto max-w-5xl px-6">
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
                <OverviewCodeBlock>{API_BASE_URL}</OverviewCodeBlock>
              </section>

              <section>
                <h3 id="authentication" className="mb-2 scroll-mt-28 text-base font-semibold">
                  Authentication
                </h3>
                <p className="text-muted-foreground mb-3 text-sm leading-6">
                  Service API 使用 <InlineCode>API-Key</InlineCode> 进行鉴权。所有 API 请求都应在{' '}
                  <InlineCode>Authorization</InlineCode> HTTP Header 中包含您的{' '}
                  <InlineCode>API-Key</InlineCode>，如下所示：
                </p>
                <OverviewCodeBlock>{AUTH_HEADER}</OverviewCodeBlock>
              </section>
            </div>

            <div className="app-api-openapi mt-8 space-y-6">
              <h3 className="not-prose text-base font-semibold">API 接口</h3>
              {/* `prose` matches fumadocs DocsBody — headings/markdown need typography styles */}
              <div className="prose max-w-none min-w-0">
                <OpenAPIPage {...workflowOpenApiPageProps} />
              </div>
            </div>
          </RootProvider>
        </div>
      </div>
    </section>
  )
}
