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
import { ArrowDown, CirclePlay, LoaderCircle, SlidersHorizontal, Target } from 'lucide-react'
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import type { KnowledgeBaseDetailOutletContext } from '.'

const MAX_QUERY_LENGTH = 200
const padTimePart = (value: number) => String(value).padStart(2, '0')

interface RecallTestRecord {
  id: string
  query: string
  createdAt: Date
  documents: KnowledgeRetrievalDocumentDto[]
}

export default function KnowledgeBaseRecallTestPage() {
  const { knowledgeBase, isResourceAvailable } =
    useOutletContext<KnowledgeBaseDetailOutletContext>()
  const { form, resetForm, updateFormField } = useFormData<RecallTestFormInput>(
    RECALL_TEST_INITIAL_VALUES,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<KnowledgeBaseSettingsDto>()
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [records, setRecords] = useState<RecallTestRecord[]>([])
  const [activeRecordId, setActiveRecordId] = useState<string>()
  const knowledgeBaseId = knowledgeBase?.id

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

  const validation = validateFormByZod(recallTestSchema, form)
  const activeRecord = records.find((record) => record.id === activeRecordId)
  const retrievalTopK = settings?.retrievalTopK ?? 8

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!knowledgeBase || loading) return

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
      })
      const createdAt = new Date()
      const record: RecallTestRecord = {
        id: `${createdAt.getTime()}-${result.data.query}`,
        query: result.data.query,
        createdAt,
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
                    <Button
                      type="submit"
                      variant="confirm"
                      size="sm"
                      className="absolute right-4 bottom-4"
                      disabled={!isResourceAvailable || !validation.success || loading}
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
            dataSourceTitle={knowledgeBase?.title ?? '知识库'}
            dataSourceIcon={knowledgeBase?.icon}
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
  dataSourceTitle: string
  dataSourceIcon?: string
  onSelect: (recordId: string) => void
}

function RecallTestRecords({
  records,
  activeRecordId,
  dataSourceTitle,
  dataSourceIcon,
  onSelect,
}: RecallTestRecordsProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="recall-test-records-title">
      <h2 id="recall-test-records-title" className="mb-2 text-base font-semibold">
        记录
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table containerClassName="overflow-visible" className="table-fixed">
          <TableHeader className="bg-background sticky top-0 z-10 [&_tr]:border-b-0">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="bg-input w-[46%] rounded-l-lg">查询内容</TableHead>
              <TableHead className="bg-input w-[30%]">数据源</TableHead>
              <TableHead className="bg-input w-[24%] rounded-r-lg">
                <span className="inline-flex items-center gap-1">
                  时间
                  <ArrowDown aria-hidden className="size-3" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow
                key={record.id}
                data-state={activeRecordId === record.id ? 'selected' : undefined}
                role="button"
                tabIndex={0}
                aria-label={`查看 ${record.query} 的召回结果`}
                className="cursor-pointer"
                onClick={() => onSelect(record.id)}
                onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  onSelect(record.id)
                }}
              >
                <TableCell className="truncate">{record.query}</TableCell>
                <TableCell>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {dataSourceIcon ? (
                      <span aria-hidden className="shrink-0 text-sm">
                        {dataSourceIcon}
                      </span>
                    ) : (
                      <Target aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{dataSourceTitle}</span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatRecordTime(record.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {records.length === 0 ? (
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
              <p className="text-muted-foreground mt-1 truncate text-xs">{record.query}</p>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs">
              共 {record.documents.length} 个分段
            </span>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-7">
            <div className="space-y-3">
              {record.documents.map((document, index) => (
                <article
                  key={document.chunkId}
                  className="border-border/60 bg-background rounded-xl border-[0.5px] p-4 shadow-xs"
                >
                  <div className="mb-2 flex items-start justify-between gap-4 text-xs">
                    {knowledgeBaseId ? (
                      <Link
                        to={`/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/documents/${encodeURIComponent(document.documentId)}`}
                        className="text-foreground hover:text-primary focus-visible:text-primary min-w-0 truncate font-medium transition-colors outline-none"
                      >
                        {index + 1}. {document.documentName} · 分段-{document.sequence}
                      </Link>
                    ) : (
                      <span className="text-foreground min-w-0 truncate font-medium">
                        {index + 1}. {document.documentName} · 分段-{document.sequence}
                      </span>
                    )}
                    <span className="text-muted-foreground bg-input shrink-0 rounded-md px-2 py-1 font-mono">
                      RRF {document.score.toFixed(4)}
                    </span>
                  </div>
                  <p className="text-foreground/90 text-sm leading-6 whitespace-pre-wrap">
                    {document.content}
                  </p>
                </article>
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

function formatRecordTime(date: Date): string {
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`
}
