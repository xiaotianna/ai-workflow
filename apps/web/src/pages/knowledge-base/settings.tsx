import { getKnowledgeBaseSettings, updateKnowledgeBaseSettings } from '@/api/knowledge-bases'
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
import { AlertTriangle, Boxes, Search, SplitSquareVertical } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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

export default function KnowledgeBaseSettingsPage() {
  const { id: knowledgeBaseId = '' } = useParams<{ id: string }>()
  const { isResourceAvailable } = useOutletContext<KnowledgeBaseDetailOutletContext>()
  const { form, setForm, updateForm, updateFormField } =
    useFormData<KnowledgeBaseSettingsFormInput>(KNOWLEDGE_BASE_SETTINGS_INITIAL_VALUES)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staleDocumentCount, setStaleDocumentCount] = useState(0)
  const [embeddingModelGroups, setEmbeddingModelGroups] = useState<ModelGroupDto[]>([])

  useEffect(() => {
    if (!isResourceAvailable || !knowledgeBaseId) return
    const controller = new AbortController()
    setLoading(true)
    void Promise.all([
      getKnowledgeBaseSettings(knowledgeBaseId, controller.signal),
      listModelGroups('embedding', controller.signal),
    ])
      .then(([settings, modelGroups]) => {
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
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [isResourceAvailable, knowledgeBaseId, setForm])

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
      setErrors({})
      setStaleDocumentCount(settings.staleDocumentCount)
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

  return (
    <div className="min-h-full px-6 pt-4 pb-8">
      <PageTitle title="设置" subtitle="配置新文档的分段方式与知识库的查询策略" />

      <PageContent className="mt-5 max-w-4xl">
        {!isResourceAvailable || loading ? (
          <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
            知识库设置加载中
          </div>
        ) : (
          <Form onSubmit={handleSubmit} className="space-y-5">
            {staleDocumentCount > 0 ? (
              <div className="border-warning/40 bg-warning/8 text-foreground flex items-start gap-3 rounded-xl border px-4 py-3 text-sm">
                <AlertTriangle aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
                <p className="leading-5">
                  有 {staleDocumentCount} 个文档仍在使用旧分段。保存设置不会修改现有
                  Chunk；请在文档菜单中手动选择“重新索引”。
                </p>
              </div>
            ) : null}

            <section className="border-border overflow-hidden rounded-xl border shadow-xs">
              <header className="bg-muted/35 flex items-start gap-3 px-5 py-4">
                <span className="bg-background text-primary flex size-9 shrink-0 items-center justify-center rounded-lg shadow-xs">
                  <Boxes aria-hidden className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">索引模型</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                    嵌入模型定义整个知识库的向量空间，按知识库统一配置。
                  </p>
                </div>
              </header>
              <div className="px-5 py-5">
                <Form.Field
                  label="嵌入模型"
                  error={errors.embeddingConfiguredModelId}
                  description={
                    <>
                      修改模型不会覆盖现有 Chunk；向量索引阶段完成后将通过新索引代际重建并切换。
                      可前往{' '}
                      <Link
                        to="/models?tab=embedding"
                        className="text-primary focus-visible:bg-primary/10 cursor-pointer hover:underline focus-visible:outline-none"
                      >
                        模型管理
                      </Link>
                      添加或启用嵌入模型。
                    </>
                  }
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
                    <SelectTrigger aria-label="嵌入模型" className="w-full md:max-w-xl">
                      <SelectValue placeholder="请选择嵌入模型" />
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
                          <SelectItem value={selectedEmbeddingModel.model.id} disabled>
                            {selectedEmbeddingModel.model.displayName ??
                              selectedEmbeddingModel.model.modelId}{' '}
                            · 已停用或不可用
                          </SelectItem>
                        </>
                      ) : null}
                      {availableEmbeddingModelGroups.map((group) => (
                        <SelectGroup key={group.id}>
                          <SelectSeparator />
                          <SelectLabel>{group.name}</SelectLabel>
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
                      ))}
                    </SelectContent>
                  </Select>
                </Form.Field>
              </div>
            </section>

            <section className="border-border overflow-hidden rounded-xl border shadow-xs">
              <header className="bg-muted/35 flex items-start gap-3 px-5 py-4">
                <span className="bg-background text-primary flex size-9 shrink-0 items-center justify-center rounded-lg shadow-xs">
                  <SplitSquareVertical aria-hidden className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">文本分段</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                    作为新文档的默认值。修改后不会自动重切已有文档。
                  </p>
                </div>
              </header>
              <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
                <Form.Field required label="默认分段模式" error={errors.segmentationMode}>
                  <Select
                    value={form.segmentationMode}
                    onValueChange={(value) =>
                      updateFormField('segmentationMode', value as DocumentSegmentationMode)
                    }
                  >
                    <SelectTrigger aria-label="默认分段模式" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentSegmentationModeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Form.Field>

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
              </div>
            </section>

            <section className="border-border overflow-hidden rounded-xl border shadow-xs">
              <header className="bg-muted/35 flex items-start gap-3 px-5 py-4">
                <span className="bg-background text-primary flex size-9 shrink-0 items-center justify-center rounded-lg shadow-xs">
                  <Search aria-hidden className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">检索</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-5">
                    查询时配置立即生效，不需要重建已有分段。
                  </p>
                </div>
              </header>
              <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
                <Form.Field required label="检索画像" error={errors.retrievalProfile}>
                  <Select
                    value={form.retrievalProfile}
                    onValueChange={(value) =>
                      updateFormField(
                        'retrievalProfile',
                        value as KnowledgeBaseSettingsFormInput['retrievalProfile'],
                      )
                    }
                  >
                    <SelectTrigger aria-label="检索画像" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hybrid-accurate">混合检索 · 高准确</SelectItem>
                      <SelectItem value="hybrid-fast">混合检索 · 低延迟</SelectItem>
                    </SelectContent>
                  </Select>
                </Form.Field>

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
              </div>
            </section>

            <div className="flex justify-end">
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
