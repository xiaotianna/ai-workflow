import { Button } from '@ai-workflow/ui/components/button'
import { Separator } from '@ai-workflow/ui/components/separator'
import { CircleCheck, CircleX, LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { KnowledgeDocumentDto } from '@/api/knowledge-bases'

import { getDocumentSegmentationModeOption } from '../constants'
import type { AddDocumentInput } from '../schema'
import { AddDocumentStepHeader } from './add-document-step-header'
import { DocumentFileTypeIcon } from './document-file-type-icon'

interface AddDocumentProcessingStepProps {
  documents: KnowledgeDocumentDto[]
  embeddingEnabled?: boolean
  input: AddDocumentInput
  knowledgeBaseName?: string
  onClose: () => void
  onRefreshDocument: (documentId: string, signal?: AbortSignal) => Promise<KnowledgeDocumentDto>
}

const documentStatusPollIntervalMs = 1500

export function AddDocumentProcessingStep({
  documents: initialDocuments,
  embeddingEnabled = false,
  input,
  knowledgeBaseName,
  onClose,
  onRefreshDocument,
}: AddDocumentProcessingStepProps) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const fileNames = input.files.map((file) => file.name)
  const uploadedDescription =
    fileNames.length === 1 ? fileNames[0] : `${fileNames[0]} 等 ${fileNames.length} 个文件`
  const segmentationModeOption = getDocumentSegmentationModeOption(input.segmentationMode)
  const processingCount = documents.filter(({ status }) => status === 'PROCESSING').length
  const failedCount = documents.filter(({ status }) => status === 'FAILED').length
  const statusLabel = getStatusLabel({
    embeddingEnabled,
    failedCount,
    processingCount,
    refreshFailed,
    total: documents.length,
  })

  useEffect(() => {
    const processingDocuments = documents.filter(({ status }) => status === 'PROCESSING')
    if (!processingDocuments.length || refreshFailed) return

    const controller = new AbortController()
    const timer = globalThis.setTimeout(() => {
      void Promise.all(
        processingDocuments.map(({ id }) => onRefreshDocument(id, controller.signal)),
      )
        .then((updatedDocuments) => {
          if (controller.signal.aborted) return
          const updates = new Map(updatedDocuments.map((document) => [document.id, document]))
          setDocuments((currentDocuments) =>
            currentDocuments.map((document) => updates.get(document.id) ?? document),
          )
        })
        .catch(() => {
          if (!controller.signal.aborted) setRefreshFailed(true)
        })
    }, documentStatusPollIntervalMs)

    return () => {
      globalThis.clearTimeout(timer)
      controller.abort()
    }
  }, [documents, onRefreshDocument, refreshFailed])

  return (
    <section className="bg-background flex h-full min-h-0 flex-col">
      <AddDocumentStepHeader currentStep={3} onBack={onClose} />

      <div className="min-h-0 flex-1 overflow-auto px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-[640px]">
          <div className="flex flex-col gap-1 pb-3">
            <h1 className="text-foreground text-lg leading-6 font-semibold">🎉 文档已上传</h1>
            <p className="text-muted-foreground text-xs leading-5">
              {knowledgeBaseName ? (
                <>
                  文档已上传至知识库：
                  <span className="text-foreground/80"> {knowledgeBaseName} </span>
                  ，你可以在知识库的文档列表中找到它
                  {fileNames.length > 1 ? '们' : ''}。
                </>
              ) : (
                <>
                  {uploadedDescription} 已上传至知识库，你可以在文档列表中找到它
                  {fileNames.length > 1 ? '们' : ''}。
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex min-h-5 items-center justify-between gap-2">
              <h2
                role="status"
                aria-live="polite"
                className="text-foreground text-xs font-semibold"
              >
                {statusLabel}
              </h2>
              {refreshFailed && processingCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground h-5 gap-1 px-1.5 text-[10px]"
                  onClick={() => setRefreshFailed(false)}
                >
                  <RefreshCw aria-hidden className="size-3" />
                  重新获取状态
                </Button>
              ) : null}
            </div>

            <div className="space-y-0.5 pb-2">
              {documents.map((document) => (
                <div
                  key={document.id}
                  title={document.errorMessage}
                  className="bg-input flex min-h-7 items-center gap-1.5 overflow-hidden rounded-md px-2"
                >
                  <DocumentFileTypeIcon
                    fileName={document.name}
                    fileType={document.fileType}
                    className="size-5 shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {document.name}
                  </span>
                  <span
                    className={getDocumentStatusClassName(document.status)}
                    aria-label={getDocumentStatusLabel(document.status, embeddingEnabled)}
                  >
                    {getDocumentStatusLabel(document.status, embeddingEnabled)}
                  </span>
                  <DocumentStatusIcon status={document.status} />
                </div>
              ))}
            </div>

            <Separator className="bg-border/30" />

            <dl className="grid grid-cols-[minmax(7.5rem,200px)_minmax(0,1fr)] gap-x-4 gap-y-1 text-[11px] leading-4">
              <dt className="text-muted-foreground truncate">分段模式</dt>
              <dd className="text-foreground/80">{segmentationModeOption.label}</dd>
              <dt className="text-muted-foreground truncate">最大分段长度</dt>
              <dd className="text-foreground/80 tabular-nums">{input.maxSegmentLength}</dd>
              <dt className="text-muted-foreground truncate">文本预处理规则</dt>
              <dd className="text-foreground/80">
                {input.replaceWhitespace ? '替换掉连续的空格、换行符和制表符' : '无'}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <footer className="border-border flex h-14 shrink-0 items-center justify-end border-t-[0.5px] px-5 sm:px-8">
        <Button type="button" variant="confirm" size="sm" onClick={onClose}>
          返回文档列表
        </Button>
      </footer>
    </section>
  )
}

function getStatusLabel(options: {
  embeddingEnabled: boolean
  failedCount: number
  processingCount: number
  refreshFailed: boolean
  total: number
}): string {
  const action = options.embeddingEnabled ? '嵌入' : '文档处理'
  if (options.refreshFailed && options.processingCount > 0) return `${action}状态更新中断`
  if (options.processingCount > 0) {
    return options.failedCount > 0 ? `正在${action}，部分文档失败` : `正在${action}`
  }
  if (options.failedCount === options.total) return `${action}失败`
  if (options.failedCount > 0) return `部分文档${action}失败`
  return `${action}已完成`
}

function getDocumentStatusLabel(
  status: KnowledgeDocumentDto['status'],
  embeddingEnabled: boolean,
): string {
  if (status === 'PROCESSING') return embeddingEnabled ? '嵌入中' : '处理中'
  if (status === 'FAILED') return '失败'
  return '已完成'
}

function getDocumentStatusClassName(status: KnowledgeDocumentDto['status']): string {
  const baseClassName = 'shrink-0 text-[10px] font-medium'
  if (status === 'PROCESSING') return `${baseClassName} text-primary`
  if (status === 'FAILED') return `${baseClassName} text-destructive`
  return `${baseClassName} text-success`
}

function DocumentStatusIcon({ status }: { status: KnowledgeDocumentDto['status'] }) {
  if (status === 'PROCESSING') {
    return (
      <LoaderCircle
        aria-hidden
        className="text-primary size-4 shrink-0 animate-spin motion-reduce:animate-none"
      />
    )
  }
  if (status === 'FAILED') {
    return <CircleX aria-hidden className="text-destructive size-4 shrink-0" />
  }
  return <CircleCheck aria-hidden className="text-success size-4 shrink-0" />
}
