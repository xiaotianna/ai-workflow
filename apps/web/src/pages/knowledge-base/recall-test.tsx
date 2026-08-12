import {
  getKnowledgeBaseSettings,
  retrieveKnowledgeBase,
  updateKnowledgeBaseSettings,
  type KnowledgeBaseSettingsDto,
  type KnowledgeRetrievalDocumentDto,
} from '@/api/knowledge-bases'
import { PageTitle } from '@/components/page-title'
import {
  RECALL_TEST_INITIAL_VALUES,
  DocumentFileTypeIcon,
  KnowledgeRetrievalMethodIcon,
  KnowledgeRetrievalSettingsPanel,
  recallTestSchema,
  type RecallTestFormInput,
} from '@/features/knowledge-base'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ai-workflow/ui/components/table'
import { TiptapEditor } from '@ai-workflow/ui/components/tiptap-editor'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import {
  ArrowDown,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  LoaderCircle,
  SlidersHorizontal,
  Target,
} from 'lucide-react'
import { motion, MotionConfig } from 'motion/react'
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import type { KnowledgeBaseDetailOutletContext } from '.'

const MAX_QUERY_LENGTH = 200,
  padTimePart = (value: number) => String(value).padStart(2, '0')

interface RecallTestRecord {
  id: string
  query: string
  createdAt: Date
  profile: KnowledgeBaseSettingsDto['retrievalProfile']
  profileVersion: string
  scoreType: 'rerank' | 'rrf'
  documents: KnowledgeRetrievalDocumentDto[]
}

export default function KnowledgeBaseRecallTestPage() {
  const { knowledgeBase, isResourceAvailable } =
      useOutletContext<KnowledgeBaseDetailOutletContext>(),
    { form, resetForm, updateFormField } = useFormData<RecallTestFormInput>(
      RECALL_TEST_INITIAL_VALUES,
    ),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(false),
    [settings, setSettings] = useState<KnowledgeBaseSettingsDto>(),
    [settingsPanelOpen, setSettingsPanelOpen] = useState(false),
    [savingSettings, setSavingSettings] = useState(false),
    [records, setRecords] = useState<RecallTestRecord[]>([]),
    [activeRecordId, setActiveRecordId] = useState<string>(),
    knowledgeBaseId = knowledgeBase?.id

  useEffect(() => {
    if (!knowledgeBaseId) return

    const controller = new AbortController()
    resetForm()
    setErrors({})
    setRecords([])
    setActiveRecordId(undefined)
    setSettings(undefined)
    setSettingsPanelOpen(false)
    void getKnowledgeBaseSettings(knowledgeBaseId, controller.signal)
      .then(setSettings)
      .catch(() => undefined)

    return () => controller.abort()
  }, [knowledgeBaseId, resetForm])

  const validation = validateFormByZod(recallTestSchema, form),
    activeRecord = records.find((record) => record.id === activeRecordId),
    retrievalTopK = settings?.retrievalTopK ?? 8,
    embeddingModelMissing = Boolean(
      settings && (!settings.embeddingModelGroupId || !settings.embeddingConfiguredModelId),
    ),
    canRetrieve = isResourceAvailable && Boolean(settings) && !embeddingModelMissing

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!knowledgeBase || !canRetrieve || loading) return

    const result = validateFormByZod(recallTestSchema, form)
    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      const retrieval = await retrieveKnowledgeBase(knowledgeBase.id, {
          query: result.data.query,
          topK: retrievalTopK,
        }),
        createdAt = new Date(),
        record: RecallTestRecord = {
          id: `${createdAt.getTime()}-${result.data.query}`,
          query: result.data.query,
          createdAt,
          profile: retrieval.profile,
          profileVersion: retrieval.profileVersion,
          scoreType: retrieval.scoreType,
          documents: retrieval.documents,
        }
      setRecords((current) => [record, ...current])
      setActiveRecordId(record.id)
    } finally {
      setLoading(false)
    }
  }

  function handleQueryChange(query: string) {
    updateFormField('query', query.slice(0, MAX_QUERY_LENGTH))
    if (errors.query) setErrors({})
  }

  async function handleRetrievalSettingsSave(nextRetrievalTopK: number) {
    if (!knowledgeBase || !settings) return

    setSavingSettings(true)
    try {
      const nextSettings = await updateKnowledgeBaseSettings(knowledgeBase.id, {
        embeddingModelGroupId: settings.embeddingModelGroupId ?? null,
        embeddingConfiguredModelId: settings.embeddingConfiguredModelId ?? null,
        segmentationMode: settings.segmentationMode,
        maxSegmentLength: settings.maxSegmentLength,
        overlapLength: settings.overlapLength,
        normalizeWhitespace: settings.normalizeWhitespace,
        retrievalProfile: settings.retrievalProfile,
        retrievalTopK: nextRetrievalTopK,
      })
      setSettings(nextSettings)
      setSettingsPanelOpen(false)
      showToast('success', '检索设置已保存')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="relative grid min-h-full min-w-0 grid-cols-1 overflow-auto xl:h-full xl:min-h-0 xl:grid-cols-2 xl:overflow-hidden">
      <section className="flex min-h-[46rem] min-w-0 flex-col px-6 pt-4 pb-3 xl:min-h-0">
        <PageTitle title="召回测试" subtitle="根据给定的查询文本测试知识的召回效果。" />

        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3">
          <Form className="min-h-72 flex-[1.05] space-y-0" onSubmit={handleSubmit}>
            <Form.Field
              required
              label={<span className="sr-only">源文本</span>}
              error={errors.query}
              className="flex h-full min-h-0 flex-col [&>[data-slot=form-control]]:mt-0 [&>[data-slot=form-control]]:min-h-0 [&>[data-slot=form-control]]:flex-1"
            >
              <div
                className={cn(
                  'group/recall-query relative isolate h-full min-h-0 overflow-hidden rounded-2xl p-px',
                  errors.query && 'bg-destructive',
                )}
                style={
                  errors.query
                    ? undefined
                    : {
                        background:
                          'linear-gradient(135deg, color-mix(in oklab, var(--info) 88%, var(--primary)), var(--primary))',
                      }
                }
              >
                {errors.query ? null : (
                  <span
                    aria-hidden
                    className="animation-duration-[5s] pointer-events-none absolute top-1/2 left-1/2 z-0 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-focus-within/recall-query:opacity-100 motion-safe:animate-spin motion-reduce:animate-none"
                    style={{
                      background:
                        'conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary) 55%, transparent) 55deg, var(--primary) 92deg, var(--info) 122deg, transparent 172deg)',
                    }}
                  />
                )}

                <div className="bg-background relative z-10 flex h-full min-h-0 flex-col overflow-hidden rounded-[calc(var(--radius-2xl)-1px)]">
                  <div className="bg-input flex h-11 shrink-0 items-center justify-between gap-3 px-4">
                    <h2 className="text-sm font-semibold">源文本</h2>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 rounded-lg px-2.5"
                      disabled={!isResourceAvailable || !settings}
                      onClick={() => setSettingsPanelOpen(true)}
                    >
                      <KnowledgeRetrievalMethodIcon />
                      混合检索
                      <SlidersHorizontal aria-hidden className="size-3.5 stroke-[1.75]" />
                    </Button>
                  </div>

                  <div className="relative min-h-0 flex-1">
                    <TiptapEditor
                      value={form.query}
                      disabled={!isResourceAvailable || loading}
                      ariaLabel="源文本"
                      ariaInvalid={Boolean(errors.query)}
                      placeholder="请输入文本，建议使用简短的陈述句。"
                      className="h-full px-5 py-4"
                      editorClassName="h-full min-h-0 overflow-y-auto pb-14 text-sm leading-5"
                      onChange={handleQueryChange}
                    />
                    <span className="text-muted-foreground bg-background/90 pointer-events-none absolute top-2 right-3 rounded-md px-1.5 py-0.5 text-xs tabular-nums">
                      {form.query.length}/{MAX_QUERY_LENGTH}
                    </span>
                    {embeddingModelMissing && knowledgeBaseId ? (
                      <p className="text-muted-foreground bg-background/90 absolute bottom-4 left-4 rounded-md px-2 py-1 text-xs">
                        请先配置嵌入模型，
                        <Link
                          className="text-primary hover:underline"
                          to={`/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/settings`}
                        >
                          前往设置
                        </Link>
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      variant="confirm"
                      size="sm"
                      className="absolute right-4 bottom-4"
                      disabled={!canRetrieve || !validation.success || loading}
                    >
                      {loading ? (
                        <LoaderCircle aria-hidden className="animate-spin" />
                      ) : (
                        <CirclePlay aria-hidden />
                      )}
                      {loading ? '测试中…' : '测试'}
                    </Button>
                  </div>
                </div>
              </div>
            </Form.Field>
          </Form>

          <RecallTestRecords
            records={records}
            activeRecordId={activeRecordId}
            onSelect={setActiveRecordId}
          />
        </div>
      </section>

      <RecallResultPanel
        loading={loading}
        isResourceAvailable={isResourceAvailable}
        record={activeRecord}
        knowledgeBaseId={knowledgeBase?.id}
      />

      {settings ? (
        <KnowledgeRetrievalSettingsPanel
          open={settingsPanelOpen}
          profile={settings.retrievalProfile}
          retrievalTopK={settings.retrievalTopK}
          saving={savingSettings}
          onClose={() => {
            if (!savingSettings) setSettingsPanelOpen(false)
          }}
          onSave={handleRetrievalSettingsSave}
        />
      ) : null}
    </div>
  )
}

interface RecallTestRecordsProps {
  records: RecallTestRecord[]
  activeRecordId?: string
  onSelect: (recordId: string) => void
}

interface RecallTestRecordRow {
  document?: KnowledgeRetrievalDocumentDto
  record: RecallTestRecord
}

function RecallTestRecords({ records, activeRecordId, onSelect }: RecallTestRecordsProps) {
  const rows = records.flatMap<RecallTestRecordRow>((record) =>
    record.documents.length > 0
      ? record.documents.map((document) => ({ document, record }))
      : [{ record }],
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="recall-test-records-title">
      <h2 id="recall-test-records-title" className="mb-2 text-base font-semibold">
        记录
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table containerClassName="overflow-visible" className="table-fixed">
          <TableHeader className="bg-background sticky top-0 z-10 [&_tr]:border-b-0">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="bg-input w-[36%] rounded-l-lg">查询内容</TableHead>
              <TableHead className="bg-input w-[40%]">来源文件</TableHead>
              <TableHead className="bg-input w-[24%] rounded-r-lg">
                <span className="inline-flex items-center gap-1">
                  时间
                  <ArrowDown aria-hidden className="size-3" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ document, record }) => (
              <TableRow
                key={document ? `${record.id}:${document.chunkId}` : record.id}
                role="button"
                tabIndex={0}
                aria-current={activeRecordId === record.id ? 'true' : undefined}
                aria-label={
                  document
                    ? `查看 ${record.query} 在 ${document.documentName} 分段 ${document.sequence} 的召回结果`
                    : `查看 ${record.query} 的召回结果`
                }
                className="cursor-pointer hover:bg-transparent focus-visible:bg-transparent focus-visible:outline-none focus-visible:[&_td:first-child]:underline"
                onClick={() => onSelect(record.id)}
                onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  onSelect(record.id)
                }}
              >
                <TableCell className="align-middle break-words whitespace-pre-wrap">
                  {record.query}
                </TableCell>
                <TableCell className="align-middle">
                  {document ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <DocumentFileTypeIcon
                        fileName={document.documentName}
                        className="size-5 shrink-0 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="break-all whitespace-normal">{document.documentName}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          分段 {document.sequence}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex min-w-0 items-center gap-2">
                      <DocumentFileTypeIcon
                        className="size-5 shrink-0 object-contain"
                        fileType="unknown"
                      />
                      未命中来源文件
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground align-middle tabular-nums">
                  {formatRecordTime(record.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {rows.length === 0 ? (
          <div className="text-muted-foreground flex min-h-32 items-center justify-center text-sm">
            暂无测试记录
          </div>
        ) : null}
      </div>
    </section>
  )
}

interface RecallResultPanelProps {
  loading: boolean
  isResourceAvailable: boolean
  record?: RecallTestRecord
  knowledgeBaseId?: string
}

function RecallResultPanel({
  loading,
  isResourceAvailable,
  record,
  knowledgeBaseId,
}: RecallResultPanelProps) {
  let emptyMessage = '召回测试结果将展示在这里'
  if (!isResourceAvailable) emptyMessage = '知识库不可用或正在加载'
  else if (record && record.documents.length === 0) emptyMessage = '当前查询没有召回可用分段'
  const sourceFileCount = record
    ? new Set(record.documents.map(({ documentName }) => documentName)).size
    : 0

  return (
    <aside className="bg-input flex min-h-[36rem] min-w-0 flex-col overflow-hidden rounded-3xl xl:h-full xl:min-h-0 xl:rounded-r-none">
      {loading ? (
        <div
          className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-sm"
          role="status"
        >
          <LoaderCircle aria-hidden className="size-9 animate-spin" />
          正在测试召回效果…
        </div>
      ) : record?.documents.length ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 px-7 pt-7 pb-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">召回结果</h2>
              <div className="mt-2 flex min-w-0 items-start gap-2 text-xs">
                <span className="text-muted-foreground shrink-0">当前查询</span>
                <p className="text-foreground min-w-0 font-medium break-words whitespace-pre-wrap">
                  {record.query}
                </p>
              </div>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs" title={record.profileVersion}>
              {record.profile === 'HYBRID_ACCURATE' ? '高准确 · 二阶段重排' : '低延迟 · RRF'}
              {' · '}
              {record.documents.length} 个分段 · {sourceFileCount} 个来源文件
            </span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-7">
            <div className="space-y-3">
              {record.documents.map((document, index) => (
                <RecallResultCard
                  key={document.chunkId}
                  document={document}
                  index={index}
                  scoreType={record.scoreType}
                  knowledgeBaseId={knowledgeBaseId}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-sm"
          aria-live="polite"
        >
          <Target aria-hidden className="size-20 stroke-[1.5] opacity-45" />
          {emptyMessage}
        </div>
      )}
    </aside>
  )
}

interface RecallResultCardProps {
  document: KnowledgeRetrievalDocumentDto
  index: number
  scoreType: RecallTestRecord['scoreType']
  knowledgeBaseId?: string
}

function RecallResultCard({ document, index, scoreType, knowledgeBaseId }: RecallResultCardProps) {
  const [expanded, setExpanded] = useState(true),
    collapsible = document.content.length > 520 || document.content.split('\n').length > 8,
    documentPath = knowledgeBaseId
      ? `/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(document.documentId)}`
      : undefined

  return (
    <article className="border-border/60 bg-background overflow-hidden rounded-xl border-[0.5px] shadow-xs">
      <header className="border-border/50 flex items-start justify-between gap-4 border-b-[0.5px] px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary/8 text-primary flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
              <span className="text-muted-foreground shrink-0">来源文件</span>
              <DocumentFileTypeIcon
                fileName={document.documentName}
                className="size-4 shrink-0 object-contain"
              />
              {documentPath ? (
                <Link
                  to={documentPath}
                  title={document.documentName}
                  className="text-foreground hover:text-primary focus-visible:text-primary min-w-0 font-medium break-all transition-colors outline-none hover:underline"
                >
                  {document.documentName}
                </Link>
              ) : (
                <span className="text-foreground min-w-0 font-medium break-all">
                  {document.documentName}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">命中分段 {document.sequence}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-muted-foreground text-[11px] leading-4">
            {scoreType === 'rerank' ? '重排得分' : 'RRF 融合得分'}
          </p>
          <p className="text-foreground font-mono text-xs leading-5 tabular-nums">
            {document.score.toFixed(4)}
          </p>
          {document.rrfRank ? (
            <p
              className="text-muted-foreground text-[10px] leading-4 tabular-nums"
              title={`BM25 ${formatChannelDebug(document.bm25Rank, document.bm25Score)} · Dense ${formatChannelDebug(document.denseRank, document.denseScore)} · RRF #${document.rrfRank}`}
            >
              BM25 {document.bm25Rank ? `#${document.bm25Rank}` : '—'} · Dense{' '}
              {document.denseRank ? `#${document.denseRank}` : '—'}
            </p>
          ) : null}
        </div>
      </header>

      <div className="p-4">
        <div className="border-border/50 bg-input/45 rounded-lg border-[0.5px] px-3.5 py-3">
          <MotionConfig reducedMotion="user">
            <motion.div
              initial={false}
              animate={{ height: collapsible && !expanded ? 192 : 'auto' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <p className="text-foreground/90 text-sm leading-6 break-words whitespace-pre-wrap">
                {document.content}
              </p>
            </motion.div>
          </MotionConfig>
          {collapsible ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              className="text-muted-foreground hover:text-foreground mt-2 h-7 gap-1 px-2 text-xs"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
              {expanded ? '收起内容' : '展开完整分段'}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function formatChannelDebug(rank?: number, score?: number): string {
  if (!rank) return '未命中'
  return `#${rank}${score === undefined ? '' : `（原始分 ${score.toFixed(4)}）`}`
}

function formatRecordTime(date: Date): string {
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`
}
