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
import { Separator } from '@ai-workflow/ui/components/separator'
import { ArrowLeft, FileSearch, FileText, RotateCcw, Save, Search, Settings2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import {
  documentSegmentationModeOptions,
  getDocumentSegmentationModeOption,
  type DocumentSegmentationMode,
} from '../constants'
import type { DocumentPreview } from '../types'
import { AddDocumentStepHeader } from './add-document-step-header'

interface AddDocumentSegmentationStepProps {
  errors: Record<string, string>
  files: readonly File[]
  maxSegmentLength: number
  overlapLength: number
  replaceWhitespace: boolean
  segmentationMode: DocumentSegmentationMode
  submitting: boolean
  onBack: () => void
  onClose: () => void
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
    <div className="border-border overflow-hidden rounded-xl border shadow-xs">
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

export function AddDocumentSegmentationStep({
  errors,
  files,
  maxSegmentLength,
  overlapLength,
  replaceWhitespace,
  segmentationMode,
  submitting,
  onBack,
  onClose,
  onMaxSegmentLengthChange,
  onOverlapLengthChange,
  onReplaceWhitespaceChange,
  onReset,
  onPreview,
  onSegmentationModeChange,
  onSubmit,
}: AddDocumentSegmentationStepProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState('0')
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<DocumentPreview>()
  const selectedPreview = preview?.files[Number(selectedFileIndex)]
  const segmentationModeOption = getDocumentSegmentationModeOption(segmentationMode)

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

                  <Separator className="my-4" />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Form.Field required label="分段最大长度" error={errors.maxSegmentLength}>
                      <div className="relative">
                        <Input
                          type="number"
                          min={100}
                          max={4000}
                          value={maxSegmentLength}
                          aria-label="分段最大长度"
                          aria-invalid={Boolean(errors.maxSegmentLength)}
                          className="pr-20"
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
                          className="pr-20"
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

                  <Separator className="my-4" />

                  <fieldset className="space-y-3">
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
                        setPreviewing(true)
                        void onPreview()
                          .then((result) => {
                            setPreview(result)
                            setPreviewVisible(true)
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
              </section>
            </div>
          </div>

          <aside className="bg-muted/12 min-h-0 overflow-y-auto overscroll-contain px-5 py-7 sm:px-8">
            <div className="mx-auto flex h-full max-w-3xl flex-col">
              <span className="text-primary text-xs font-semibold">预览</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select value={selectedFileIndex} onValueChange={setSelectedFileIndex}>
                  <SelectTrigger
                    size="sm"
                    aria-label="选择预览文件"
                    className="bg-background max-w-full min-w-56"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText aria-hidden className="text-primary size-4 shrink-0" />
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

              {previewVisible && selectedPreview ? (
                <div className="mt-6 space-y-3">
                  {selectedPreview.items.map((item) => (
                    <article
                      key={item.sequence}
                      className="border-border bg-background rounded-xl border p-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">预览块 {item.sequence}</span>
                        <Badge variant="secondary">{item.characterCount} 字符</Badge>
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
                <div className="text-muted-foreground flex min-h-72 flex-1 flex-col items-center justify-center text-center">
                  <Search aria-hidden className="size-10 opacity-30" strokeWidth={1.5} />
                  <p className="mt-4 text-sm">点击左侧“预览块”按钮加载预览</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <footer className="border-border flex h-14 shrink-0 items-center justify-between border-t px-5 sm:px-8">
        <Button type="button" variant="secondary" size="sm" disabled={submitting} onClick={onBack}>
          <ArrowLeft aria-hidden className="size-4" />
          上一步
        </Button>
        <Button type="button" variant="confirm" size="sm" disabled={submitting} onClick={onSubmit}>
          <Save aria-hidden className="size-4" />
          {submitting ? '处理中…' : '保存并处理'}
        </Button>
      </footer>
    </section>
  )
}
