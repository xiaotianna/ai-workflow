import { Badge } from '@ai-workflow/ui/components/badge'
import { Button } from '@ai-workflow/ui/components/button'
import { Separator } from '@ai-workflow/ui/components/separator'
import { CircleCheck, FileText, Grid3X3, LoaderCircle } from 'lucide-react'

import type { AddDocumentInput } from '../schema'
import { AddDocumentStepHeader } from './add-document-step-header'

interface AddDocumentProcessingStepProps {
  input: AddDocumentInput
  knowledgeBaseName?: string
  onClose: () => void
}

export function AddDocumentProcessingStep({
  input,
  knowledgeBaseName,
  onClose,
}: AddDocumentProcessingStepProps) {
  const fileNames = input.files.map((file) => file.name)
  const uploadedDescription =
    fileNames.length === 1 ? fileNames[0] : `${fileNames[0]} 等 ${fileNames.length} 个文件`

  return (
    <section className="bg-background flex h-full min-h-0 flex-col">
      <AddDocumentStepHeader currentStep={3} onBack={onClose} />

      <div className="min-h-0 flex-1 overflow-auto px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-start gap-3">
            <span className="bg-success/10 text-success mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl">
              <CircleCheck aria-hidden className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-foreground text-2xl font-semibold">文档已上传</h1>
              <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                {uploadedDescription} 已上传至
                {knowledgeBaseName ? `“${knowledgeBaseName}”` : '知识库'}
                {`，你可以在文档列表中找到它${fileNames.length > 1 ? '们' : ''}。`}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-sm font-semibold">
            <LoaderCircle
              aria-hidden
              className="text-primary size-4 animate-spin motion-reduce:animate-none"
            />
            嵌入处理中...
          </div>

          <div className="mt-4 space-y-2">
            {input.files.map((file) => (
              <div
                key={`${file.name}:${file.size}:${file.lastModified}`}
                className="border-border bg-background overflow-hidden rounded-xl border shadow-xs"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="bg-primary/8 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <FileText aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                  <Badge variant="outline">标准</Badge>
                  <span className="text-muted-foreground w-9 text-right text-sm tabular-nums">
                    0%
                  </span>
                </div>
                <div className="bg-muted h-1 w-full overflow-hidden">
                  <div className="bg-primary h-full w-0" />
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-8" />

          <dl className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">分段模式</dt>
            <dd className="text-foreground font-medium">通用</dd>
            <dt className="text-muted-foreground">最大分段长度</dt>
            <dd className="text-foreground font-medium tabular-nums">{input.maxSegmentLength}</dd>
            <dt className="text-muted-foreground">文本预处理规则</dt>
            <dd className="text-foreground flex flex-wrap gap-x-2 gap-y-1 font-medium">
              {input.replaceWhitespace ? <span>替换连续的空格、换行符和制表符</span> : null}
              {input.replaceWhitespace && input.removeUrlsAndEmails ? <span>·</span> : null}
              {input.removeUrlsAndEmails ? <span>删除所有 URL 和电子邮件地址</span> : null}
              {!input.replaceWhitespace && !input.removeUrlsAndEmails ? <span>无</span> : null}
            </dd>
            <dt className="text-muted-foreground">索引方式</dt>
            <dd className="text-foreground flex items-center gap-2 font-medium">
              <Grid3X3 aria-hidden className="text-primary size-4" />
              经济
            </dd>
            <dt className="text-muted-foreground">检索设置</dt>
            <dd className="text-foreground flex items-center gap-2 font-medium">
              <Grid3X3 aria-hidden className="text-primary size-4" />
              倒排索引 · Top K {input.topK}
            </dd>
          </dl>
        </div>
      </div>

      <footer className="border-border flex h-14 shrink-0 items-center justify-end border-t px-5 sm:px-8">
        <Button type="button" variant="confirm" size="sm" onClick={onClose}>
          返回文档列表
        </Button>
      </footer>
    </section>
  )
}
