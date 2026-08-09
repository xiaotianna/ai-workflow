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
import { Slider } from '@ai-workflow/ui/components/slider'
import {
  ArrowLeft,
  Bot,
  FileSearch,
  FileText,
  Grid3X3,
  RotateCcw,
  Save,
  Search,
  Settings2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { AddDocumentStepHeader } from './add-document-step-header'

interface AddDocumentSegmentationStepProps {
  errors: Record<string, string>
  files: readonly File[]
  maxSegmentLength: number
  overlapLength: number
  removeUrlsAndEmails: boolean
  replaceWhitespace: boolean
  segmentIdentifier: string
  topK: number
  onBack: () => void
  onClose: () => void
  onMaxSegmentLengthChange: (value: number) => void
  onOverlapLengthChange: (value: number) => void
  onRemoveUrlsAndEmailsChange: (checked: boolean) => void
  onReplaceWhitespaceChange: (checked: boolean) => void
  onReset: () => void
  onSegmentIdentifierChange: (value: string) => void
  onSubmit: () => void
  onTopKChange: (value: number) => void
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
  removeUrlsAndEmails,
  replaceWhitespace,
  segmentIdentifier,
  topK,
  onBack,
  onClose,
  onMaxSegmentLengthChange,
  onOverlapLengthChange,
  onRemoveUrlsAndEmailsChange,
  onReplaceWhitespaceChange,
  onReset,
  onSegmentIdentifierChange,
  onSubmit,
  onTopKChange,
}: AddDocumentSegmentationStepProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState('0')
  const [previewVisible, setPreviewVisible] = useState(false)
  const selectedFile = files[Number(selectedFileIndex)] ?? files[0]

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
                  title="通用"
                  description="通用文本分块模式，检索和召回的块保持一致。"
                  icon={<Settings2 aria-hidden className="size-4" />}
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <Form.Field required label="分段标识符" error={errors.segmentIdentifier}>
                      <Input
                        value={segmentIdentifier}
                        aria-label="分段标识符"
                        aria-invalid={Boolean(errors.segmentIdentifier)}
                        onChange={(event) => onSegmentIdentifierChange(event.target.value)}
                      />
                    </Form.Field>
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
                        aria-label="替换连续的空格、换行符和制表符"
                        onCheckedChange={(checked) => onReplaceWhitespaceChange(checked === true)}
                      />
                      替换连续的空格、换行符和制表符
                    </label>
                    <label className="text-foreground flex cursor-pointer items-center gap-2.5 text-sm">
                      <Checkbox
                        checked={removeUrlsAndEmails}
                        aria-label="删除所有 URL 和电子邮件地址"
                        onCheckedChange={(checked) => onRemoveUrlsAndEmailsChange(checked === true)}
                      />
                      删除所有 URL 和电子邮件地址
                    </label>
                  </fieldset>

                  <div className="mt-5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewVisible(true)}
                    >
                      <FileSearch aria-hidden className="size-4" />
                      预览块
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                      <RotateCcw aria-hidden className="size-4" />
                      重置
                    </Button>
                  </div>
                </SettingCard>
              </section>

              <Separator />

              <section aria-labelledby="index-method-heading">
                <h2 id="index-method-heading" className="mb-2 text-sm font-semibold">
                  索引方式
                </h2>
                <div className="opacity-60">
                  <SettingCard
                    title="经济"
                    description="每个数据块使用 10 个关键词进行检索，不会消耗额外 token。"
                    icon={<Bot aria-hidden className="size-4" />}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  如需更改索引方式和 embedding 模型，请前往
                  <span className="text-primary ml-1 font-medium">知识库设置</span>。
                </p>
              </section>

              <Separator />

              <section aria-labelledby="retrieval-settings-heading">
                <h2 id="retrieval-settings-heading" className="mb-2 text-sm font-semibold">
                  检索设置
                </h2>
                <div className="border-primary/60 overflow-hidden rounded-xl border shadow-xs">
                  <div className="bg-primary/5 flex items-center gap-3 px-4 py-3">
                    <span className="bg-background text-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs">
                      <Grid3X3 aria-hidden className="size-4" />
                    </span>
                    <span>
                      <span className="text-foreground block text-sm font-semibold">倒排索引</span>
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-4">
                        通过关键词结构定位与查询最匹配的文档块。
                      </span>
                    </span>
                  </div>
                  <div className="px-4 py-4">
                    <Form.Field required label="Top K" error={errors.topK}>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={topK}
                          aria-label="Top K"
                          aria-invalid={Boolean(errors.topK)}
                          className="w-20 shrink-0"
                          onChange={(event) => {
                            const value = event.currentTarget.valueAsNumber
                            if (Number.isFinite(value)) onTopKChange(value)
                          }}
                        />
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[topK]}
                          aria-label="Top K"
                          onValueChange={(value) => onTopKChange(value[0] ?? 3)}
                        />
                      </div>
                    </Form.Field>
                  </div>
                </div>
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
                <Badge variant="outline">{previewVisible ? '1 个预览块' : '0 个预览块'}</Badge>
              </div>

              {previewVisible ? (
                <div className="border-border bg-background mt-6 rounded-xl border p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">预览块 1</span>
                    <Badge variant="secondary">约 {maxSegmentLength} 字符</Badge>
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {selectedFile?.name} 将按“{segmentIdentifier}”进行分段，并保留 {overlapLength}{' '}
                    个字符的上下文重叠。实际内容会在文件解析后显示。
                  </p>
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
        <Button type="button" variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden className="size-4" />
          上一步
        </Button>
        <Button type="button" variant="confirm" size="sm" onClick={onSubmit}>
          <Save aria-hidden className="size-4" />
          保存并处理
        </Button>
      </footer>
    </section>
  )
}
