import {
  getKnowledgeBaseSettings,
  listKnowledgeBaseIndexes,
  rebuildKnowledgeBaseIndex,
  updateKnowledgeBaseSettings,
  type KnowledgeBaseIndexDto,
} from '@/api/knowledge-bases'
import { listModelGroups, type ModelGroupDto } from '@/api/models'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import { Checkbox } from '@ai-workflow/ui/components/checkbox'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import {
  AlignLeft,
  AlertTriangle,
  Gauge,
  LoaderCircle,
  MessagesSquare,
  Network,
  RefreshCw,
  SearchCheck,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'

import { PageContent } from '@/components/page-content'
import { PageTitle } from '@/components/page-title'
import {
  documentSegmentationModeOptions,
  KNOWLEDGE_BASE_SETTINGS_INITIAL_VALUES,
  knowledgeBaseSettingsSchema,
  type DocumentSegmentationMode,
  type KnowledgeBaseSettingsFormInput,
} from '@/features/knowledge-base'
import { getModelProviderStrategy } from '@/features/models'

import type { KnowledgeBaseDetailOutletContext } from '.'

const segmentationModeToApi = {
  general: 'GENERAL',
  qa: 'QA',
  'parent-child': 'PARENT_CHILD',
} as const

const segmentationModeFromApi = {
  GENERAL: 'general',
  QA: 'qa',
  PARENT_CHILD: 'parent-child',
} as const

const retrievalProfileToApi = {
  'hybrid-accurate': 'HYBRID_ACCURATE',
  'hybrid-fast': 'HYBRID_FAST',
} as const

const retrievalProfileFromApi = {
  HYBRID_ACCURATE: 'hybrid-accurate',
  HYBRID_FAST: 'hybrid-fast',
} as const

const NO_EMBEDDING_MODEL_VALUE = 'none'

const segmentationModeIcons = {
  general: AlignLeft,
  qa: MessagesSquare,
  'parent-child': Network,
} satisfies Record<DocumentSegmentationMode, LucideIcon>

const retrievalProfileOptions = [
  {
    value: 'hybrid-accurate',
    label: '混合检索 · 高准确',
    description: '融合关键词匹配与向量语义召回，优先保证检索准确度。',
    icon: SearchCheck,
  },
  {
    value: 'hybrid-fast',
    label: '混合检索 · 低延迟',
    description: '融合关键词匹配与向量语义召回，优先缩短检索响应时间。',
    icon: Gauge,
  },
] as const satisfies readonly {
  value: KnowledgeBaseSettingsFormInput['retrievalProfile']
  label: string
  description: string
  icon: LucideIcon
}[]

interface SettingsRowProps {
  children: ReactNode
  description?: ReactNode
  title: string
}

function SettingsRow({ children, description, title }: SettingsRowProps) {
  return (
    <div className="grid gap-4 py-7 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
      <div className="min-w-0">
        <h2 className="text-sm leading-8 font-semibold">{title}</h2>
        {description ? (
          <div className="text-muted-foreground text-xs leading-5">{description}</div>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

interface SelectionCardProps {
  checked: boolean
  description: string
  icon: LucideIcon
  label: string
  name: string
  value: string
  onChange: () => void
}

function SelectionCard({
  checked,
  description,
  icon: Icon,
  label,
  name,
  value,
  onChange,
}: SelectionCardProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-[background-color,border-color,box-shadow]',
        'has-[:focus-visible]:border-primary has-[:focus-visible]:bg-background',
        checked
          ? 'border-primary bg-primary/[0.035] shadow-xs'
          : 'border-border/70 bg-background hover:border-input-focus',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        className="sr-only"
        onChange={onChange}
      />
      <span
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center',
          checked ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="text-foreground block text-sm leading-5 font-medium">{label}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-5">{description}</span>
      </span>
    </label>
  )
}

export default function KnowledgeBaseSettingsPage() {
  const { id: knowledgeBaseId = '' } = useParams<{ id: string }>()
  const { isResourceAvailable } = useOutletContext<KnowledgeBaseDetailOutletContext>()
  const { form, setForm, updateForm, updateFormField } =
    useFormData<KnowledgeBaseSettingsFormInput>(KNOWLEDGE_BASE_SETTINGS_INITIAL_VALUES)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [staleDocumentCount, setStaleDocumentCount] = useState(0)
  const [embeddingModelGroups, setEmbeddingModelGroups] = useState<ModelGroupDto[]>([])
  const [latestIndex, setLatestIndex] = useState<KnowledgeBaseIndexDto>()

  useEffect(() => {
    if (!isResourceAvailable || !knowledgeBaseId) return
    const controller = new AbortController()
    setLoading(true)
    setLatestIndex(undefined)
    void Promise.all([
      getKnowledgeBaseSettings(knowledgeBaseId, controller.signal),
      listModelGroups('embedding', controller.signal),
      listKnowledgeBaseIndexes(knowledgeBaseId, controller.signal),
    ])
      .then(([settings, modelGroups, indexes]) => {
        setForm({
          embeddingModelGroupId: settings.embeddingModelGroupId ?? null,
          embeddingConfiguredModelId: settings.embeddingConfiguredModelId ?? null,
          segmentationMode: segmentationModeFromApi[settings.segmentationMode],
          maxSegmentLength: settings.maxSegmentLength,
          overlapLength: settings.overlapLength,
          replaceWhitespace: settings.normalizeWhitespace,
          retrievalProfile: retrievalProfileFromApi[settings.retrievalProfile],
          retrievalTopK: settings.retrievalTopK,
        })
        setEmbeddingModelGroups(modelGroups.items)
        setStaleDocumentCount(settings.staleDocumentCount)
        setLatestIndex(indexes.items[0])
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [isResourceAvailable, knowledgeBaseId, setForm])

  useEffect(() => {
    if (!knowledgeBaseId || latestIndex?.status !== 'BUILDING') return

    const controller = new AbortController()
    const intervalId = globalThis.setInterval(() => {
      void listKnowledgeBaseIndexes(knowledgeBaseId, controller.signal)
        .then((indexes) => {
          const nextIndex = indexes.items[0]
          setLatestIndex(nextIndex)
          if (nextIndex?.status === 'READY') showToast('success', '知识库索引构建完成')
        })
        .catch(() => undefined)
    }, 2000)

    return () => {
      globalThis.clearInterval(intervalId)
      controller.abort()
    }
  }, [knowledgeBaseId, latestIndex?.status])

  const validation = validateFormByZod(knowledgeBaseSettingsSchema, form)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateFormByZod(knowledgeBaseSettingsSchema, form)
    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setSaving(true)
    try {
      const settings = await updateKnowledgeBaseSettings(knowledgeBaseId, {
        embeddingModelGroupId: result.data.embeddingModelGroupId,
        embeddingConfiguredModelId: result.data.embeddingConfiguredModelId,
        segmentationMode: segmentationModeToApi[result.data.segmentationMode],
        maxSegmentLength: result.data.maxSegmentLength,
        overlapLength: result.data.overlapLength,
        normalizeWhitespace: result.data.replaceWhitespace,
        retrievalProfile: retrievalProfileToApi[result.data.retrievalProfile],
        retrievalTopK: result.data.retrievalTopK,
      })
      const indexes = await listKnowledgeBaseIndexes(knowledgeBaseId)
      setErrors({})
      setStaleDocumentCount(settings.staleDocumentCount)
      setLatestIndex(indexes.items[0])
      showToast(
        'success',
        settings.staleDocumentCount > 0
          ? `设置已保存，${settings.staleDocumentCount} 个文档需手动更新分段`
          : '知识库设置已保存',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleRebuildIndex() {
    if (!knowledgeBaseId || rebuilding) return

    setRebuilding(true)
    try {
      const index = await rebuildKnowledgeBaseIndex(knowledgeBaseId)
      setLatestIndex(index)
      showToast('success', '已提交索引重新构建任务')
    } finally {
      setRebuilding(false)
    }
  }

  const availableEmbeddingModelGroups = embeddingModelGroups.flatMap((group) => {
    if (!group.enabled) return []
    const models = group.models.filter((model) => model.enabled)
    return models.length > 0 ? [{ ...group, models }] : []
  })
  const selectedEmbeddingModel = embeddingModelGroups
    .flatMap((group) => group.models.map((model) => ({ group, model })))
    .find(({ model }) => model.id === form.embeddingConfiguredModelId)
  const selectedEmbeddingModelAvailable = availableEmbeddingModelGroups.some((group) =>
    group.models.some((model) => model.id === form.embeddingConfiguredModelId),
  )
  const SelectedEmbeddingProviderIcon = selectedEmbeddingModel
    ? getModelProviderStrategy(selectedEmbeddingModel.group.providerType).icon
    : null

  return (
    <div className="min-h-full px-6 pt-4 pb-8">
      <PageTitle title="设置" subtitle="配置新文档的分段方式与知识库的查询策略" />

      <PageContent className="mt-5 w-full max-w-3xl pl-10">
        {!isResourceAvailable || loading ? (
          <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
            知识库设置加载中
          </div>
        ) : (
          <Form onSubmit={handleSubmit} className="space-y-0">
            {latestIndex?.status === 'FAILED' ? (
              <div className="border-destructive/30 bg-destructive/5 text-foreground mb-2 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
                <AlertTriangle aria-hidden className="text-destructive mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="leading-5 font-medium">索引构建失败</p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
                    {latestIndex.errorMessage ?? '请检查索引服务和嵌入模型配置后重新构建。'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving || rebuilding}
                  onClick={() => void handleRebuildIndex()}
                >
                  <RefreshCw aria-hidden className={cn(rebuilding && 'animate-spin')} />
                  {rebuilding ? '提交中…' : '重新构建'}
                </Button>
              </div>
            ) : null}

            {latestIndex?.status === 'BUILDING' ? (
              <div className="border-info/40 bg-info/8 text-foreground mb-2 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
                <LoaderCircle
                  aria-hidden
                  className="text-info mt-0.5 size-4 shrink-0 animate-spin"
                />
                <p className="leading-5">索引正在构建，完成后即可进行召回测试。</p>
              </div>
            ) : null}

            {staleDocumentCount > 0 ? (
              <div className="border-warning/40 bg-warning/8 text-foreground mb-2 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
                <AlertTriangle aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
                <p className="leading-5">
                  有 {staleDocumentCount} 个文档仍在使用旧分段。保存设置不会修改现有
                  Chunk；请在文档菜单中手动选择“重新索引”。
                </p>
              </div>
            ) : null}

            <SettingsRow
              title="索引模型"
              description={
                <>
                  嵌入模型定义整个知识库的向量空间。可前往{' '}
                  <Link
                    to="/models?tab=embedding"
                    className="text-primary focus-visible:bg-primary/10 cursor-pointer hover:underline focus-visible:outline-none"
                  >
                    模型管理
                  </Link>{' '}
                  添加或启用模型。
                </>
              }
            >
              <Form.Field
                label="嵌入模型"
                error={errors.embeddingConfiguredModelId}
                description="修改模型不会覆盖现有 Chunk；向量索引阶段完成后将通过新索引代际重建并切换。"
              >
                <Select
                  value={form.embeddingConfiguredModelId ?? NO_EMBEDDING_MODEL_VALUE}
                  onValueChange={(value) => {
                    if (value === NO_EMBEDDING_MODEL_VALUE) {
                      updateForm({
                        embeddingModelGroupId: null,
                        embeddingConfiguredModelId: null,
                      })
                      return
                    }

                    const group = availableEmbeddingModelGroups.find((item) =>
                      item.models.some((model) => model.id === value),
                    )
                    updateForm({
                      embeddingModelGroupId: group?.id ?? null,
                      embeddingConfiguredModelId: group ? value : null,
                    })
                  }}
                >
                  <SelectTrigger aria-label="嵌入模型" className="w-full">
                    {selectedEmbeddingModel && SelectedEmbeddingProviderIcon ? (
                      <SelectValue>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <SelectedEmbeddingProviderIcon aria-hidden className="size-4 shrink-0" />
                          <span className="min-w-0 truncate">
                            {selectedEmbeddingModel.model.displayName ??
                              selectedEmbeddingModel.model.modelId}
                          </span>
                        </span>
                      </SelectValue>
                    ) : (
                      <SelectValue placeholder="请选择嵌入模型" />
                    )}
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    sideOffset={4}
                    className="w-(--radix-select-trigger-width)"
                  >
                    <SelectItem value={NO_EMBEDDING_MODEL_VALUE}>暂不配置</SelectItem>
                    {selectedEmbeddingModel && !selectedEmbeddingModelAvailable ? (
                      <>
                        <SelectSeparator />
                        <SelectItem
                          value={selectedEmbeddingModel.model.id}
                          textValue={`${selectedEmbeddingModel.model.displayName ?? selectedEmbeddingModel.model.modelId} 已停用或不可用`}
                          disabled
                        >
                          {SelectedEmbeddingProviderIcon ? (
                            <SelectedEmbeddingProviderIcon
                              aria-hidden
                              className="size-4 shrink-0"
                            />
                          ) : null}
                          {selectedEmbeddingModel.model.displayName ??
                            selectedEmbeddingModel.model.modelId}{' '}
                          · 已停用或不可用
                        </SelectItem>
                      </>
                    ) : null}
                    {availableEmbeddingModelGroups.map((group) => {
                      const ProviderIcon = getModelProviderStrategy(group.providerType).icon

                      return (
                        <SelectGroup key={group.id}>
                          <SelectSeparator />
                          <SelectLabel className="flex items-center gap-1.5">
                            <ProviderIcon aria-hidden className="size-3.5 shrink-0" />
                            <span className="truncate">{group.name}</span>
                          </SelectLabel>
                          {group.models.map((model) => (
                            <SelectItem
                              key={model.id}
                              value={model.id}
                              textValue={`${model.displayName ?? model.modelId} ${model.modelId} ${group.name}`}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {model.displayName ?? model.modelId}
                              </span>
                              {model.displayName ? (
                                <span className="text-muted-foreground max-w-48 truncate text-xs">
                                  {model.modelId}
                                </span>
                              ) : null}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    })}
                  </SelectContent>
                </Select>
              </Form.Field>
            </SettingsRow>

            <div className="border-border/70 border-t">
              <SettingsRow
                title="分段模式"
                description="作为新文档的默认值，修改后不会自动重切已有文档。"
              >
                <Form.Field
                  required
                  label="默认分段模式"
                  error={errors.segmentationMode}
                  className="[&_[data-slot=form-control]]:mt-0 [&_[data-slot=form-label]]:sr-only"
                >
                  <div className="space-y-2" role="radiogroup" aria-label="默认分段模式">
                    {documentSegmentationModeOptions.map((option) => (
                      <SelectionCard
                        key={option.value}
                        name="segmentationMode"
                        value={option.value}
                        checked={form.segmentationMode === option.value}
                        icon={segmentationModeIcons[option.value]}
                        label={option.label}
                        description={option.description}
                        onChange={() => updateFormField('segmentationMode', option.value)}
                      />
                    ))}
                  </div>
                </Form.Field>
              </SettingsRow>
            </div>

            <div className="border-border/70 border-t">
              <SettingsRow
                title="分段参数"
                description="控制每个分段的最大字符数，以及相邻分段之间保留的重叠内容。"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Form.Field required label="最大长度" error={errors.maxSegmentLength}>
                    <Input
                      type="number"
                      min={100}
                      max={4000}
                      value={form.maxSegmentLength}
                      aria-label="最大分段长度"
                      onChange={(event) =>
                        updateFormField('maxSegmentLength', event.currentTarget.valueAsNumber)
                      }
                    />
                  </Form.Field>
                  <Form.Field required label="重叠长度" error={errors.overlapLength}>
                    <Input
                      type="number"
                      min={0}
                      max={Number(form.maxSegmentLength) - 1}
                      value={form.overlapLength}
                      aria-label="分段重叠长度"
                      onChange={(event) =>
                        updateFormField('overlapLength', event.currentTarget.valueAsNumber)
                      }
                    />
                  </Form.Field>
                </div>
              </SettingsRow>
            </div>

            <div className="border-border/70 border-t">
              <SettingsRow
                title="文本清理"
                description="在新文档入库前统一处理多余空白，同时保留原有文本结构。"
              >
                <Form.Field
                  required
                  label="文本清理规则"
                  className="[&_[data-slot=form-control]]:mt-0 [&_[data-slot=form-label]]:sr-only"
                >
                  <label className="text-foreground flex cursor-pointer items-start gap-2.5 text-sm md:col-span-2">
                    <Checkbox
                      checked={form.replaceWhitespace}
                      aria-label="规范化多余空白"
                      onCheckedChange={(checked) =>
                        updateFormField('replaceWhitespace', checked === true)
                      }
                    />
                    <span>
                      规范化多余空白
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                        保留段落、列表、表格、代码、URL、邮箱、编号与标点结构。
                      </span>
                    </span>
                  </label>
                </Form.Field>
              </SettingsRow>
            </div>

            <div className="border-border/70 border-t">
              <SettingsRow title="检索画像" description="查询时配置立即生效，不需要重建已有分段。">
                <Form.Field
                  required
                  label="检索画像"
                  error={errors.retrievalProfile}
                  className="[&_[data-slot=form-control]]:mt-0 [&_[data-slot=form-label]]:sr-only"
                >
                  <div className="space-y-2" role="radiogroup" aria-label="检索画像">
                    {retrievalProfileOptions.map((option) => (
                      <SelectionCard
                        key={option.value}
                        name="retrievalProfile"
                        value={option.value}
                        checked={form.retrievalProfile === option.value}
                        icon={option.icon}
                        label={option.label}
                        description={option.description}
                        onChange={() => updateFormField('retrievalProfile', option.value)}
                      />
                    ))}
                  </div>
                </Form.Field>
              </SettingsRow>
            </div>

            <div className="border-border/70 border-t">
              <SettingsRow title="返回设置" description="设置每次查询默认返回的分段数量。">
                <Form.Field required label="默认返回数量" error={errors.retrievalTopK}>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.retrievalTopK}
                    aria-label="默认返回数量"
                    onChange={(event) =>
                      updateFormField('retrievalTopK', event.currentTarget.valueAsNumber)
                    }
                  />
                </Form.Field>
              </SettingsRow>
            </div>

            <div className="border-border/70 flex justify-end border-t pt-5">
              <Button
                type="submit"
                variant="confirm"
                size="sm"
                disabled={!validation.success || saving}
              >
                {saving ? '保存中…' : '保存设置'}
              </Button>
            </div>
          </Form>
        )}
      </PageContent>
    </div>
  )
}
