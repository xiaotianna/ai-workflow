import { Badge } from '@ai-workflow/ui/components/badge'
import { Button } from '@ai-workflow/ui/components/button'
import { Checkbox } from '@ai-workflow/ui/components/checkbox'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import {
  ArrowLeft,
  FileSearch,
  RotateCcw,
  Save,
  Search,
  Settings2,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import {
  documentSegmentationModeOptions,
  getDocumentSegmentationModeOption,
  type DocumentSegmentationMode,
} from '../constants'
import type { DocumentPreview } from '../types'
import { AddDocumentStepHeader } from './add-document-step-header'
import { DocumentFileTypeIcon } from './document-file-type-icon'

interface AddDocumentSegmentationStepProps {
  embeddingEnabled: boolean
  errors: Record<string, string>
  files: readonly File[]
  maxSegmentLength: number
  overlapLength: number
  replaceWhitespace: boolean
  segmentationMode: DocumentSegmentationMode
  submitting: boolean
  onBack: () => void
  onClose: () => void
  onConfigureEmbedding: () => void
  onMaxSegmentLengthChange: (value: number) => void
  onOverlapLengthChange: (value: number) => void
  onReplaceWhitespaceChange: (checked: boolean) => void
  onReset: () => void
  onPreview: () => Promise<DocumentPreview>
  onSegmentationModeChange: (value: DocumentSegmentationMode) => void
  onSubmit: () => void
}

function SettingCard({
  children,
  description,
  icon,
  title,
}: {
  children?: ReactNode
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <div className="border-border bg-background overflow-hidden rounded-xl border">
      <div className="bg-muted/35 flex items-center gap-3 px-4 py-3">
        <span className="bg-background text-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="text-foreground block text-sm font-semibold">{title}</span>
          <span className="text-muted-foreground mt-0.5 block text-xs leading-4">
            {description}
          </span>
        </span>
      </div>
      {children ? <div className="px-4 py-4">{children}</div> : null}
    </div>
  )
}

function PreviewSkeleton() {
  return (
    <div role="status" aria-label="正在生成预览块" className="space-y-8">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <span aria-hidden className="text-muted-foreground text-xs">
              ·
            </span>
            <Skeleton className="h-4 w-38" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
      <span className="sr-only">正在生成预览块…</span>
    </div>
  )
}

export function AddDocumentSegmentationStep({
  embeddingEnabled,
  errors,
  files,
  maxSegmentLength,
  overlapLength,
  replaceWhitespace,
  segmentationMode,
  submitting,
  onBack,
  onClose,
  onConfigureEmbedding,
  onMaxSegmentLengthChange,
  onOverlapLengthChange,
  onReplaceWhitespaceChange,
  onReset,
  onPreview,
  onSegmentationModeChange,
  onSubmit,
}: AddDocumentSegmentationStepProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState('0'),
    [previewVisible, setPreviewVisible] = useState(false),
    [previewing, setPreviewing] = useState(false),
    [preview, setPreview] = useState<DocumentPreview>(),
    selectedPreview = preview?.files[Number(selectedFileIndex)],
    segmentationModeOption = getDocumentSegmentationModeOption(segmentationMode)

  useEffect(() => {
    setPreviewVisible(false)
    setPreview(undefined)
  }, [maxSegmentLength, overlapLength, replaceWhitespace, segmentationMode])

  return (
    <section className="bg-background flex h-full min-h-0 flex-col">
      <AddDocumentStepHeader currentStep={2} onBack={onClose} />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 grid-rows-2 xl:grid-cols-2 xl:grid-rows-1">
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-7 sm:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
              <section aria-labelledby="segment-settings-heading">
                <h1 id="segment-settings-heading" className="mb-2 text-sm font-semibold">
                  分段设置
                </h1>
                <SettingCard
                  title={segmentationModeOption.label}
                  description={segmentationModeOption.description}
                  icon={<Settings2 aria-hidden className="size-4" />}
                >
                  <Form.Field required label="分段模式" error={errors.segmentationMode}>
                    <Select
                      value={segmentationMode}
                      onValueChange={(value) =>
                        onSegmentationModeChange(value as DocumentSegmentationMode)
                      }
                    >
                      <SelectTrigger
                        aria-label="分段模式"
                        aria-invalid={Boolean(errors.segmentationMode)}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        align="start"
                        sideOffset={4}
                        className="w-(--radix-select-trigger-width)"
                      >
                        {documentSegmentationModeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Form.Field>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Form.Field required label="分段最大长度" error={errors.maxSegmentLength}>
                      <div className="relative">
                        <Input
                          type="number"
                          min={100}
                          max={4000}
                          value={maxSegmentLength}
                          aria-label="分段最大长度"
                          aria-invalid={Boolean(errors.maxSegmentLength)}
                          className="[appearance:textfield] pr-20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          onChange={(event) => {
                            const value = event.currentTarget.valueAsNumber
                            if (Number.isFinite(value)) onMaxSegmentLengthChange(value)
                          }}
                        />
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                          字符
                        </span>
                      </div>
                    </Form.Field>
                    <Form.Field required label="分段重叠长度" error={errors.overlapLength}>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={maxSegmentLength - 1}
                          value={overlapLength}
                          aria-label="分段重叠长度"
                          aria-invalid={Boolean(errors.overlapLength)}
                          className="[appearance:textfield] pr-20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          onChange={(event) => {
                            const value = event.currentTarget.valueAsNumber
                            if (Number.isFinite(value)) onOverlapLengthChange(value)
                          }}
                        />
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                          字符
                        </span>
                      </div>
                    </Form.Field>
                  </div>

                  <fieldset className="mt-4 space-y-3">
                    <legend className="mb-3 text-sm font-medium">文本预处理规则</legend>
                    <label className="text-foreground flex cursor-pointer items-center gap-2.5 text-sm">
                      <Checkbox
                        checked={replaceWhitespace}
                        aria-label="规范化多余空白"
                        onCheckedChange={(checked) => onReplaceWhitespaceChange(checked === true)}
                      />
                      规范化多余空白（保留段落、列表、表格与代码结构）
                    </label>
                  </fieldset>

                  <div className="mt-5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={previewing}
                      onClick={() => {
                        setPreview(undefined)
                        setPreviewVisible(true)
                        setPreviewing(true)
                        void onPreview()
                          .then((result) => {
                            setPreview(result)
                          })
                          .catch(() => undefined)
                          .finally(() => setPreviewing(false))
                      }}
                    >
                      <FileSearch aria-hidden className="size-4" />
                      {previewing ? '生成中…' : '预览块'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                      <RotateCcw aria-hidden className="size-4" />
                      重置
                    </Button>
                  </div>
                </SettingCard>
                {!embeddingEnabled ? (
                  <div
                    role="alert"
                    className="border-warning/40 bg-warning/10 mt-4 flex items-start gap-3 rounded-lg border-[0.5px] px-3.5 py-3"
                  >
                    <TriangleAlert aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-xs font-medium">正式处理需要嵌入模型</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        你仍然可以预览分段；保存并构建索引前，请先选择并启用 Embedding 模型。
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="shrink-0"
                      onClick={onConfigureEmbedding}
                    >
                      前往设置
                    </Button>
                  </div>
                ) : null}
              </section>
            </div>
          </div>

          <aside className="bg-muted/12 min-h-0 overflow-hidden px-4 py-4 sm:px-5">
            <div className="border-border/50 bg-background mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-xl border-[0.5px] shadow-xs">
              <div className="border-border/50 shrink-0 border-b-[0.5px] px-4 py-3.5 sm:px-5">
                <span className="text-primary text-xs font-semibold">预览</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Select value={selectedFileIndex} onValueChange={setSelectedFileIndex}>
                    <SelectTrigger
                      size="sm"
                      aria-label="选择预览文件"
                      className="bg-background max-w-full min-w-56"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <DocumentFileTypeIcon
                          fileName={files[Number(selectedFileIndex)]?.name}
                          className="size-5 shrink-0 object-contain"
                        />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      align="start"
                      sideOffset={4}
                      className="w-(--radix-select-trigger-width)"
                    >
                      {files.map((file, index) => (
                        <SelectItem
                          key={`${file.name}:${file.size}:${file.lastModified}`}
                          value={String(index)}
                        >
                          {file.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">{selectedPreview?.total ?? 0} 个预览块</Badge>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                {previewing ? (
                  <PreviewSkeleton />
                ) : previewVisible && selectedPreview ? (
                  <div className="space-y-3">
                    {selectedPreview.items.map((item) => (
                      <article
                        key={item.sequence}
                        className="border-border/60 bg-background hover:border-input-focus rounded-lg border-[0.5px] p-4 shadow-xs transition-[border-color,box-shadow] duration-200 ease-in-out hover:shadow-lg motion-reduce:transition-none"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">预览块 {item.sequence}</span>
                          <Badge
                            variant="outline"
                            className="border-border/50 bg-input/70 text-muted-foreground h-6 rounded-md px-2 font-normal shadow-none"
                          >
                            {item.characterCount} 字符
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-3 text-sm leading-6 whitespace-pre-wrap">
                          {item.content}
                        </p>
                      </article>
                    ))}
                    {selectedPreview.truncated ? (
                      <p className="text-muted-foreground text-center text-xs">
                        预览最多展示前 20 个分段
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-muted-foreground flex h-full min-h-72 flex-col items-center justify-center text-center">
                    <Search aria-hidden className="size-10 opacity-30" strokeWidth={1.5} />
                    <p className="mt-4 text-sm">点击左侧“预览块”按钮加载预览</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="border-border flex h-14 shrink-0 items-center justify-between border-t px-5 sm:px-8">
        <Button type="button" variant="secondary" size="sm" disabled={submitting} onClick={onBack}>
          <ArrowLeft aria-hidden className="size-4" />
          上一步
        </Button>
        <Button
          type="button"
          variant="confirm"
          size="sm"
          disabled={submitting || !embeddingEnabled}
          onClick={onSubmit}
        >
          <Save aria-hidden className="size-4" />
          {submitting ? '处理中…' : '保存并处理'}
        </Button>
      </footer>
    </section>
  )
}
