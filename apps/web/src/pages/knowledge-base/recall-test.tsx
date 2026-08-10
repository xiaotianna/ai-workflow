import { retrieveKnowledgeBase, type KnowledgeRetrievalDocumentDto } from '@/api/knowledge-bases'
import { PageContent } from '@/components/page-content'
import { PageTitle } from '@/components/page-title'
import { Button } from '@ai-workflow/ui/components/button'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'

import type { KnowledgeBaseDetailOutletContext } from '.'

export default function KnowledgeBaseRecallTestPage() {
  const { knowledgeBase, isResourceAvailable } =
    useOutletContext<KnowledgeBaseDetailOutletContext>()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [documents, setDocuments] = useState<KnowledgeRetrievalDocumentDto[]>([])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedQuery = query.trim()
    if (!knowledgeBase || !normalizedQuery || loading) return

    setLoading(true)
    try {
      const result = await retrieveKnowledgeBase(knowledgeBase.id, {
        query: normalizedQuery,
        topK: 8,
      })
      setDocuments(result.documents)
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 pb-2">
      <PageTitle title="召回测试" subtitle="使用当前活动索引执行 BM25 与向量混合召回" />

      <PageContent className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <form className="border-border/70 border-b px-5 py-4" onSubmit={handleSubmit}>
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="text-foreground mb-2 block text-sm font-medium">检索内容</span>
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="输入想从知识库中查找的问题或关键词"
                rows={3}
                maxLength={10_000}
                disabled={!isResourceAvailable || loading}
              />
            </label>
            <Button
              type="submit"
              className="mb-0.5 shrink-0"
              disabled={!isResourceAvailable || !query.trim() || loading}
            >
              <Search aria-hidden className="size-4" />
              {loading ? '检索中…' : '开始检索'}
            </Button>
          </div>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!isResourceAvailable ? (
            <EmptyState>知识库不可用或正在加载</EmptyState>
          ) : documents.length ? (
            <div className="space-y-3">
              <div className="text-muted-foreground text-xs">共召回 {documents.length} 个分段</div>
              {documents.map((document, index) => (
                <article
                  key={document.chunkId}
                  className="border-border/70 bg-card rounded-xl border p-4 shadow-xs"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <div className="text-foreground min-w-0 truncate font-medium">
                      {index + 1}. {document.documentName} · 分段-{document.sequence}
                    </div>
                    <div className="text-muted-foreground shrink-0 font-mono">
                      RRF {document.score.toFixed(4)}
                    </div>
                  </div>
                  <p className="text-foreground/90 text-sm leading-6 whitespace-pre-wrap">
                    {document.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>
              {hasSearched
                ? '当前查询没有召回可用分段'
                : '输入问题后可查看当前活动索引的真实召回结果'}
            </EmptyState>
          )}
        </div>
      </PageContent>
    </div>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
      {children}
    </div>
  )
}
